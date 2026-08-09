/**
 * File: backend/src/controllers/aiController.js
 * Purpose: Handles incoming API requests, coordinates application services/database operations, and returns HTTP responses.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { AppError } from '../utils/AppError.js';
import { ok } from '../utils/responseUtils.js';
import {
  buildDatabaseAnswer,
  detectVaccinationIntent,
  findMentionedVaccine,
  getChildForParent,
  getCompletedVaccines,
  getLastCompletedVaccine,
  getNextVaccine,
  getOverdueVaccines,
  improveAnswerWithAI
} from '../services/vaccinationAssistantService.js';

const childIntents = new Set(['NEXT_VACCINE', 'OVERDUE_VACCINES', 'COMPLETED_VACCINES', 'LAST_COMPLETED_VACCINE']);

export async function vaccinationChat(req, res, next) {
  try {
    const question = String(req.body.question || '').trim();
    const language = ['English', 'Hindi', 'Marathi'].includes(req.body.language) ? req.body.language : 'English';
    const intent = detectVaccinationIntent(question);
    const childId = req.body.childId ? Number(req.body.childId) : null;
    let child = null;
    let data = null;

    if (childIntents.has(intent)) {
      if (!Number.isInteger(childId) || childId < 1) throw new AppError('Please select a child before asking this question', 400);
      child = await getChildForParent(childId, req.user.id);
      if (!child) throw new AppError('Child not found or access denied', 404);
    }

    if (intent === 'NEXT_VACCINE') data = await getNextVaccine(childId);
    else if (intent === 'OVERDUE_VACCINES') data = await getOverdueVaccines(childId);
    else if (intent === 'COMPLETED_VACCINES') data = await getCompletedVaccines(childId);
    else if (intent === 'LAST_COMPLETED_VACCINE') data = await getLastCompletedVaccine(childId);
    else if (intent === 'VACCINE_INFORMATION') data = await findMentionedVaccine(question);

    const verifiedAnswer = buildDatabaseAnswer({ intent, language, child, data });
    const result = await improveAnswerWithAI({ question, language, verifiedAnswer, context: { intent, child, data } });
    ok(res, { ...result, intent }, 'Vaccination assistant response generated');
  } catch (error) { next(error); }
}
