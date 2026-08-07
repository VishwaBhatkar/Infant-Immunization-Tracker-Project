/**
 * File: backend/src/controllers/adminReportController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';
import { ok } from '../utils/responseUtils.js';

const normalizeRange = (req) => {
  const end = req.query.end_date || new Date().toISOString().slice(0, 10);
  const startDate = new Date(`${end}T00:00:00`);
  startDate.setDate(startDate.getDate() - 29);
  const start = req.query.start_date || startDate.toISOString().slice(0, 10);
  return { start, end };
};

export async function overview(req, res, next) {
  try {
    const { start, end } = normalizeRange(req);
    const [[users], [appointments], [vaccinations], [notifications], [monthlyAppointments], [monthlyVaccinations], [registrations], [hospitalPerformance]] = await Promise.all([
      pool.query(`SELECT COUNT(*) total_users,
        SUM(role='PARENT' AND is_active=1) active_parents,
        SUM(role='DOCTOR' AND is_active=1) active_doctors,
        SUM(role IN ('HOSPITAL_ADMIN','SYSTEM_ADMIN') AND is_active=1) active_admins
        FROM users WHERE deleted_at IS NULL`),
      pool.query(`SELECT COUNT(*) total,
        SUM(status='PENDING') pending,
        SUM(status='CONFIRMED') confirmed,
        SUM(status='COMPLETED') completed,
        SUM(status='CANCELLED') cancelled,
        SUM(status='REJECTED') rejected,
        SUM(status='RESCHEDULED') rescheduled
        FROM appointments WHERE appointment_date BETWEEN ? AND ?`, [start, end]),
      pool.query(`SELECT COUNT(*) completed,
        COUNT(DISTINCT child_id) vaccinated_children,
        COUNT(DISTINCT vaccine_id) vaccine_types
        FROM immunization_records WHERE vaccination_date BETWEEN ? AND ?`, [start, end]),
      pool.query(`SELECT COUNT(*) total,
        SUM(status IN ('SENT','DELIVERED')) successful,
        SUM(status='FAILED') failed,
        ROUND(100 * SUM(status IN ('SENT','DELIVERED')) / NULLIF(COUNT(*),0),2) success_rate
        FROM notification_log WHERE DATE(created_at) BETWEEN ? AND ?`, [start, end]),
      pool.query(`SELECT DATE_FORMAT(appointment_date,'%Y-%m') month, COUNT(*) total,
        SUM(status='COMPLETED') completed, SUM(status='CANCELLED') cancelled
        FROM appointments WHERE appointment_date BETWEEN ? AND ? GROUP BY month ORDER BY month`, [start, end]),
      pool.query(`SELECT DATE_FORMAT(vaccination_date,'%Y-%m') month, COUNT(*) total
        FROM immunization_records WHERE vaccination_date BETWEEN ? AND ? GROUP BY month ORDER BY month`, [start, end]),
      pool.query(`SELECT DATE_FORMAT(created_at,'%Y-%m') month, COUNT(*) total,
        SUM(role='PARENT') parents, SUM(role='DOCTOR') doctors
        FROM users WHERE DATE(created_at) BETWEEN ? AND ? GROUP BY month ORDER BY month`, [start, end]),
      pool.query(`SELECT h.id,h.name,
        COUNT(DISTINCT a.id) appointments,
        SUM(a.status='COMPLETED') completed_appointments,
        COUNT(DISTINCT ir.id) vaccinations
        FROM hospitals h
        LEFT JOIN appointments a ON a.hospital_id=h.id AND a.appointment_date BETWEEN ? AND ?
        LEFT JOIN immunization_records ir ON ir.hospital_id=h.id AND ir.vaccination_date BETWEEN ? AND ?
        WHERE h.deleted_at IS NULL
        GROUP BY h.id,h.name ORDER BY appointments DESC,h.name LIMIT 20`, [start, end, start, end])
    ]);

    ok(res, {
      range: { start_date: start, end_date: end },
      users: users[0],
      appointments: appointments[0],
      vaccinations: vaccinations[0],
      notifications: notifications[0],
      trends: { appointments: monthlyAppointments, vaccinations: monthlyVaccinations, registrations },
      hospital_performance: hospitalPerformance
    });
  } catch (error) { next(error); }
}

export async function overdueVaccines(req, res, next) {
  try {
    const page = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 20)));
    const offset = (page - 1) * limit;
    const search = String(req.query.search || '').trim();
    const where = [`vs.status IN ('DUE','OVERDUE','MISSED')`];
    const params = [];
    if (search) {
      const term = `%${search}%`;
      where.push('(c.name LIKE ? OR p.name LIKE ? OR v.name LIKE ?)');
      params.push(term, term, term);
    }
    const clause = `WHERE ${where.join(' AND ')}`;
    const [[count], [rows]] = await Promise.all([
      pool.query(`SELECT COUNT(*) total FROM vaccine_schedules vs JOIN children c ON c.id=vs.child_id JOIN users p ON p.id=c.parent_id JOIN vaccines v ON v.id=vs.vaccine_id ${clause}`, params),
      pool.query(`SELECT vs.id,vs.due_date,vs.status,c.id child_id,c.name child_name,p.name parent_name,p.email parent_email,v.name vaccine_name,v.dose_number,DATEDIFF(CURDATE(),vs.due_date) overdue_days FROM vaccine_schedules vs JOIN children c ON c.id=vs.child_id JOIN users p ON p.id=c.parent_id JOIN vaccines v ON v.id=vs.vaccine_id ${clause} ORDER BY vs.due_date ASC LIMIT ? OFFSET ?`, [...params, limit, offset])
    ]);
    const totalItems = Number(count[0].total);
    res.json({ success:true, message:'Overdue vaccine report retrieved successfully', data:rows, pagination:{page,limit,totalItems,totalPages:Math.ceil(totalItems/limit)} });
  } catch (error) { next(error); }
}
