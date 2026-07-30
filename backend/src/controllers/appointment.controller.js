import { pool } from '../config/db.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { ROLES } from '../constants/roles.js';

const activeStatuses = ['PENDING', 'CONFIRMED', 'RESCHEDULED'];
const today = () => new Date().toISOString().slice(0, 10);
const isPastSlot = (date, time) => new Date(`${date}T${time}:00`) <= new Date();
const notify = (conn, userId, title, message) => conn.query("INSERT INTO notifications(user_id,title,message,type) VALUES(?,?,?,'APPOINTMENT')", [userId, title, message]);

async function scopeClause(user) {
  if (user.role === ROLES.PARENT) return { sql: 'a.parent_id=?', params: [user.id] };
  if (user.role === ROLES.DOCTOR) return { sql: 'a.doctor_id=?', params: [user.id] };
  if (user.role === ROLES.HOSPITAL_ADMIN) return { sql: 'a.hospital_id=(SELECT hospital_id FROM hospital_admins WHERE user_id=? LIMIT 1)', params: [user.id] };
  return { sql: '1=1', params: [] };
}

export const listDoctors = async (req, res, next) => { try {
  const hospitalId = Number(req.query.hospital_id);
  if (!hospitalId) throw new AppError('Hospital is required', 422, [{ field: 'hospital_id', message: 'Hospital is required' }]);
  const [rows] = await pool.query(`SELECT u.id,u.name,u.avatar_url FROM users u JOIN doctor_hospitals dh ON dh.doctor_id=u.id WHERE dh.hospital_id=? AND dh.is_active=1 AND u.role='DOCTOR' AND u.is_active=1 ORDER BY u.name`, [hospitalId]);
  ok(res, rows, 'Doctors loaded');
} catch (e) { next(e); } };

export const listMyHospitals = async (req, res, next) => { try {
  let sql = 'SELECT id,name,address,phone FROM hospitals WHERE is_active=1';
  const params = [];
  if (req.user.role === ROLES.DOCTOR) {
    sql += ' AND EXISTS (SELECT 1 FROM doctor_hospitals dh WHERE dh.hospital_id=hospitals.id AND dh.doctor_id=? AND dh.is_active=1)';
    params.push(req.user.id);
  } else if (req.user.role === ROLES.HOSPITAL_ADMIN) {
    sql += ' AND EXISTS (SELECT 1 FROM hospital_admins ha WHERE ha.hospital_id=hospitals.id AND ha.user_id=?)';
    params.push(req.user.id);
  }
  sql += ' ORDER BY name';
  const [rows] = await pool.query(sql, params);
  ok(res, rows, 'Available hospitals loaded');
} catch (e) { next(e); } };

export const availability = async (req, res, next) => { try {
  const doctorId = Number(req.params.doctorId); const hospitalId = Number(req.query.hospital_id); const date = req.query.date;
  if (date < today()) throw new AppError('Appointment date cannot be in the past', 422);
  const [assignment] = await pool.query(`SELECT 1 FROM doctor_hospitals dh JOIN users u ON u.id=dh.doctor_id WHERE dh.doctor_id=? AND dh.hospital_id=? AND dh.is_active=1 AND u.is_active=1`, [doctorId, hospitalId]);
  if (!assignment.length) throw new AppError('Doctor is not available at this hospital', 404);
  const weekday = new Date(`${date}T00:00:00`).getDay();
  let [rules] = await pool.query('SELECT start_time,end_time,slot_minutes,is_available FROM doctor_availability WHERE doctor_id=? AND hospital_id=? AND weekday=?', [doctorId, hospitalId, weekday]);
  // Older databases may contain doctor-hospital assignments without availability rows.
  // Create a sensible default schedule so parents can immediately see bookable slots.
  if (!rules.length) {
    await pool.query(
      `INSERT INTO doctor_availability
        (doctor_id,hospital_id,weekday,start_time,end_time,slot_minutes,is_available)
       VALUES(?,?,?,'09:00:00','17:00:00',30,1)
       ON DUPLICATE KEY UPDATE is_available=is_available`,
      [doctorId, hospitalId, weekday]
    );
    [rules] = await pool.query('SELECT start_time,end_time,slot_minutes,is_available FROM doctor_availability WHERE doctor_id=? AND hospital_id=? AND weekday=?', [doctorId, hospitalId, weekday]);
  }
  if (!rules.length || !rules[0].is_available) return ok(res, [], 'No availability for this date');
  const [booked] = await pool.query(`SELECT TIME_FORMAT(appointment_time,'%H:%i') time FROM appointments WHERE doctor_id=? AND hospital_id=? AND appointment_date=? AND status IN ('PENDING','CONFIRMED','RESCHEDULED')`, [doctorId, hospitalId, date]);
  const taken = new Set(booked.map(x => x.time)); const r = rules[0];
  const start = Number(String(r.start_time).slice(0,2))*60 + Number(String(r.start_time).slice(3,5));
  const end = Number(String(r.end_time).slice(0,2))*60 + Number(String(r.end_time).slice(3,5)); const slots=[];
  for(let m=start;m+Number(r.slot_minutes)<=end;m+=Number(r.slot_minutes)){const slot=`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;if(!taken.has(slot)&&!isPastSlot(date,slot))slots.push(slot);}
  ok(res, slots, 'Available slots loaded');
} catch(e){next(e);} };

export const listAppointments = async (req,res,next)=>{try{
  const scope=await scopeClause(req.user); const where=[scope.sql]; const params=[...scope.params];
  if(req.query.status){where.push('a.status=?');params.push(req.query.status);}
  if(req.query.scope==='TODAY')where.push('a.appointment_date=CURDATE()');
  if(req.query.scope==='UPCOMING')where.push("TIMESTAMP(a.appointment_date,a.appointment_time)>=NOW()");
  if(req.query.scope==='PAST')where.push("TIMESTAMP(a.appointment_date,a.appointment_time)<NOW()");
  const [rows]=await pool.query(`SELECT a.*,c.name child_name,h.name hospital_name,d.name doctor_name,p.name parent_name FROM appointments a JOIN children c ON c.id=a.child_id JOIN hospitals h ON h.id=a.hospital_id JOIN users d ON d.id=a.doctor_id JOIN users p ON p.id=a.parent_id WHERE ${where.join(' AND ')} ORDER BY a.appointment_date DESC,a.appointment_time DESC`,params);ok(res,rows,'Appointments loaded');
}catch(e){next(e)}};

export const bookAppointment=async(req,res,next)=>{const conn=await pool.getConnection();try{await conn.beginTransaction();const {child_id,doctor_id,hospital_id,appointment_date,appointment_time,purpose,notes}=req.body;
  if(isPastSlot(appointment_date,appointment_time))throw new AppError('Appointment date and time must be in the future',422);
  const [child]=await conn.query('SELECT id,name FROM children WHERE id=? AND parent_id=?',[child_id,req.user.id]);if(!child.length)throw new AppError('Child not found',404);
  const [doctor]=await conn.query(`SELECT u.name FROM users u JOIN doctor_hospitals dh ON dh.doctor_id=u.id WHERE u.id=? AND u.role='DOCTOR' AND u.is_active=1 AND dh.hospital_id=? AND dh.is_active=1`,[doctor_id,hospital_id]);if(!doctor.length)throw new AppError('Doctor is not available at this hospital',422);
  const [conflict]=await conn.query(`SELECT id FROM appointments WHERE doctor_id=? AND appointment_date=? AND appointment_time=? AND status IN ('PENDING','CONFIRMED','RESCHEDULED') FOR UPDATE`,[doctor_id,appointment_date,appointment_time]);if(conflict.length)throw new AppError('This doctor and time slot are already booked',409);
  const [duplicate]=await conn.query(`SELECT id FROM appointments WHERE child_id=? AND appointment_date=? AND appointment_time=? AND status IN ('PENDING','CONFIRMED','RESCHEDULED') FOR UPDATE`,[child_id,appointment_date,appointment_time]);if(duplicate.length)throw new AppError('This child already has an appointment at the selected time',409);
  const [r]=await conn.query(`INSERT INTO appointments(parent_id,child_id,doctor_id,hospital_id,appointment_date,appointment_time,purpose,notes,status) VALUES(?,?,?,?,?,?,?,?,'PENDING')`,[req.user.id,child_id,doctor_id,hospital_id,appointment_date,appointment_time,purpose,notes||null]);
  await notify(conn,req.user.id,'Appointment booked',`${child[0].name}'s appointment is pending for ${appointment_date} at ${appointment_time}.`);await notify(conn,doctor_id,'New appointment request',`New appointment request for ${appointment_date} at ${appointment_time}.`);await conn.commit();ok(res,{id:r.insertId},'Appointment booked',201);
}catch(e){await conn.rollback();next(e)}finally{conn.release()}};

async function loadScoped(conn,id,user){const scope=await scopeClause(user);const [rows]=await conn.query(`SELECT a.*,c.name child_name,d.name doctor_name FROM appointments a JOIN children c ON c.id=a.child_id JOIN users d ON d.id=a.doctor_id WHERE a.id=? AND ${scope.sql} FOR UPDATE`,[id,...scope.params]);if(!rows.length)throw new AppError('Appointment not found',404);return rows[0];}

export const updateStatus=async(req,res,next)=>{const conn=await pool.getConnection();try{await conn.beginTransaction();const a=await loadScoped(conn,req.params.id,req.user);const status=req.body.status;
  if(req.user.role===ROLES.PARENT&&status!=='CANCELLED')throw new AppError('Parents can only cancel appointments',403);
  if(req.user.role===ROLES.DOCTOR&&!['CONFIRMED','COMPLETED','REJECTED'].includes(status))throw new AppError('Doctor cannot apply this status',403);
  if(['COMPLETED','CANCELLED','REJECTED'].includes(a.status))throw new AppError('This appointment can no longer be updated',409);
  await conn.query('UPDATE appointments SET status=?,notes=COALESCE(?,notes),updated_at=CURRENT_TIMESTAMP WHERE id=?',[status,req.body.notes||null,a.id]);
  await notify(conn,a.parent_id,`Appointment ${status.toLowerCase()}`,`Your appointment with Dr. ${a.doctor_name} on ${a.appointment_date} at ${String(a.appointment_time).slice(0,5)} is ${status.toLowerCase()}.`);await conn.commit();ok(res,null,'Appointment updated');
}catch(e){await conn.rollback();next(e)}finally{conn.release()}};

export const reschedule=async(req,res,next)=>{const conn=await pool.getConnection();try{await conn.beginTransaction();const a=await loadScoped(conn,req.params.id,req.user);const {appointment_date,appointment_time,notes}=req.body;if(isPastSlot(appointment_date,appointment_time))throw new AppError('Appointment date and time must be in the future',422);if(['COMPLETED','CANCELLED','REJECTED'].includes(a.status))throw new AppError('This appointment cannot be rescheduled',409);
  const [conflict]=await conn.query(`SELECT id FROM appointments WHERE id<>? AND doctor_id=? AND appointment_date=? AND appointment_time=? AND status IN ('PENDING','CONFIRMED','RESCHEDULED') FOR UPDATE`,[a.id,a.doctor_id,appointment_date,appointment_time]);if(conflict.length)throw new AppError('This doctor and time slot are already booked',409);
  await conn.query(`UPDATE appointments SET appointment_date=?,appointment_time=?,status='RESCHEDULED',notes=COALESCE(?,notes),updated_at=CURRENT_TIMESTAMP WHERE id=?`,[appointment_date,appointment_time,notes||null,a.id]);
  await notify(conn,a.parent_id,'Appointment rescheduled',`Your appointment has been moved to ${appointment_date} at ${appointment_time}.`);if(a.doctor_id!==req.user.id)await notify(conn,a.doctor_id,'Appointment rescheduled',`An appointment has been moved to ${appointment_date} at ${appointment_time}.`);await conn.commit();ok(res,null,'Appointment rescheduled');
}catch(e){await conn.rollback();next(e)}finally{conn.release()}};
