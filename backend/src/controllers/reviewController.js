/**
 * File: backend/src/controllers/reviewController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import { ok } from '../utils/responseUtils.js';
import { AppError } from '../utils/appError.js';

export const createReview = async (req, res, next) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const appointmentId = Number(req.params.id);
    const { rating, review_text, is_anonymous = false } = req.body;

    const [appointments] = await conn.query(
      `SELECT id,parent_id,doctor_id,hospital_id,status
       FROM appointments
       WHERE id=? AND parent_id=?
       FOR UPDATE`,
      [appointmentId, req.user.id]
    );
    if (!appointments.length) throw new AppError('Appointment not found', 404);
    const appointment = appointments[0];
    if (appointment.status !== 'COMPLETED') {
      throw new AppError('Feedback can only be submitted after the appointment is completed', 422);
    }

    const [existing] = await conn.query('SELECT id FROM doctor_reviews WHERE appointment_id=?', [appointmentId]);
    if (existing.length) throw new AppError('Feedback has already been submitted for this appointment', 409);

    const [result] = await conn.query(
      `INSERT INTO doctor_reviews
       (appointment_id,parent_id,doctor_id,hospital_id,rating,review_text,is_anonymous)
       VALUES(?,?,?,?,?,?,?)`,
      [
        appointmentId,
        req.user.id,
        appointment.doctor_id,
        appointment.hospital_id,
        Number(rating),
        review_text?.trim() || null,
        is_anonymous ? 1 : 0,
      ]
    );

    await conn.query(
      `INSERT INTO notifications(user_id,title,message,type)
       VALUES(?, 'New patient review', ?, 'APPOINTMENT')`,
      [appointment.doctor_id, `You received a ${Number(rating)}-star review for a completed appointment.`]
    );

    await conn.commit();
    ok(res, { id: result.insertId }, 'Thank you. Your feedback was submitted.', 201);
  } catch (error) {
    await conn.rollback();
    next(error);
  } finally {
    conn.release();
  }
};

export const listDoctorReviews = async (req, res, next) => {
  try {
    const doctorId = req.user.role === 'DOCTOR' ? req.user.id : Number(req.params.doctorId);
    const [rows] = await pool.query(
      `SELECT dr.id,dr.appointment_id,dr.rating,dr.review_text,dr.is_anonymous,dr.created_at,
              CASE WHEN dr.is_anonymous=1 THEN 'Anonymous parent' ELSE p.name END parent_name,
              c.name child_name,h.name hospital_name
       FROM doctor_reviews dr
       JOIN appointments a ON a.id=dr.appointment_id
       JOIN users p ON p.id=dr.parent_id
       JOIN children c ON c.id=a.child_id
       JOIN hospitals h ON h.id=dr.hospital_id
       WHERE dr.doctor_id=?
       ORDER BY dr.created_at DESC`,
      [doctorId]
    );
    const [summaryRows] = await pool.query(
      `SELECT COUNT(*) total_reviews, ROUND(AVG(rating),1) average_rating
       FROM doctor_reviews WHERE doctor_id=?`,
      [doctorId]
    );
    ok(res, { summary: summaryRows[0], reviews: rows }, 'Doctor reviews loaded');
  } catch (error) {
    next(error);
  }
};
