/**
 * File: backend/src/jobs/reminders.js
 * Purpose: Defines background or scheduled processing performed independently of an HTTP request.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import cron from 'node-cron';
import { runReminderCycle } from '../services/reminderService.js';

// Start the scheduled reminder job
export const startReminderJob = () =>
  cron.schedule(
    process.env.REMINDER_CRON || '0 8 * * *',

    // Execute the reminder cycle
    async () => {
      try {
        const result = await runReminderCycle();

        console.log('Reminder cycle completed', result);
      } catch (error) {
        console.error(
          'Reminder cycle failed',
          error.message
        );
      }
    },

    // Configure the scheduler timezone
    {
      timezone:
        process.env.REMINDER_TIMEZONE || 'Asia/Kolkata'
    }
  );