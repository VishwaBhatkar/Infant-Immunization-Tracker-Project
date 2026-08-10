/**
 * File: backend/src/controllers/adminController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import { ok } from '../utils/responseUtils.js';
import { AppError } from '../utils/AppError.js';
import { ROLES } from '../constants/roles.js';
import { writeAuditLog } from '../services/admin/auditService.js';
import bcrypt from 'bcryptjs';

const requestAuditContext = (req) => ({
  adminUserId: req.user.id,
  ipAddress: req.ip || req.socket?.remoteAddress || null,
  userAgent: req.get('user-agent') || null
});

const getUserById = async (id, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT id, name, email, phone, role, avatar_url, is_active, deleted_at,
            deleted_by, last_login_at, created_at, updated_at
     FROM users WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
};

const ensureFinalSystemAdminRemains = async (target, connection) => {
  if (target.role !== ROLES.SYSTEM_ADMIN || !target.is_active || target.deleted_at) return;
  const [rows] = await connection.query(
    `SELECT COUNT(*) AS count FROM users
     WHERE role = ? AND is_active = 1 AND deleted_at IS NULL`,
    [ROLES.SYSTEM_ADMIN]
  );
  if (Number(rows[0].count) <= 1) {
    throw new AppError('The final active System Admin cannot be deactivated or deleted', 409);
  }
};

export const adminDashboard = async (req, res, next) => {
  try {
    if (req.user.role === ROLES.HOSPITAL_ADMIN) {
      const [hospitalRows] = await pool.query(
        'SELECT hospital_id FROM hospital_admins WHERE user_id = ? LIMIT 1',
        [req.user.id]
      );
      if (!hospitalRows.length) throw new AppError('No hospital is assigned to this administrator', 403);

      const hospitalId = hospitalRows[0].hospital_id;
      const [[doctors], [appointments]] = await Promise.all([
        pool.query(
          `SELECT COUNT(DISTINCT u.id) AS count
           FROM users u JOIN doctor_hospitals dh ON dh.doctor_id = u.id
           WHERE dh.hospital_id = ? AND u.role = 'DOCTOR' AND u.is_active = 1 AND u.deleted_at IS NULL`,
          [hospitalId]
        ),
        pool.query('SELECT COUNT(*) AS count FROM appointments WHERE hospital_id = ?', [hospitalId])
      ]);

      return ok(
        res, {
           hospital_id: hospitalId,
            doctors: doctors[0].count, 
            appointments: appointments[0].count });
    }

    const [[users], [children], [hospitals], [appointments]] = await Promise.all([
      pool.query('SELECT COUNT(*) AS count FROM users WHERE is_active = 1 AND deleted_at IS NULL'),
      pool.query('SELECT COUNT(*) AS count FROM children'),
      pool.query('SELECT COUNT(*) AS count FROM hospitals WHERE is_active = 1'),
      pool.query('SELECT COUNT(*) AS count FROM appointments')
    ]);

    return ok(res, { 
      users: users[0].count, 
      children: children[0].count, 
      hospitals: hospitals[0].count, 
      appointments: appointments[0].count });
  } catch (error) { next(error); }
};

export const listUsers = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const role = req.query.role;
    const status = req.query.status || 'active';

    const where = [];
    const params = [];
    if (search) {
      where.push('(name LIKE ? OR email LIKE ? OR phone LIKE ?)');
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (role) { where.push('role = ?'); params.push(role); }
    if (status === 'active') where.push('is_active = 1 AND deleted_at IS NULL');
    if (status === 'inactive') where.push('is_active = 0 AND deleted_at IS NULL');
    if (status === 'deleted') where.push('deleted_at IS NOT NULL');
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[countRow], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM users ${clause}`, params),
      pool.query(
        `SELECT id, name, email, phone, role, is_active, deleted_at, last_login_at, created_at
         FROM users ${clause}
         ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      )
    ]);

    const totalItems = Number(countRow[0].total);
    return res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: rows,
      pagination: { 
        page, limit, 
        totalItems, 
        totalPages: Math.ceil(totalItems / limit) }
    });
  } catch (error) { next(error); }
};

export const getUser = async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) throw new AppError('User not found', 404);
    return ok(res, user);
  } catch (error) { next(error); }
};

export const updateUserStatus = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const target = await getUserById(req.params.id, connection);
    if (!target || target.deleted_at) throw new AppError('Active user record not found', 404);
    const nextStatus = Boolean(req.body.is_active);
    if (Number(target.id) === Number(req.user.id) && !nextStatus) throw new AppError('You cannot deactivate your own account', 409);
    if (!nextStatus) await ensureFinalSystemAdminRemains(target, connection);

    await connection.query('UPDATE users SET is_active = ? WHERE id = ?', [nextStatus, target.id]);
    const updated = { ...target, is_active: nextStatus };
    await writeAuditLog({ ...requestAuditContext(req), action: nextStatus ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', entityType: 'USER', entityId: target.id, oldValues: target, newValues: updated, reason: req.body?.reason || null, connection });
    await connection.commit();
    return ok(res, updated, nextStatus ? 'User activated successfully' : 'User deactivated successfully');
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

export const deleteUser = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const target = await getUserById(req.params.id, connection);
    if (!target) throw new AppError('User not found', 404);
    if (target.deleted_at) throw new AppError('User is already deleted', 409);
    if (Number(target.id) === Number(req.user.id)) throw new AppError('You cannot delete your own account', 409);
    await ensureFinalSystemAdminRemains(target, connection);

    // A doctor must remain available while any booked appointment is unfinished.
    // This protects parents from losing the doctor assigned to an active booking.
    if (target.role === ROLES.DOCTOR) {
      const [activeAppointments] = await connection.query(
        `SELECT COUNT(*) AS total
         FROM appointments
         WHERE doctor_id = ?
           AND status IN ('PENDING','CONFIRMED','RESCHEDULED')`,
        [target.id]
      );
      if (Number(activeAppointments[0]?.total || 0) > 0) {
        throw new AppError(
          `Doctor cannot be deleted until ${activeAppointments[0].total} active appointment(s) are completed or cancelled`,
          409
        );
      }
    }

    await connection.query(
      'UPDATE users SET is_active = 0, deleted_at = NOW(), deleted_by = ? WHERE id = ?',
       [req.user.id, target.id]);
    const updated = { 
      ...target, is_active: false, deleted_by: req.user.id };
    if (target.role === ROLES.DOCTOR) {
      const [parents] = await connection.query(
        `SELECT DISTINCT a.parent_id
         FROM appointments a
         JOIN users p ON p.id = a.parent_id AND p.deleted_at IS NULL
         WHERE a.doctor_id = ?`,
        [target.id]
      );
      for (const parent of parents) {
        const title = 'Doctor no longer available';
        const message = `Dr. ${target.name} has been removed from the system and is no longer available for future appointments.`;
        const [notification] = await connection.query(
          `INSERT INTO notifications(user_id,title,message,type,related_record_id)
           VALUES(?,?,?,'GENERAL',?)`,
          [parent.parent_id, title, message, target.id]
        );
        await connection.query(
          `INSERT INTO notification_log
           (user_id,notification_id,reminder_type,related_record_id,reminder_key,title,message,scheduled_at,status,attempt_count)
           VALUES(?,?, 'GENERAL', ?, ?, ?, ?, NOW(), 'PENDING', 0)`,
          [parent.parent_id, notification.insertId, target.id,
           `doctor-deleted:${target.id}:parent:${parent.parent_id}:${Date.now()}`,
           title, message]
        );
      }
    }

    await writeAuditLog({
       ...requestAuditContext(req), 
       action: 'USER_DELETED',
        entityType: 'USER', 
        entityId: target.id,
         oldValues: target, 
         newValues: updated, 
         reason: req.body?.reason || null, 
         connection });
    await connection.commit();
    return ok(res, null, 'User deleted successfully');
  } catch (error) {
     await connection.rollback(); 
     next(error);
     } 
     finally { connection.release(); }
};

export const restoreUser = async (req, res, next) => {
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const userId = Number(req.params.id);
    if (!Number.isInteger(userId) || userId <= 0) {
      throw new AppError('Invalid user id', 400);
    }

    const target = await getUserById(userId, connection);
    if (!target) throw new AppError('User not found', 404);
    if (!target.deleted_at) throw new AppError('User is not deleted', 409);

    // PATCH requests may be sent without a JSON body.
    const suppliedReason = String(req.body?.reason || '').trim();
    const auditReason = suppliedReason
      ? `RESTORE: ${suppliedReason}`
      : 'RESTORE';

    await connection.query(
      `UPDATE users
       SET is_active = 1,
           deleted_at = NULL,
           deleted_by = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [target.id]
    );

    // Restore the doctor's hospital memberships that were disabled during deletion.
    if (target.role === ROLES.DOCTOR) {
      await connection.query(
        'UPDATE doctor_hospitals SET is_active = 1 WHERE doctor_id = ?',
        [target.id]
      );
    }

    const updated = await getUserById(target.id, connection);

    await writeAuditLog({
      ...requestAuditContext(req),
      // These values are compatible with the existing audit_logs ENUM.
      action: req.restoreAuditAction || (
        target.role === ROLES.DOCTOR ? 'DOCTOR_UPDATED' : 'USER_UPDATED'
      ),
      entityType: req.restoreEntityType || (
        target.role === ROLES.DOCTOR ? 'DOCTOR' : 'USER'
      ),
      entityId: target.id,
      oldValues: target,
      newValues: updated,
      reason: auditReason,
      connection
    });

    await connection.commit();

    return ok(
      res,
      updated,
      target.role === ROLES.DOCTOR
        ? 'Doctor restored successfully'
        : 'User restored successfully'
    );
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
};


const getDoctorById = async (id, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT u.id, u.name, u.email, u.phone, u.avatar_url, u.is_active,
            u.deleted_at, u.last_login_at, u.created_at, u.updated_at,
            GROUP_CONCAT(DISTINCT h.id ORDER BY h.name) AS hospital_ids,
            GROUP_CONCAT(DISTINCT h.name ORDER BY h.name SEPARATOR ', ') AS hospitals
     FROM users u
     LEFT JOIN doctor_hospitals dh ON dh.doctor_id = u.id AND dh.is_active = 1
     LEFT JOIN hospitals h ON h.id = dh.hospital_id
     WHERE u.id = ? AND u.role = ?
     GROUP BY u.id
     LIMIT 1`,
    [id, ROLES.DOCTOR]
  );
  if (!rows[0]) return null;
  return {
    ...rows[0],
    hospital_ids: rows[0].hospital_ids ? String(rows[0].hospital_ids).split(',').map(Number) : []
  };
};

export const listDoctors = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const status = req.query.status || 'active';
    const hospitalId = req.query.hospital_id ? Number(req.query.hospital_id) : null;
    const where = ['u.role = ?'];
    const params = [ROLES.DOCTOR];
    if (search) {
      const term = `%${search}%`;
      where.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)');
      params.push(term, term, term);
    }
    if (status === 'active') where.push('u.is_active = 1 AND u.deleted_at IS NULL');
    if (status === 'inactive') where.push('u.is_active = 0 AND u.deleted_at IS NULL');
    if (status === 'deleted') where.push('u.deleted_at IS NOT NULL');
    if (hospitalId) { where.push('dh.hospital_id = ? AND dh.is_active = 1'); params.push(hospitalId); }
    const clause = `WHERE ${where.join(' AND ')}`;

    const [[countRows], [rows]] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT u.id) AS total
         FROM users u LEFT JOIN doctor_hospitals dh ON dh.doctor_id = u.id
         ${clause}`,
        params
      ),
      pool.query(
        `SELECT u.id, u.name, u.email, u.phone, u.is_active, u.deleted_at, u.created_at,
                GROUP_CONCAT(DISTINCT h.name ORDER BY h.name SEPARATOR ', ') AS hospitals
         FROM users u
         LEFT JOIN doctor_hospitals dh ON dh.doctor_id = u.id AND dh.is_active = 1
         LEFT JOIN hospitals h ON h.id = dh.hospital_id
         ${clause}
         GROUP BY u.id
         ORDER BY u.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      )
    ]);
    const totalItems = Number(countRows[0].total);
    return res.json({ success: true, message: 'Doctors retrieved successfully', data: rows,
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } });
  } catch (error) { next(error); }
};

export const listActiveHospitals = async (req, res, next) => {
  try {
    const [rows] = await pool.query('SELECT id, name, address FROM hospitals WHERE is_active = 1 AND deleted_at IS NULL ORDER BY name');
    return ok(res, rows);
  } catch (error) { next(error); }
};

export const getDoctor = async (req, res, next) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    if (!doctor) throw new AppError('Doctor not found', 404);
    return ok(res, doctor);
  } catch (error) { next(error); }
};


const ensureDefaultDoctorAvailability = async (connection, doctorId, hospitalIds) => {
  if (!hospitalIds.length) return;
  const weekdays = [0, 1, 2, 3, 4, 5, 6];
  for (const hospitalId of hospitalIds) {
    for (const weekday of weekdays) {
      await connection.query(
        `INSERT INTO doctor_availability
          (doctor_id,hospital_id,weekday,start_time,end_time,slot_minutes,is_available)
         VALUES(?,?,?,'09:00:00','17:00:00',30,1)
         ON DUPLICATE KEY UPDATE is_available=VALUES(is_available)`,
        [doctorId, hospitalId, weekday]
      );
    }
  }
};

export const createDoctor = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { name, email, phone, password, hospital_ids = [] } = req.body;
    const [duplicates] = await connection.query('SELECT email, phone FROM users WHERE email = ? OR phone = ? LIMIT 1', [email, phone]);
    if (duplicates.length) throw new AppError(duplicates[0].email === email ? 'Email already registered' : 'Mobile number already registered', 409);
    if (hospital_ids.length) {
      const [valid] = await connection.query(`SELECT id FROM hospitals WHERE is_active = 1 AND id IN (${hospital_ids.map(() => '?').join(',')})`, hospital_ids);
      if (valid.length !== hospital_ids.length) throw new AppError('One or more selected hospitals are invalid or inactive', 400);
    }
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await connection.query(
      'INSERT INTO users (name, email, phone, password_hash, role, is_active) VALUES (?, ?, ?, ?, ?, 1)',
      [name, email, phone, passwordHash, ROLES.DOCTOR]
    );
    for (const hospitalId of hospital_ids) {
      await connection.query('INSERT INTO doctor_hospitals (doctor_id, hospital_id, is_active) VALUES (?, ?, 1)', [result.insertId, hospitalId]);
    }
    await ensureDefaultDoctorAvailability(connection, result.insertId, hospital_ids);
    const doctor = await getDoctorById(result.insertId, connection);
    await writeAuditLog({ ...requestAuditContext(req), action: 'DOCTOR_CREATED', entityType: 'DOCTOR', entityId: result.insertId, newValues: doctor, connection });
    await connection.commit();
    return ok(res, doctor, 'Doctor created successfully', 201);
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

export const updateDoctor = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const existing = await getDoctorById(req.params.id, connection);
    if (!existing || existing.deleted_at) throw new AppError('Doctor not found', 404);
    const { name, email, phone, hospital_ids = [] } = req.body;
    const [duplicates] = await connection.query('SELECT id FROM users WHERE (email = ? OR phone = ?) AND id <> ? LIMIT 1', [email, phone, existing.id]);
    if (duplicates.length) throw new AppError('Email or mobile number is already in use', 409);
    if (hospital_ids.length) {
      const [valid] = await connection.query(`SELECT id FROM hospitals WHERE is_active = 1 AND id IN (${hospital_ids.map(() => '?').join(',')})`, hospital_ids);
      if (valid.length !== hospital_ids.length) throw new AppError('One or more selected hospitals are invalid or inactive', 400);
    }
    await connection.query('UPDATE users SET name = ?, email = ?, phone = ? WHERE id = ?', [name, email, phone, existing.id]);
    await connection.query('UPDATE doctor_hospitals SET is_active = 0 WHERE doctor_id = ?', [existing.id]);
    for (const hospitalId of hospital_ids) {
      await connection.query(
        `INSERT INTO doctor_hospitals (doctor_id, hospital_id, is_active) VALUES (?, ?, 1)
         ON DUPLICATE KEY UPDATE is_active = 1`,
        [existing.id, hospitalId]
      );
    }
    await ensureDefaultDoctorAvailability(connection, existing.id, hospital_ids);
    const updated = await getDoctorById(existing.id, connection);
    await writeAuditLog({ ...requestAuditContext(req), action: 'DOCTOR_UPDATED', entityType: 'DOCTOR', entityId: existing.id, oldValues: existing, newValues: updated, reason: req.body?.reason || null, connection });
    await connection.commit();
    return ok(res, updated, 'Doctor updated successfully');
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};


export const updateDoctorStatus = async (req, res, next) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    if (!doctor) throw new AppError('Doctor not found', 404);
    return updateUserStatus(req, res, next);
  } catch (error) { next(error); }
};

export const deleteDoctor = async (req, res, next) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    if (!doctor) throw new AppError('Doctor not found', 404);
    return deleteUser(req, res, next);
  } catch (error) { next(error); }
};

export const restoreDoctor = async (req, res, next) => {
  try {
    const doctor = await getDoctorById(req.params.id);
    if (!doctor) throw new AppError('Doctor not found', 404);
    req.restoreAuditAction = 'DOCTOR_UPDATED';
    req.restoreEntityType = 'DOCTOR';
    return restoreUser(req, res, next);
  } catch (error) { next(error); }
};

const getHospitalById = async (id, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT h.id, h.name, h.address, h.phone, h.email, h.opening_hours,
            h.is_active, h.deleted_at, h.deleted_by, h.created_at, h.updated_at,
            COUNT(DISTINCT CASE WHEN dh.is_active = 1 THEN dh.doctor_id END) AS doctor_count,
            COUNT(DISTINCT ha.user_id) AS admin_count,
            COUNT(DISTINCT a.id) AS appointment_count
     FROM hospitals h
     LEFT JOIN doctor_hospitals dh ON dh.hospital_id = h.id
     LEFT JOIN hospital_admins ha ON ha.hospital_id = h.id
     LEFT JOIN appointments a ON a.hospital_id = h.id
     WHERE h.id = ?
     GROUP BY h.id LIMIT 1`, [id]
  );
  return rows[0] || null;
};

export const listHospitals = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1), limit = Number(req.query.limit || 10), offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim(), status = req.query.status || 'active';
    const where = [], params = [];
    if (search) { where.push('(h.name LIKE ? OR h.address LIKE ? OR h.email LIKE ? OR h.phone LIKE ?)'); const t=`%${search}%`; params.push(t,t,t,t); }
    if (status === 'active') where.push('h.is_active=1 AND h.deleted_at IS NULL');
    if (status === 'inactive') where.push('h.is_active=0 AND h.deleted_at IS NULL');
    if (status === 'deleted') where.push('h.deleted_at IS NOT NULL');
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const [[countRows],[rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) total FROM hospitals h ${clause}`, params),
      pool.query(`SELECT h.id,h.name,h.address,h.phone,h.email,h.opening_hours,h.is_active,h.deleted_at,h.created_at,
                  COUNT(DISTINCT CASE WHEN dh.is_active=1 THEN dh.doctor_id END) doctor_count,
                  COUNT(DISTINCT a.id) appointment_count
                  FROM hospitals h LEFT JOIN doctor_hospitals dh ON dh.hospital_id=h.id
                  LEFT JOIN appointments a ON a.hospital_id=h.id ${clause}
                  GROUP BY h.id ORDER BY h.created_at DESC LIMIT ? OFFSET ?`, [...params,limit,offset])
    ]);
    const totalItems=Number(countRows[0].total);
    return res.json({success:true,message:'Hospitals retrieved successfully',data:rows,pagination:{page,limit,totalItems,totalPages:Math.ceil(totalItems/limit)}});
  } catch(error){ next(error); }
};

export const getHospital = async (req,res,next) => { try { const item=await getHospitalById(req.params.id); if(!item) throw new AppError('Hospital not found',404); return ok(res,item); } catch(e){next(e);} };

export const createHospital = async (req,res,next) => {
  const connection=await pool.getConnection();
  try { await connection.beginTransaction();
    const {name,address,phone=null,email=null,opening_hours=null}=req.body;
    const [dupes]=await connection.query('SELECT id FROM hospitals WHERE name=? AND address=? AND deleted_at IS NULL LIMIT 1',[name,address]);
    if(dupes.length) throw new AppError('A hospital with the same name and address already exists',409);
    const [result]=await connection.query('INSERT INTO hospitals(name,address,phone,email,opening_hours,is_active) VALUES(?,?,?,?,?,1)',[name,address,phone||null,email||null,opening_hours||null]);
    const created=await getHospitalById(result.insertId,connection);
    await writeAuditLog({...requestAuditContext(req),action:'HOSPITAL_CREATED',entityType:'HOSPITAL',entityId:result.insertId,newValues:created,connection});
    await connection.commit(); return ok(res,created,'Hospital created successfully',201);
  } catch(e){await connection.rollback();next(e);} finally{connection.release();}
};

export const updateHospital = async (req,res,next) => {
  const connection=await pool.getConnection();
  try { await connection.beginTransaction(); const old=await getHospitalById(req.params.id,connection); if(!old||old.deleted_at) throw new AppError('Hospital not found',404);
    const {name,address,phone=null,email=null,opening_hours=null}=req.body;
    const [dupes]=await connection.query('SELECT id FROM hospitals WHERE name=? AND address=? AND id<>? AND deleted_at IS NULL LIMIT 1',[name,address,old.id]);
    if(dupes.length) throw new AppError('A hospital with the same name and address already exists',409);
    await connection.query('UPDATE hospitals SET name=?,address=?,phone=?,email=?,opening_hours=? WHERE id=?',[name,address,phone||null,email||null,opening_hours||null,old.id]);
    const updated=await getHospitalById(old.id,connection);
    await writeAuditLog({...requestAuditContext(req),action:'HOSPITAL_UPDATED',entityType:'HOSPITAL',entityId:old.id,oldValues:old,newValues:updated,reason:req.body?.reason||null,connection});
    await connection.commit(); return ok(res,updated,'Hospital updated successfully');
  } catch(e){await connection.rollback();next(e);} finally{connection.release();}
};

export const updateHospitalStatus = async (req,res,next) => {
  const connection=await pool.getConnection();
  try { await connection.beginTransaction(); const old=await getHospitalById(req.params.id,connection); if(!old||old.deleted_at) throw new AppError('Hospital not found',404);
    const active=Boolean(req.body.is_active); await connection.query('UPDATE hospitals SET is_active=? WHERE id=?',[active,old.id]);
    const updated={...old,is_active:active};
    await writeAuditLog({...requestAuditContext(req),action:active?'HOSPITAL_ACTIVATED':'HOSPITAL_DEACTIVATED',entityType:'HOSPITAL',entityId:old.id,oldValues:old,newValues:updated,reason:req.body?.reason||null,connection});
    await connection.commit(); return ok(res,updated,active?'Hospital activated successfully':'Hospital deactivated successfully');
  } catch(e){await connection.rollback();next(e);} finally{connection.release();}
};

export const deleteHospital = async (req,res,next) => {
  const connection=await pool.getConnection();
  try { await connection.beginTransaction(); const old=await getHospitalById(req.params.id,connection); if(!old) throw new AppError('Hospital not found',404); if(old.deleted_at) throw new AppError('Hospital is already deleted',409);
    if(Number(old.appointment_count)>0) throw new AppError('Hospital cannot be deleted because appointment history exists. Deactivate it instead.',409);
    await connection.query('UPDATE hospitals SET is_active=0,deleted_at=NOW(),deleted_by=? WHERE id=?',[req.user.id,old.id]);
    await connection.query('UPDATE doctor_hospitals SET is_active=0 WHERE hospital_id=?',[old.id]);
    await writeAuditLog({...requestAuditContext(req),action:'HOSPITAL_DELETED',entityType:'HOSPITAL',entityId:old.id,oldValues:old,newValues:{...old,is_active:false},reason:req.body?.reason||null,connection});
    await connection.commit(); return ok(res,null,'Hospital deleted successfully');
  } catch(e){await connection.rollback();next(e);} finally{connection.release();}
};

export const restoreHospital = async (req,res,next) => {
  const connection=await pool.getConnection();
  try { await connection.beginTransaction(); const old=await getHospitalById(req.params.id,connection); if(!old) throw new AppError('Hospital not found',404); if(!old.deleted_at) throw new AppError('Hospital is not deleted',409);
    await connection.query('UPDATE hospitals SET is_active=1,deleted_at=NULL,deleted_by=NULL WHERE id=?',[old.id]); const updated=await getHospitalById(old.id,connection);
    await writeAuditLog({...requestAuditContext(req),action:'HOSPITAL_RESTORED',entityType:'HOSPITAL',entityId:old.id,oldValues:old,newValues:updated,connection});
    await connection.commit(); return ok(res,updated,'Hospital restored successfully');
  } catch(e){await connection.rollback();next(e);} finally{connection.release();}
};

export const listAdminChildren = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const gender = req.query.gender || null;
    const parentId = req.query.parent_id ? Number(req.query.parent_id) : null;
    const where = [];
    const params = [];
    if (search) {
      const term = `%${search}%`;
      where.push('(c.name LIKE ? OR p.name LIKE ? OR p.email LIKE ? OR p.phone LIKE ?)');
      params.push(term, term, term, term);
    }
    if (gender) { where.push('c.gender = ?'); params.push(gender); }
    if (parentId) { where.push('c.parent_id = ?'); params.push(parentId); }
    const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';

    const [[countRows], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM children c JOIN users p ON p.id = c.parent_id ${clause}`, params),
      pool.query(
        `SELECT c.id, c.parent_id, c.name, c.dob, c.gender, c.blood_group,
                c.current_weight_kg, c.allergies, c.created_at,
                p.name AS parent_name, p.email AS parent_email, p.phone AS parent_phone,
                (SELECT COUNT(*) FROM appointments a WHERE a.child_id = c.id) AS appointment_count,
                (SELECT COUNT(*) FROM immunization_records ir WHERE ir.child_id = c.id) AS immunization_count,
                (SELECT COUNT(*) FROM growth_records gr WHERE gr.child_id = c.id) AS growth_count,
                (SELECT COUNT(*) FROM medical_history mh WHERE mh.child_id = c.id) AS medical_history_count
         FROM children c
         JOIN users p ON p.id = c.parent_id
         ${clause}
         ORDER BY c.created_at DESC
         LIMIT ? OFFSET ?`,
        [...params, limit, offset]
      )
    ]);
    const totalItems = Number(countRows[0].total);
    return res.json({ success: true, message: 'Children retrieved successfully', data: rows,
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } });
  } catch (error) { next(error); }
};

export const getAdminChild = async (req, res, next) => {
  try {
    const childId = Number(req.params.id);
    const [children] = await pool.query(
      `SELECT c.*, p.name AS parent_name, p.email AS parent_email, p.phone AS parent_phone
       FROM children c JOIN users p ON p.id = c.parent_id WHERE c.id = ? LIMIT 1`, [childId]);
    if (!children.length) throw new AppError('Child not found', 404);

    const [[appointments], [schedules], [immunizations], [growth], [medical]] = await Promise.all([
      pool.query(`SELECT a.id, a.appointment_date, a.appointment_time, a.purpose, a.status,
                         d.name AS doctor_name, h.name AS hospital_name
                  FROM appointments a JOIN users d ON d.id = a.doctor_id
                  JOIN hospitals h ON h.id = a.hospital_id
                  WHERE a.child_id = ? ORDER BY a.appointment_date DESC, a.appointment_time DESC`, [childId]),
      pool.query(`SELECT vs.id, vs.due_date, vs.status, vs.administered_on, vs.notes,
                         v.name AS vaccine_name, v.dose_number
                  FROM vaccine_schedules vs JOIN vaccines v ON v.id = vs.vaccine_id
                  WHERE vs.child_id = ? ORDER BY vs.due_date`, [childId]),
      pool.query(`SELECT ir.*, v.name AS vaccine_name, d.name AS doctor_name, h.name AS hospital_name
                  FROM immunization_records ir JOIN vaccines v ON v.id = ir.vaccine_id
                  LEFT JOIN users d ON d.id = ir.doctor_id LEFT JOIN hospitals h ON h.id = ir.hospital_id
                  WHERE ir.child_id = ? ORDER BY ir.vaccination_date DESC, ir.id DESC`, [childId]),
      pool.query('SELECT * FROM growth_records WHERE child_id = ? ORDER BY measured_on DESC, id DESC', [childId]),
      pool.query(`SELECT mh.*, u.name AS created_by_name FROM medical_history mh
                  JOIN users u ON u.id = mh.created_by WHERE mh.child_id = ?
                  ORDER BY mh.record_date DESC, mh.id DESC`, [childId])
    ]);
    return ok(res, { child: children[0], appointments, schedules, immunizations, growth_records: growth, medical_history: medical });
  } catch (error) { next(error); }
};

const getAdminAccountById = async (id, connection = pool) => {
  const [rows] = await connection.query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.is_active, u.deleted_at,
            u.last_login_at, u.created_at, u.updated_at, ha.hospital_id,
            h.name AS hospital_name
     FROM users u
     LEFT JOIN hospital_admins ha ON ha.user_id = u.id
     LEFT JOIN hospitals h ON h.id = ha.hospital_id
     WHERE u.id = ? AND u.role IN (?, ?) LIMIT 1`,
    [id, ROLES.SYSTEM_ADMIN, ROLES.HOSPITAL_ADMIN]
  );
  return rows[0] || null;
};

const validateAdminHospital = async (role, hospitalId, connection) => {
  if (role === ROLES.SYSTEM_ADMIN) return null;
  if (!hospitalId) throw new AppError('Hospital is required for a Hospital Admin', 400);
  const [rows] = await connection.query(
    'SELECT id FROM hospitals WHERE id = ? AND is_active = 1 AND deleted_at IS NULL LIMIT 1',
    [hospitalId]
  );
  if (!rows.length) throw new AppError('Selected hospital is unavailable', 400);
  return Number(hospitalId);
};

export const listAdminAccounts = async (req, res, next) => {
  try {
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const role = req.query.role;
    const status = req.query.status || 'active';
    const where = ['u.role IN (?, ?)'];
    const params = [ROLES.SYSTEM_ADMIN, ROLES.HOSPITAL_ADMIN];
    if (search) {
      const term = `%${search}%`;
      where.push('(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ? OR h.name LIKE ?)');
      params.push(term, term, term, term);
    }
    if (role) { where.push('u.role = ?'); params.push(role); }
    if (status === 'active') where.push('u.is_active = 1 AND u.deleted_at IS NULL');
    if (status === 'inactive') where.push('u.is_active = 0 AND u.deleted_at IS NULL');
    if (status === 'deleted') where.push('u.deleted_at IS NOT NULL');
    const clause = `WHERE ${where.join(' AND ')}`;
    const [[countRows], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(DISTINCT u.id) AS total FROM users u LEFT JOIN hospital_admins ha ON ha.user_id=u.id LEFT JOIN hospitals h ON h.id=ha.hospital_id ${clause}`, params),
      pool.query(`SELECT u.id,u.name,u.email,u.phone,u.role,u.is_active,u.deleted_at,u.last_login_at,u.created_at,ha.hospital_id,h.name AS hospital_name
                  FROM users u LEFT JOIN hospital_admins ha ON ha.user_id=u.id LEFT JOIN hospitals h ON h.id=ha.hospital_id
                  ${clause} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`, [...params, limit, offset])
    ]);
    const totalItems = Number(countRows[0].total);
    return res.json({ success: true, message: 'Admin accounts retrieved successfully', data: rows,
      pagination: { page, limit, totalItems, totalPages: Math.ceil(totalItems / limit) } });
  } catch (error) { next(error); }
};

export const getAdminAccount = async (req, res, next) => {
  try {
    const account = await getAdminAccountById(req.params.id);
    if (!account) throw new AppError('Admin account not found', 404);
    return ok(res, account);
  } catch (error) { next(error); }
};

export const createAdminAccount = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { name, email, phone, password, role } = req.body;
    const hospitalId = await validateAdminHospital(role, req.body.hospital_id, connection);
    const [duplicates] = await connection.query('SELECT id FROM users WHERE email = ? OR phone = ? LIMIT 1', [email, phone]);
    if (duplicates.length) throw new AppError('Email or phone is already registered', 409);
    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await connection.query(
      'INSERT INTO users(name,email,phone,password_hash,role,is_active) VALUES(?,?,?,?,?,1)',
      [name, email, phone, passwordHash, role]
    );
    if (role === ROLES.HOSPITAL_ADMIN) {
      await connection.query('INSERT INTO hospital_admins(user_id,hospital_id) VALUES(?,?)', [result.insertId, hospitalId]);
    }
    const created = await getAdminAccountById(result.insertId, connection);
    await writeAuditLog({ ...requestAuditContext(req), action: 'ADMIN_CREATED', entityType: 'USER', entityId: result.insertId,
      newValues: created, connection });
    await connection.commit();
    return ok(res, created, 'Admin account created successfully', 201);
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

export const updateAdminAccount = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const target = await getAdminAccountById(req.params.id, connection);
    if (!target) throw new AppError('Admin account not found', 404);
    if (target.deleted_at) throw new AppError('Restore the account before editing it', 409);
    const { name, email, phone, role } = req.body;
    const hospitalId = await validateAdminHospital(role, req.body.hospital_id, connection);
    const [duplicates] = await connection.query('SELECT id FROM users WHERE (email = ? OR phone = ?) AND id <> ? LIMIT 1', [email, phone, target.id]);
    if (duplicates.length) throw new AppError('Email or phone is already registered', 409);
    if (Number(target.id) === Number(req.user.id) && role !== ROLES.SYSTEM_ADMIN) throw new AppError('You cannot remove your own System Admin role', 409);
    if (target.role === ROLES.SYSTEM_ADMIN && role !== ROLES.SYSTEM_ADMIN) await ensureFinalSystemAdminRemains(target, connection);
    await connection.query('UPDATE users SET name=?,email=?,phone=?,role=? WHERE id=?', [name,email,phone,role,target.id]);
    await connection.query('DELETE FROM hospital_admins WHERE user_id=?', [target.id]);
    if (role === ROLES.HOSPITAL_ADMIN) await connection.query('INSERT INTO hospital_admins(user_id,hospital_id) VALUES(?,?)', [target.id,hospitalId]);
    const updated = await getAdminAccountById(target.id, connection);
    await writeAuditLog({ ...requestAuditContext(req), action: 'ADMIN_UPDATED', entityType: 'USER', entityId: target.id,
      oldValues: target, newValues: updated, reason: req.body?.reason || null, connection });
    await connection.commit();
    return ok(res, updated, 'Admin account updated successfully');
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};

export const resetAdminPassword = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const target = await getAdminAccountById(req.params.id, connection);
    if (!target) throw new AppError('Admin account not found', 404);
    if (target.deleted_at || !target.is_active) throw new AppError('Password can only be reset for an active account', 409);
    const passwordHash = await bcrypt.hash(req.body.new_password, 12);
    await connection.query('UPDATE users SET password_hash=? WHERE id=?', [passwordHash,target.id]);
    await writeAuditLog({ ...requestAuditContext(req), action: 'ADMIN_PASSWORD_RESET', entityType: 'USER', entityId: target.id,
      reason: req.body?.reason || null, connection });
    await connection.commit();
    return ok(res, null, 'Admin password reset successfully');
  } catch (error) { await connection.rollback(); next(error); } finally { connection.release(); }
};
