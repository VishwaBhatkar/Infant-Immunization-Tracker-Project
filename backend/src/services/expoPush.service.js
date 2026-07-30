import { pool } from '../config/db.js';

const EXPO_URL = process.env.EXPO_PUSH_URL || 'https://exp.host/--/api/v2/push/send';
const RECEIPT_URL = process.env.EXPO_RECEIPT_URL || 'https://exp.host/--/api/v2/push/getReceipts';
const TOKEN_RE = /^ExponentPushToken\[[^\]]+\]$|^ExpoPushToken\[[^\]]+\]$/;

export const isExpoPushToken = (token) => TOKEN_RE.test(String(token || ''));

export async function registerDeviceToken(userId, { token, device_id, platform = 'UNKNOWN', device_name = null }) {
  if (!isExpoPushToken(token)) {
    const error = new Error('Invalid Expo push token'); error.statusCode = 422; throw error;
  }
  await pool.query(
    `INSERT INTO push_tokens(user_id,expo_push_token,device_id,platform,device_name,is_active,last_registered_at,last_error)
     VALUES(?,?,?,?,?,TRUE,NOW(),NULL)
     ON DUPLICATE KEY UPDATE user_id=VALUES(user_id),expo_push_token=VALUES(expo_push_token),platform=VALUES(platform),device_name=VALUES(device_name),is_active=TRUE,last_registered_at=NOW(),last_error=NULL`,
    [userId, token, device_id, platform, device_name]
  );
}

export async function deactivateDeviceToken(userId, deviceId) {
  await pool.query('UPDATE push_tokens SET is_active=FALSE WHERE user_id=? AND device_id=?', [userId, deviceId]);
}

async function postJson(url, body) {
  const response = await fetch(url, { method: 'POST', headers: { Accept: 'application/json', 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const json = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Expo API ${response.status}: ${JSON.stringify(json)}`);
  return json;
}

export async function deliverPendingPushes() {
  const maxRetries = Number(process.env.REMINDER_MAX_RETRIES || 3);
  const [rows] = await pool.query(`
    SELECT nl.id,nl.user_id,nl.title,nl.message,nl.reminder_type,nl.related_record_id,pt.expo_push_token
    FROM notification_log nl
    JOIN notification_preferences np ON np.user_id=nl.user_id AND np.push_enabled=TRUE
    JOIN push_tokens pt ON pt.user_id=nl.user_id AND pt.is_active=TRUE
    WHERE nl.status IN ('PENDING','FAILED') AND nl.scheduled_at<=NOW() AND nl.attempt_count < ?
    ORDER BY nl.id LIMIT 100`, [maxRetries]);
  let sent = 0, failed = 0;
  for (const row of rows) {
    try {
      const result = await postJson(EXPO_URL, { to: row.expo_push_token, sound: 'default', title: row.title, body: row.message, data: { type: row.reminder_type, relatedId: row.related_record_id } });
      const ticket = Array.isArray(result.data) ? result.data[0] : result.data;
      if (ticket?.status === 'error') throw Object.assign(new Error(ticket.message || 'Expo rejected notification'), { details: ticket.details });
      await pool.query(`UPDATE notification_log SET status='SENT',sent_at=NOW(),attempt_count=attempt_count+1,failure_reason=NULL,provider_response=?,expo_ticket_id=? WHERE id=?`, [JSON.stringify(result), ticket?.id || null, row.id]);
      sent++;
    } catch (error) {
      const details = error.details || {};
      const invalid = details.error === 'DeviceNotRegistered';
      if (invalid) await pool.query(`UPDATE push_tokens SET is_active=FALSE,last_error=? WHERE expo_push_token=?`, [error.message, row.expo_push_token]);
      await pool.query(`UPDATE notification_log SET status='FAILED',attempt_count=attempt_count+1,failure_reason=?,provider_response=? WHERE id=?`, [error.message.slice(0,500), JSON.stringify(error.details || {}), row.id]);
      failed++;
    }
  }
  return { sent, failed };
}

export async function checkExpoReceipts() {
  const [rows] = await pool.query(`SELECT id,expo_ticket_id FROM notification_log WHERE expo_ticket_id IS NOT NULL AND receipt_checked_at IS NULL AND sent_at >= DATE_SUB(NOW(),INTERVAL 2 DAY) LIMIT 300`);
  if (!rows.length) return { checked: 0, errors: 0 };
  const result = await postJson(RECEIPT_URL, { ids: rows.map(r => r.expo_ticket_id) });
  let errors = 0;
  for (const row of rows) {
    const receipt = result.data?.[row.expo_ticket_id];
    if (!receipt) continue;
    if (receipt.status === 'error') errors++;
    await pool.query(`UPDATE notification_log SET receipt_checked_at=NOW(),provider_response=?,failure_reason=CASE WHEN ?='error' THEN ? ELSE failure_reason END WHERE id=?`, [JSON.stringify(receipt), receipt.status, receipt.message || null, row.id]);
  }
  return { checked: rows.length, errors };
}
