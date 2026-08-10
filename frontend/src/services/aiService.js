/**
 * File: frontend/src/services/aiService.js
 * Purpose: Contains reusable business-support operations and integrations used by controllers and background jobs.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { api } from '@/services/apiService';

export async function askVaccinationAssistant({ question, childId, language = 'English' }) {
  const response = await api.post('/ai/vaccination-chat', {
    question,
    childId: childId || null,
    language
  });
  return response.data?.data;
}
