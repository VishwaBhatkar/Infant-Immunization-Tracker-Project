import { pool } from '../config/db.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { writeAuditLog } from '../services/admin/audit.service.js';
import { deliverPendingPushes } from '../services/expoPush.service.js';

const auditContext = req => ({ adminUserId:req.user.id, ipAddress:req.ip || req.socket?.remoteAddress || null, userAgent:req.get('user-agent') || null });

export async function listNotifications(req,res,next){
  try{
    const page=Number(req.query.page||1), limit=Number(req.query.limit||10), offset=(page-1)*limit;
    const search=String(req.query.search||'').trim(), status=req.query.status, type=req.query.type;
    const where=[], params=[];
    if(search){const t=`%${search}%`;where.push('(nl.title LIKE ? OR nl.message LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');params.push(t,t,t,t);}
    if(status){where.push('nl.status=?');params.push(status);}
    if(type){where.push('nl.reminder_type=?');params.push(type);}
    const clause=where.length?`WHERE ${where.join(' AND ')}`:'';
    const [[count],[rows]]=await Promise.all([
      pool.query(`SELECT COUNT(*) total FROM notification_log nl JOIN users u ON u.id=nl.user_id ${clause}`,params),
      pool.query(`SELECT nl.id,nl.user_id,nl.notification_id,nl.reminder_type,nl.related_record_id,nl.title,nl.message,nl.scheduled_at,nl.sent_at,nl.status,nl.attempt_count,nl.failure_reason,nl.created_at,u.name recipient_name,u.email recipient_email,u.role recipient_role FROM notification_log nl JOIN users u ON u.id=nl.user_id ${clause} ORDER BY nl.created_at DESC LIMIT ? OFFSET ?`,[...params,limit,offset])
    ]);
    const totalItems=Number(count[0].total);
    res.json({success:true,message:'Notifications retrieved successfully',data:rows,pagination:{page,limit,totalItems,totalPages:Math.ceil(totalItems/limit)}});
  }catch(e){next(e)}
}

export async function getNotification(req,res,next){
  try{
    const [rows]=await pool.query(`SELECT nl.*,u.name recipient_name,u.email recipient_email,u.phone recipient_phone,u.role recipient_role,n.title in_app_title,n.message in_app_message,n.type in_app_type,n.is_read FROM notification_log nl JOIN users u ON u.id=nl.user_id LEFT JOIN notifications n ON n.id=nl.notification_id WHERE nl.id=? LIMIT 1`,[req.params.id]);
    if(!rows.length) throw new AppError('Notification not found',404);
    ok(res,rows[0]);
  }catch(e){next(e)}
}

export async function statistics(req,res,next){
  try{
    const [[totals],[daily],[types]]=await Promise.all([
      pool.query(`SELECT COUNT(*) total,SUM(status='PENDING') pending,SUM(status='PROCESSING') processing,SUM(status='SENT') sent,SUM(status='DELIVERED') delivered,SUM(status='FAILED') failed,SUM(status='CANCELLED') cancelled,SUM(status='SKIPPED') skipped,SUM(DATE(created_at)=CURDATE()) today FROM notification_log`),
      pool.query(`SELECT DATE(created_at) day,COUNT(*) total,SUM(status IN ('SENT','DELIVERED')) successful,SUM(status='FAILED') failed FROM notification_log WHERE created_at>=DATE_SUB(CURDATE(),INTERVAL 29 DAY) GROUP BY DATE(created_at) ORDER BY day`),
      pool.query(`SELECT reminder_type,COUNT(*) total FROM notification_log GROUP BY reminder_type ORDER BY total DESC`)
    ]);
    ok(res,{totals:totals[0],daily,types});
  }catch(e){next(e)}
}

export async function sendNotification(req,res,next){
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const {user_id,title,message,type='GENERAL',scheduled_at=null}=req.body;
    const [users]=await conn.query('SELECT id,name,is_active,deleted_at FROM users WHERE id=? LIMIT 1',[user_id]);
    if(!users.length || !users[0].is_active || users[0].deleted_at) throw new AppError('Active recipient not found',404);
    const [n]=await conn.query(`INSERT INTO notifications(user_id,title,message,type) VALUES(?,?,?,'SYSTEM')`,[user_id,title,message]);
    const key=`ADMIN:${req.user.id}:${Date.now()}:${user_id}`;
    const [log]=await conn.query(`INSERT INTO notification_log(user_id,notification_id,reminder_type,related_record_id,reminder_key,title,message,scheduled_at,status,attempt_count) VALUES(?,?,?,NULL,?,?,?,?, 'PENDING',0)`,[user_id,n.insertId,type,key,title,message,scheduled_at||new Date()]);
    await writeAuditLog({...auditContext(req),action:'SEND_NOTIFICATION',entityType:'NOTIFICATION',entityId:log.insertId,newValues:{user_id,title,type,scheduled_at},connection:conn});
    await conn.commit();
    ok(res,{id:log.insertId},'Notification queued successfully',201);
  }catch(e){await conn.rollback();next(e)}finally{conn.release()}
}

export async function retryNotification(req,res,next){
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [rows]=await conn.query('SELECT * FROM notification_log WHERE id=? FOR UPDATE',[req.params.id]);
    if(!rows.length) throw new AppError('Notification not found',404);
    if(!['FAILED','SKIPPED'].includes(rows[0].status)) throw new AppError('Only failed or skipped notifications can be retried',409);
    await conn.query("UPDATE notification_log SET status='PENDING',scheduled_at=NOW(),failure_reason=NULL WHERE id=?",[req.params.id]);
    await writeAuditLog({...auditContext(req),action:'RETRY_NOTIFICATION',entityType:'NOTIFICATION',entityId:req.params.id,oldValues:rows[0],newValues:{...rows[0],status:'PENDING'},connection:conn});
    await conn.commit();
    const delivery=await deliverPendingPushes();
    ok(res,delivery,'Notification queued for retry');
  }catch(e){await conn.rollback();next(e)}finally{conn.release()}
}

export async function cancelNotification(req,res,next){
  const conn=await pool.getConnection();
  try{
    await conn.beginTransaction();
    const [rows]=await conn.query('SELECT * FROM notification_log WHERE id=? FOR UPDATE',[req.params.id]);
    if(!rows.length) throw new AppError('Notification not found',404);
    if(rows[0].status!=='PENDING') throw new AppError('Only pending notifications can be cancelled',409);
    await conn.query("UPDATE notification_log SET status='CANCELLED',failure_reason=? WHERE id=?",[req.body.reason||'Cancelled by System Admin',req.params.id]);
    await writeAuditLog({...auditContext(req),action:'CANCEL_NOTIFICATION',entityType:'NOTIFICATION',entityId:req.params.id,oldValues:rows[0],newValues:{...rows[0],status:'CANCELLED'},reason:req.body.reason||null,connection:conn});
    await conn.commit();
    ok(res,null,'Notification cancelled successfully');
  }catch(e){await conn.rollback();next(e)}finally{conn.release()}
}
