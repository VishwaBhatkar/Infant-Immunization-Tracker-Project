import { pool } from '../config/db.js';
import { ok } from '../utils/response.js';
import { AppError } from '../utils/AppError.js';
import { generateScheduleForChild } from '../services/vaccinationSchedule.service.js';

const fields = `id,parent_id,name,dob,gender,blood_group,birth_weight_kg,current_weight_kg,
  allergies,medical_notes,profile_image_url,created_at,updated_at`;

const normaliseNullable = (value) => value === '' || value === undefined ? null : value;

export const listChildren = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${fields} FROM children WHERE parent_id=? ORDER BY created_at DESC`,
      [req.user.id]
    );
    ok(res, rows, 'Children loaded');
  } catch (error) { next(error); }
};

export const getChild = async (req, res, next) => {
  try {
    const [rows] = await pool.query(
      `SELECT ${fields} FROM children WHERE id=? AND parent_id=? LIMIT 1`,
      [req.params.id, req.user.id]
    );
    if (!rows.length) throw new AppError('Child not found', 404);
    ok(res, rows[0], 'Child profile loaded');
  } catch (error) { next(error); }
};

export const addChild = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const { name, dob, gender, blood_group, birth_weight_kg, current_weight_kg, allergies, medical_notes, profile_image_url } = req.body;
    const [result] = await connection.query(
      `INSERT INTO children(parent_id,name,dob,gender,blood_group,birth_weight_kg,current_weight_kg,allergies,medical_notes,profile_image_url)
       VALUES(?,?,?,?,?,?,?,?,?,?)`,
      [req.user.id, name, dob, gender, normaliseNullable(blood_group), normaliseNullable(birth_weight_kg), normaliseNullable(current_weight_kg), normaliseNullable(allergies), normaliseNullable(medical_notes), normaliseNullable(profile_image_url)]
    );
    let schedule = { created: 0 };
    let scheduleWarning = null;
    try {
      schedule = await generateScheduleForChild({ childId: result.insertId, connection });
    } catch (error) {
      // A child profile must still be created when vaccine master/template data is not configured yet.
      if (error.statusCode === 409) scheduleWarning = error.message;
      else throw error;
    }
    const [rows] = await connection.query(`SELECT ${fields} FROM children WHERE id=?`, [result.insertId]);
    await connection.commit();
    ok(res, { ...rows[0], generated_schedule_items: schedule.created, schedule_warning: scheduleWarning }, scheduleWarning ? 'Child added; vaccination schedule is pending configuration' : 'Child added and vaccination schedule generated', 201);
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
};

export const updateChild = async (req, res, next) => {
  try {
    const allowed = ['name', 'dob', 'gender', 'blood_group', 'birth_weight_kg', 'current_weight_kg', 'allergies', 'medical_notes', 'profile_image_url'];
    const updates = [];
    const values = [];
    for (const field of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates.push(`${field}=?`);
        values.push(normaliseNullable(req.body[field]));
      }
    }
    values.push(req.params.id, req.user.id);
    const [result] = await pool.query(
      `UPDATE children SET ${updates.join(',')} WHERE id=? AND parent_id=?`,
      values
    );
    if (!result.affectedRows) throw new AppError('Child not found', 404);
    const [rows] = await pool.query(`SELECT ${fields} FROM children WHERE id=? AND parent_id=?`, [req.params.id, req.user.id]);
    ok(res, rows[0], 'Child profile updated');
  } catch (error) { next(error); }
};

export const deleteChild = async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [children] = await connection.query('SELECT id FROM children WHERE id=? AND parent_id=? FOR UPDATE', [req.params.id, req.user.id]);
    if (!children.length) throw new AppError('Child not found', 404);
    // These two tables use ON DELETE RESTRICT, so remove their child-owned rows first.
    // Immunisation records must be deleted before vaccine schedules, which cascade with the child.
    await connection.query('DELETE FROM immunization_records WHERE child_id=?', [req.params.id]);
    await connection.query('DELETE FROM appointments WHERE child_id=? AND parent_id=?', [req.params.id, req.user.id]);

    const [result] = await connection.query(
      'DELETE FROM children WHERE id=? AND parent_id=?',
      [req.params.id, req.user.id]
    );
    if (!result.affectedRows) throw new AppError('Child not found', 404);
    await connection.commit();
    ok(res, null, 'Child deleted successfully');
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally { connection.release(); }
};
