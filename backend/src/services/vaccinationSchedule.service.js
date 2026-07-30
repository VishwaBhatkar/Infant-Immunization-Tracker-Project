import { pool } from '../config/db.js';
import { AppError } from '../utils/AppError.js';

const reminderDays = Number.parseInt(process.env.VACCINE_DUE_REMINDER_DAYS || '3', 10);

export const refreshScheduleStatuses = async (connection = pool, childId = null) => {
  const params = [Number.isFinite(reminderDays) ? reminderDays : 3];
  let childClause = '';
  if (childId) {
    childClause = ' AND child_id=?';
    params.push(childId);
  }

  const [result] = await connection.query(
    `UPDATE vaccine_schedules
     SET status = CASE
       WHEN status IN ('COMPLETED','MISSED','CANCELLED') THEN status
       WHEN due_date < CURDATE() THEN 'OVERDUE'
       WHEN due_date <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 'DUE'
       ELSE 'UPCOMING'
     END,
     updated_at = CURRENT_TIMESTAMP
     WHERE status NOT IN ('COMPLETED','MISSED','CANCELLED')${childClause}`,
    params
  );
  return result.affectedRows;
};

export const generateScheduleForChild = async ({ childId, connection = pool, force = false }) => {
  const [children] = await connection.query('SELECT id,dob FROM children WHERE id=? LIMIT 1', [childId]);
  if (!children.length) throw new AppError('Child not found', 404);

  const [templates] = await connection.query(
    'SELECT id,name FROM vaccination_schedule_templates WHERE is_active=1 ORDER BY id DESC LIMIT 1'
  );
  if (!templates.length) throw new AppError('No active vaccination schedule template is configured', 409);

  const template = templates[0];
  const [items] = await connection.query(
    `SELECT tv.id template_vaccine_id,tv.recommended_age_days,v.id vaccine_id
     FROM template_vaccines tv
     JOIN vaccines v ON v.id=tv.vaccine_id
     WHERE tv.template_id=? AND tv.is_active=1 AND v.is_active=1
     ORDER BY tv.recommended_age_days,v.name,v.dose_number`,
    [template.id]
  );
  if (!items.length) throw new AppError('The active vaccination template has no vaccine doses', 409);

  if (force) {
    await connection.query(
      "DELETE FROM vaccine_schedules WHERE child_id=? AND status IN ('UPCOMING','DUE','OVERDUE')",
      [childId]
    );
  }

  let created = 0;
  for (const item of items) {
    const [result] = await connection.query(
      `INSERT IGNORE INTO vaccine_schedules
       (child_id,vaccine_id,template_vaccine_id,due_date,status)
       VALUES(?,?,?,DATE_ADD(?, INTERVAL ? DAY),
         CASE
           WHEN DATE_ADD(?, INTERVAL ? DAY) < CURDATE() THEN 'OVERDUE'
           WHEN DATE_ADD(?, INTERVAL ? DAY) <= DATE_ADD(CURDATE(), INTERVAL ? DAY) THEN 'DUE'
           ELSE 'UPCOMING'
         END)`,
      [
        childId,
        item.vaccine_id,
        item.template_vaccine_id,
        children[0].dob,
        item.recommended_age_days,
        children[0].dob,
        item.recommended_age_days,
        children[0].dob,
        item.recommended_age_days,
        Number.isFinite(reminderDays) ? reminderDays : 3
      ]
    );
    created += result.affectedRows;
  }

  return { template, created, totalTemplateItems: items.length };
};
