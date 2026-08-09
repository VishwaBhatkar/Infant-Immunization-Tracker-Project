/**
 * File: backend/src/routes/index.js
 * Purpose: Defines API routes and connects each endpoint to its validation, authorization, and controller handlers.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { Router } from 'express';
import { param } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { register, login, me } from '../controllers/authController.js';
import * as c from '../controllers/appController.js';
import { registerRules, loginRules } from '../validators/authValidators.js';
import { validate } from '../middleware/validationMiddleware.js';
import { authenticate, authorizeRoles } from '../middleware/authMiddleware.js';
import { ROLES, ADMIN_ROLES } from '../constants/roles.js';
import { adminLimiter, adminNoStore } from '../middleware/securityMiddleware.js';
import * as admin from '../controllers/adminController.js';
import * as adminNotification from '../controllers/adminNotificationController.js';
import * as adminReport from '../controllers/adminReportController.js';
import { adminUserListRules, adminUserIdRules, updateAdminUserStatusRules, deleteAdminUserRules, adminDoctorListRules, adminDoctorIdRules, createAdminDoctorRules, updateAdminDoctorRules, adminHospitalListRules, adminHospitalIdRules, createAdminHospitalRules, updateAdminHospitalRules, adminChildListRules, adminChildIdRules, adminNotificationListRules, adminNotificationIdRules, sendAdminNotificationRules, cancelAdminNotificationRules, adminAccountListRules, adminAccountIdRules, createAdminAccountRules, updateAdminAccountRules, resetAdminPasswordRules } from '../validators/adminValidators.js';
import * as dashboard from '../controllers/dashboardController.js';
import * as profile from '../controllers/profileController.js';
import { updateProfileRules, changePasswordRules, deleteAccountRules } from '../validators/profileValidators.js';
import * as child from '../controllers/childController.js';
import { childIdRules, createChildRules, updateChildRules } from '../validators/childValidators.js';
import * as vaccine from '../controllers/vaccineController.js';
import { vaccineIdRules, vaccineListRules, createVaccineRules, updateVaccineRules } from '../validators/vaccineValidators.js';
import * as schedule from '../controllers/scheduleController.js';
import { childScheduleIdRules, generateScheduleRules, scheduleListRules } from '../validators/scheduleValidators.js';
import * as immunization from '../controllers/immunizationController.js';
import { createRecordRules, recordIdRules, recordListRules, updateRecordRules } from '../validators/immunizationValidators.js';
import * as appointment from '../controllers/appointmentController.js';
import * as hospitalAdmin from '../controllers/hospitalAdminController.js';
import * as review from '../controllers/reviewController.js';
import { createReviewRules } from '../validators/reviewValidators.js';
import { appointmentIdRules, availabilityRules, createAppointmentRules, listAppointmentRules, rescheduleRules, statusRules } from '../validators/appointmentValidators.js';
import * as reminder from '../controllers/reminderController.js';
import { preferenceRules, logRules } from '../validators/reminderValidators.js';
import * as push from '../controllers/pushController.js';
import { registerPushRules, deviceIdRules } from '../validators/pushValidators.js';
import * as phase13 from '../controllers/phase13Controller.js';
import * as ai from '../controllers/aiController.js';
import { vaccinationChatRules } from '../validators/aiValidators.js';
import { idRule as phase13IdRule, growthCreate, medicalCreate, settingsRules, ticketRules, feedbackRules, bugRules } from '../validators/phase13Validators.js';

const r = Router();


const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, message: 'Too many chatbot requests. Please try again later.' }
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again after 15 minutes.'
  }
});

r.post('/auth/register', authLimiter, registerRules, validate, register);
r.post('/auth/login', authLimiter, loginRules, validate, login);
r.get('/auth/me', authenticate, me);

// Apply stricter controls and disable caching for every Admin endpoint.
r.use('/admin', authenticate, adminLimiter, adminNoStore);

r.get('/hospitals', authenticate, c.hospitals);
r.get('/dashboard/admin', authenticate, authorizeRoles(...ADMIN_ROLES), dashboard.adminDashboard);
r.get('/admin/admin-users', authorizeRoles(ROLES.SYSTEM_ADMIN), adminAccountListRules, validate, admin.listAdminAccounts);
r.post('/admin/admin-users', authorizeRoles(ROLES.SYSTEM_ADMIN), createAdminAccountRules, validate, admin.createAdminAccount);
r.get('/admin/admin-users/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), adminAccountIdRules, validate, admin.getAdminAccount);
r.put('/admin/admin-users/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), updateAdminAccountRules, validate, admin.updateAdminAccount);
r.patch('/admin/admin-users/:id/status', authorizeRoles(ROLES.SYSTEM_ADMIN), updateAdminUserStatusRules, validate, admin.updateUserStatus);
r.post('/admin/admin-users/:id/reset-password', authorizeRoles(ROLES.SYSTEM_ADMIN), resetAdminPasswordRules, validate, admin.resetAdminPassword);
r.delete('/admin/admin-users/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), deleteAdminUserRules, validate, admin.deleteUser);
r.patch('/admin/admin-users/:id/restore', authorizeRoles(ROLES.SYSTEM_ADMIN), adminAccountIdRules, validate, admin.restoreUser);
r.get('/admin/users', authorizeRoles(ROLES.SYSTEM_ADMIN), adminUserListRules, validate, admin.listUsers);
r.get('/admin/users/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), adminUserIdRules, validate, admin.getUser);
r.patch('/admin/users/:id/status', authorizeRoles(ROLES.SYSTEM_ADMIN), updateAdminUserStatusRules, validate, admin.updateUserStatus);
r.delete('/admin/users/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), deleteAdminUserRules, validate, admin.deleteUser);
r.patch('/admin/users/:id/restore', authorizeRoles(ROLES.SYSTEM_ADMIN), adminUserIdRules, validate, admin.restoreUser);
r.get('/admin/hospitals/options', authorizeRoles(ROLES.SYSTEM_ADMIN), admin.listActiveHospitals);
r.get('/admin/doctors', authorizeRoles(ROLES.SYSTEM_ADMIN), adminDoctorListRules, validate, admin.listDoctors);
r.post('/admin/doctors', authorizeRoles(ROLES.SYSTEM_ADMIN), createAdminDoctorRules, validate, admin.createDoctor);
r.get('/admin/doctors/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), adminDoctorIdRules, validate, admin.getDoctor);
r.put('/admin/doctors/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), updateAdminDoctorRules, validate, admin.updateDoctor);
r.patch('/admin/doctors/:id/status', authorizeRoles(ROLES.SYSTEM_ADMIN), updateAdminUserStatusRules, validate, admin.updateDoctorStatus);
r.delete('/admin/doctors/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), deleteAdminUserRules, validate, admin.deleteDoctor);
r.patch('/admin/doctors/:id/restore', authorizeRoles(ROLES.SYSTEM_ADMIN), adminDoctorIdRules, validate, admin.restoreDoctor);
r.get('/admin/hospitals', authorizeRoles(ROLES.SYSTEM_ADMIN), adminHospitalListRules, validate, admin.listHospitals);
r.post('/admin/hospitals', authorizeRoles(ROLES.SYSTEM_ADMIN), createAdminHospitalRules, validate, admin.createHospital);
r.get('/admin/hospitals/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), adminHospitalIdRules, validate, admin.getHospital);
r.put('/admin/hospitals/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), updateAdminHospitalRules, validate, admin.updateHospital);
r.patch('/admin/hospitals/:id/status', authorizeRoles(ROLES.SYSTEM_ADMIN), adminHospitalIdRules, updateAdminUserStatusRules.slice(-2), validate, admin.updateHospitalStatus);
r.delete('/admin/hospitals/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), adminHospitalIdRules, deleteAdminUserRules.slice(-1), validate, admin.deleteHospital);
r.patch('/admin/hospitals/:id/restore', authorizeRoles(ROLES.SYSTEM_ADMIN), adminHospitalIdRules, validate, admin.restoreHospital);
r.get('/admin/reports/overview', authorizeRoles(ROLES.SYSTEM_ADMIN), adminReport.overview);
r.get('/admin/reports/overdue-vaccines', authorizeRoles(ROLES.SYSTEM_ADMIN), adminReport.overdueVaccines);
r.get('/admin/notifications/statistics', authorizeRoles(ROLES.SYSTEM_ADMIN), adminNotification.statistics);
r.get('/admin/notifications', authorizeRoles(ROLES.SYSTEM_ADMIN), adminNotificationListRules, validate, adminNotification.listNotifications);
r.post('/admin/notifications/send', authorizeRoles(ROLES.SYSTEM_ADMIN), sendAdminNotificationRules, validate, adminNotification.sendNotification);
r.get('/admin/notifications/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), adminNotificationIdRules, validate, adminNotification.getNotification);
r.post('/admin/notifications/:id/retry', authorizeRoles(ROLES.SYSTEM_ADMIN), adminNotificationIdRules, validate, adminNotification.retryNotification);
r.patch('/admin/notifications/:id/cancel', authorizeRoles(ROLES.SYSTEM_ADMIN), cancelAdminNotificationRules, validate, adminNotification.cancelNotification);
r.get('/admin/children', authorizeRoles(ROLES.SYSTEM_ADMIN), adminChildListRules, validate, admin.listAdminChildren);
r.get('/admin/children/:id', authorizeRoles(ROLES.SYSTEM_ADMIN), adminChildIdRules, validate, admin.getAdminChild);
r.get('/hospital-admin/doctors', authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN), hospitalAdmin.listDoctors);
r.post('/hospital-admin/doctors', authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN), createAdminDoctorRules, validate, hospitalAdmin.createDoctor);
r.delete('/hospital-admin/doctors/:id', authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN), adminDoctorIdRules, validate, hospitalAdmin.removeDoctor);
r.get('/hospital-admin/parents', authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN), hospitalAdmin.listBookingParents);
r.get('/hospital-admin/users', authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN), hospitalAdmin.listUsers);
r.get('/hospital-admin/children', authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN), hospitalAdmin.listChildren);

r.get('/dashboard/parent', authenticate, authorizeRoles(ROLES.PARENT), dashboard.parentDashboard);
r.get('/dashboard/doctor', authenticate, authorizeRoles(ROLES.DOCTOR), dashboard.doctorDashboard);

r.post('/ai/vaccination-chat', authenticate, authorizeRoles(ROLES.PARENT), aiLimiter, vaccinationChatRules, validate, ai.vaccinationChat);

r.route('/children')
  .get(authenticate, authorizeRoles(ROLES.PARENT), child.listChildren)
  .post(authenticate, authorizeRoles(ROLES.PARENT), createChildRules, validate, child.addChild);

r.route('/children/:id')
  .get(authenticate, authorizeRoles(ROLES.PARENT), childIdRules, validate, child.getChild)
  .patch(authenticate, authorizeRoles(ROLES.PARENT), updateChildRules, validate, child.updateChild)
  .put(authenticate, authorizeRoles(ROLES.PARENT), updateChildRules, validate, child.updateChild)
  .delete(authenticate, authorizeRoles(ROLES.PARENT), childIdRules, validate, child.deleteChild);


r.route('/vaccines')
  .get(authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), vaccineListRules, validate, vaccine.listVaccines)
  .post(authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), createVaccineRules, validate, vaccine.createVaccine);

r.route('/vaccines/:id')
  .get(authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), vaccineIdRules, validate, vaccine.getVaccine)
  .patch(authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), updateVaccineRules, validate, vaccine.updateVaccine)
  .put(authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), updateVaccineRules, validate, vaccine.updateVaccine)
  .delete(authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), vaccineIdRules, validate, vaccine.deleteVaccine);

r.patch('/vaccines/:id/status', authenticate, authorizeRoles(ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), vaccineIdRules, validate, vaccine.toggleVaccineStatus);

r.get('/vaccine-schedules', authenticate, authorizeRoles(ROLES.PARENT, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), scheduleListRules, validate, schedule.listSchedules);
r.get('/vaccine-schedules/upcoming', authenticate, authorizeRoles(ROLES.PARENT), schedule.upcomingSchedules);
r.get('/vaccine-schedules/due', authenticate, authorizeRoles(ROLES.PARENT), schedule.dueSchedules);
r.get('/vaccine-schedules/overdue', authenticate, authorizeRoles(ROLES.PARENT), schedule.overdueSchedules);
r.get('/vaccine-schedules/child/:childId', authenticate, authorizeRoles(ROLES.PARENT), childScheduleIdRules, validate, schedule.getChildSchedule);
r.post('/vaccine-schedules/generate/:childId', authenticate, authorizeRoles(ROLES.PARENT), generateScheduleRules, validate, schedule.generateSchedule);
r.post('/vaccine-schedules/refresh-status', authenticate, authorizeRoles(ROLES.PARENT, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), schedule.refreshStatuses);


r.route('/immunization-records')
  .get(authenticate, authorizeRoles(ROLES.PARENT, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), recordListRules, validate, immunization.listRecords)
  .post(authenticate, authorizeRoles(ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), createRecordRules, validate, immunization.createRecord);

r.route('/immunization-records/:id')
  .get(authenticate, authorizeRoles(ROLES.PARENT, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), recordIdRules, validate, immunization.getRecord)
  .patch(authenticate, authorizeRoles(ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), updateRecordRules, validate, immunization.updateRecord)
  .put(authenticate, authorizeRoles(ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), updateRecordRules, validate, immunization.updateRecord)
  .delete(authenticate, authorizeRoles(ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), recordIdRules, validate, immunization.deleteRecord);

r.get('/doctors', authenticate, appointment.listDoctors);
r.get('/my-hospitals', authenticate, authorizeRoles(ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), appointment.listMyHospitals);
r.get('/doctors/:doctorId/availability', authenticate, availabilityRules, validate, appointment.availability);
r.route('/appointments')
  .get(authenticate, authorizeRoles(ROLES.PARENT, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), listAppointmentRules, validate, appointment.listAppointments)
  .post(authenticate, authorizeRoles(ROLES.PARENT), createAppointmentRules, validate, appointment.bookAppointment);
r.patch('/appointments/:id/status', authenticate, authorizeRoles(ROLES.PARENT, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), appointmentIdRules, statusRules, validate, appointment.updateStatus);
r.patch('/appointments/:id/reschedule', authenticate, authorizeRoles(ROLES.PARENT, ROLES.DOCTOR, ROLES.HOSPITAL_ADMIN, ROLES.SYSTEM_ADMIN), appointmentIdRules, rescheduleRules, validate, appointment.reschedule);
r.post('/appointments/:id/review', authenticate, authorizeRoles(ROLES.PARENT), appointmentIdRules, createReviewRules, validate, review.createReview);
r.get('/doctor/reviews', authenticate, authorizeRoles(ROLES.DOCTOR), review.listDoctorReviews);

// Growth tracking uses the complete /growth-records CRUD API below.
r.route('/notification-preferences')
  .get(authenticate, reminder.getPreferences)
  .put(authenticate, preferenceRules, validate, reminder.updatePreferences)
  .patch(authenticate, preferenceRules, validate, reminder.updatePreferences);
r.get('/notification-logs', authenticate, logRules, validate, reminder.listLogs);
r.post('/admin/reminders/run', authorizeRoles(ROLES.SYSTEM_ADMIN), reminder.runNow);

r.get('/notifications', authenticate, c.notifications);
r.delete('/notifications', authenticate, c.deleteAllNotifications);
r.delete('/notifications/:id', authenticate, [param('id').isInt({ min: 1 }).withMessage('Valid notification id is required')], validate, c.deleteNotification);
r.post('/notifications/push-token', authenticate, registerPushRules, validate, push.register);
r.delete('/notifications/push-token/:deviceId', authenticate, deviceIdRules, validate, push.remove);
r.post('/admin/push/send-pending', authorizeRoles(ROLES.SYSTEM_ADMIN), push.sendPending);
r.post('/admin/push/check-receipts', authorizeRoles(ROLES.SYSTEM_ADMIN), push.receipts);
r.route('/profile')
  .get(authenticate, profile.getProfile)
  .patch(authenticate, updateProfileRules, validate, profile.updateProfile)
  .put(authenticate, updateProfileRules, validate, profile.updateProfile)
  .delete(authenticate, deleteAccountRules, validate, profile.deleteAccount);

r.patch('/profile/password', authenticate, changePasswordRules, validate, profile.changePassword);


// Phase 13: growth, medical history, settings and help centre
r.route('/growth-records')
  .get(authenticate, authorizeRoles(ROLES.PARENT), phase13.listGrowth)
  .post(authenticate, authorizeRoles(ROLES.PARENT), growthCreate, validate, phase13.addGrowth);
r.route('/growth-records/:id')
  .patch(authenticate, authorizeRoles(ROLES.PARENT), phase13IdRule, validate, phase13.updateGrowth)
  .put(authenticate, authorizeRoles(ROLES.PARENT), phase13IdRule, validate, phase13.updateGrowth)
  .delete(authenticate, authorizeRoles(ROLES.PARENT), phase13IdRule, validate, phase13.deleteGrowth);
r.route('/medical-history')
  .get(authenticate, authorizeRoles(ROLES.PARENT), phase13.listMedical)
  .post(authenticate, authorizeRoles(ROLES.PARENT), medicalCreate, validate, phase13.addMedical);
r.route('/medical-history/:id')
  .patch(authenticate, authorizeRoles(ROLES.PARENT), phase13IdRule, validate, phase13.updateMedical)
  .put(authenticate, authorizeRoles(ROLES.PARENT), phase13IdRule, validate, phase13.updateMedical)
  .delete(authenticate, authorizeRoles(ROLES.PARENT), phase13IdRule, validate, phase13.deleteMedical);
r.route('/settings')
  .get(authenticate, phase13.getSettings)
  .patch(authenticate, settingsRules, validate, phase13.updateSettings)
  .put(authenticate, settingsRules, validate, phase13.updateSettings);
r.get('/help/faqs', authenticate, phase13.faqs);
r.get('/help/contact', authenticate, phase13.contactInfo);
r.route('/help/support-tickets').get(authenticate, phase13.myTickets).post(authenticate, ticketRules, validate, phase13.submitTicket);
r.post('/help/feedback', authenticate, feedbackRules, validate, phase13.submitFeedback);
r.post('/help/bug-reports', authenticate, bugRules, validate, phase13.submitBug);

export default r;
