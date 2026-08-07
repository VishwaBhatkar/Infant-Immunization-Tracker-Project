/**
 * File: backend/src/services/preferenceDeliveryService.js
 * Purpose: Contains reusable business-support operations and integrations used by controllers and background jobs.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';

async function sendEmail(to, title, message) {
  if (!process.env.EMAIL_WEBHOOK_URL) return { sent:false, reason:'EMAIL_WEBHOOK_URL is not configured' };
  const response = await fetch(process.env.EMAIL_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json','authorization':process.env.EMAIL_WEBHOOK_TOKEN?`Bearer ${process.env.EMAIL_WEBHOOK_TOKEN}`:''},body:JSON.stringify({to,subject:title,text:message})});
  if(!response.ok) throw new Error(`Email provider returned ${response.status}`);
  return {sent:true};
}
async function sendSms(to, message) {
  if (!process.env.SMS_WEBHOOK_URL) return { sent:false, reason:'SMS_WEBHOOK_URL is not configured' };
  const response = await fetch(process.env.SMS_WEBHOOK_URL,{method:'POST',headers:{'content-type':'application/json','authorization':process.env.SMS_WEBHOOK_TOKEN?`Bearer ${process.env.SMS_WEBHOOK_TOKEN}`:''},body:JSON.stringify({to,message})});
  if(!response.ok) throw new Error(`SMS provider returned ${response.status}`);
  return {sent:true};
}
export async function deliverPreferenceChannels(){
  const [rows]=await pool.query(`SELECT nl.id,nl.title,nl.message,u.email,u.phone,us.email_notifications,us.sms_notifications
    FROM notification_log nl JOIN users u ON u.id=nl.user_id
    LEFT JOIN user_settings us ON us.user_id=u.id
    WHERE nl.scheduled_at<=NOW() AND nl.status IN ('PENDING','SENT') AND COALESCE(nl.preference_channels_sent,0)=0 LIMIT 100`);
  let processed=0;
  for(const row of rows){
    const results={};
    try{if(row.email_notifications&&row.email)results.email=await sendEmail(row.email,row.title,row.message);if(row.sms_notifications&&row.phone)results.sms=await sendSms(row.phone,row.message);}
    catch(error){results.error=error.message}
    await pool.query('UPDATE notification_log SET preference_channels_sent=1, preference_channel_response=? WHERE id=?',[JSON.stringify(results),row.id]);processed++;
  }
  return processed;
}
