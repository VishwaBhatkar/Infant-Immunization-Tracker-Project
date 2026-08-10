/**
 * File: backend/src/services/vaccinationAssistantService.js
 * Purpose: Contains reusable business-support operations and integrations used by controllers and background jobs.
 *
 * Important: Comments in this file document the existing implementation.
 * No business logic, API behavior, navigation behavior, or UI behavior is changed.
 */
import { pool } from '../config/db.js';

const MEDICAL_DISCLAIMER = 'Please consult a qualified doctor for medical decisions.';

const languageText = {
  English: {
    noNext: name => `No upcoming vaccine was found for ${name}.`,
    next: (name, vaccine, date) => `${name}'s next vaccine is ${vaccine}, due on ${date}.`,
    noOverdue: name => `${name} has no overdue vaccines in the registered schedule.`,
    overdue: (name, items) => `${name} has ${items.length} overdue vaccine${items.length === 1 ? '' : 's'}: ${items.map(item => `${item.vaccine_name} (due ${formatDate(item.due_date)})`).join(', ')}.`,
    noCompleted: name => `No completed vaccination record was found for ${name}.`,
    completed: (name, items) => `${name} has ${items.length} completed vaccination record${items.length === 1 ? '' : 's'}: ${items.slice(0, 8).map(item => `${item.vaccine_name} (${formatDate(item.vaccination_date)})`).join(', ')}.`,
    noLast: name => `No completed vaccination record was found for ${name}.`,
    last: (name, item) => `${name}'s latest recorded vaccine is ${item.vaccine_name}, given on ${formatDate(item.vaccination_date)}${item.doctor_name ? ` by Dr. ${item.doctor_name}` : ''}${item.hospital_name ? ` at ${item.hospital_name}` : ''}.`,
    noVaccine: 'I could not identify that vaccine in the active vaccine list.',
    purpose: vaccine => `${vaccine.name} helps prevent ${vaccine.disease_prevented || 'the disease specified in the vaccination programme'}.${vaccine.description ? ` ${vaccine.description}` : ''}`,
    unsupported: 'I can help with upcoming, overdue, completed and last vaccinations, or explain the purpose of a vaccine.'
  },
  Hindi: {
    noNext: name => `${name} के लिए कोई आगामी टीका दर्ज नहीं मिला।`,
    next: (name, vaccine, date) => `${name} का अगला टीका ${vaccine} है, जिसकी तारीख ${date} है।`,
    noOverdue: name => `${name} के पंजीकृत शेड्यूल में कोई टीका लंबित नहीं है।`,
    overdue: (name, items) => `${name} के ${items.length} टीके लंबित हैं: ${items.map(item => `${item.vaccine_name} (${formatDate(item.due_date)})`).join(', ')}।`,
    noCompleted: name => `${name} का कोई पूर्ण टीकाकरण रिकॉर्ड नहीं मिला।`,
    completed: (name, items) => `${name} के पूर्ण टीके: ${items.slice(0, 8).map(item => `${item.vaccine_name} (${formatDate(item.vaccination_date)})`).join(', ')}।`,
    noLast: name => `${name} का कोई पूर्ण टीकाकरण रिकॉर्ड नहीं मिला।`,
    last: (name, item) => `${name} का नवीनतम दर्ज टीका ${item.vaccine_name} है, जो ${formatDate(item.vaccination_date)} को दिया गया था।`,
    noVaccine: 'सक्रिय वैक्सीन सूची में यह वैक्सीन नहीं मिली।',
    purpose: vaccine => `${vaccine.name} ${vaccine.disease_prevented || 'संबंधित बीमारी'} से बचाव में मदद करता है।${vaccine.description ? ` ${vaccine.description}` : ''}`,
    unsupported: 'मैं आगामी, लंबित, पूर्ण और अंतिम टीके या किसी टीके के उद्देश्य की जानकारी दे सकता हूँ।'
  },
  Marathi: {
    noNext: name => `${name} साठी पुढील लसीची नोंद सापडली नाही.`,
    next: (name, vaccine, date) => `${name} ची पुढील लस ${vaccine} आहे. ती ${date} रोजी देय आहे.`,
    noOverdue: name => `${name} च्या नोंदणीकृत वेळापत्रकात कोणतीही थकीत लस नाही.`,
    overdue: (name, items) => `${name} च्या ${items.length} लसी थकीत आहेत: ${items.map(item => `${item.vaccine_name} (${formatDate(item.due_date)})`).join(', ')}.`,
    noCompleted: name => `${name} ची पूर्ण झालेली लसीकरण नोंद सापडली नाही.`,
    completed: (name, items) => `${name} च्या पूर्ण झालेल्या लसी: ${items.slice(0, 8).map(item => `${item.vaccine_name} (${formatDate(item.vaccination_date)})`).join(', ')}.`,
    noLast: name => `${name} ची पूर्ण झालेली लसीकरण नोंद सापडली नाही.`,
    last: (name, item) => `${name} ची शेवटची नोंदवलेली लस ${item.vaccine_name} आहे. ती ${formatDate(item.vaccination_date)} रोजी दिली गेली.`,
    noVaccine: 'सक्रिय लस यादीमध्ये ही लस सापडली नाही.',
    purpose: vaccine => `${vaccine.name} ही लस ${vaccine.disease_prevented || 'संबंधित आजार'} टाळण्यास मदत करते.${vaccine.description ? ` ${vaccine.description}` : ''}`,
    unsupported: 'मी पुढील, थकीत, पूर्ण झालेल्या आणि शेवटच्या लसीबद्दल किंवा लसीच्या उपयोगाबद्दल माहिती देऊ शकतो.'
  }
};

function formatDate(value) {
  if (!value) return 'date unavailable';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date);
}

export function detectVaccinationIntent(question) {
  const text = String(question || '').toLowerCase().trim();
  if (/next vaccine|next vaccination|due next|पुढची लस|अगली वैक्सीन/.test(text)) return 'NEXT_VACCINE';
  if (/overdue|missed vaccine|pending vaccine|बाकी लस|थकीत|छूटी हुई वैक्सीन/.test(text)) return 'OVERDUE_VACCINES';
  if (/last vaccine|last vaccination|recent vaccine|शेवटची लस|पिछली वैक्सीन/.test(text)) return 'LAST_COMPLETED_VACCINE';
  if (/completed vaccine|vaccines completed|vaccines given|पूर्ण झालेल्या लसी|पूर्ण टीके/.test(text)) return 'COMPLETED_VACCINES';
  if (/purpose|prevent|used for|what is|कशासाठी|किस लिए|उपयोग/.test(text)) return 'VACCINE_INFORMATION';
  return 'GENERAL_VACCINATION_QUESTION';
}

export async function getChildForParent(childId, parentId) {
  const [rows] = await pool.query(
    `SELECT id,parent_id,name,dob,gender FROM children WHERE id=? AND parent_id=? LIMIT 1`,
    [childId, parentId]
  );
  return rows[0] || null;
}

export async function getNextVaccine(childId) {
  const [rows] = await pool.query(
    `SELECT vs.id AS schedule_id,vs.due_date,vs.status,v.id AS vaccine_id,v.name AS vaccine_name,
            v.description,v.disease_prevented,v.dose_number,v.administration_route
     FROM vaccine_schedules vs JOIN vaccines v ON v.id=vs.vaccine_id
     WHERE vs.child_id=? AND vs.status IN ('UPCOMING','DUE') AND vs.due_date>=CURDATE() AND v.is_active=1
     ORDER BY vs.due_date ASC,vs.id ASC LIMIT 1`,
    [childId]
  );
  return rows[0] || null;
}

export async function getOverdueVaccines(childId) {
  const [rows] = await pool.query(
    `SELECT vs.id AS schedule_id,vs.due_date,vs.status,v.id AS vaccine_id,v.name AS vaccine_name,
            v.description,v.disease_prevented,v.dose_number
     FROM vaccine_schedules vs JOIN vaccines v ON v.id=vs.vaccine_id
     WHERE vs.child_id=? AND vs.status IN ('UPCOMING','DUE','OVERDUE','MISSED')
       AND vs.due_date<CURDATE() AND v.is_active=1
     ORDER BY vs.due_date ASC,vs.id ASC`,
    [childId]
  );
  return rows;
}

export async function getCompletedVaccines(childId) {
  const [rows] = await pool.query(
    `SELECT ir.id AS immunization_record_id,ir.vaccination_date,ir.status,ir.batch_number,
            ir.injection_site,ir.next_dose_date,v.name AS vaccine_name,v.disease_prevented,
            v.dose_number,d.name AS doctor_name,h.name AS hospital_name
     FROM immunization_records ir
     JOIN vaccines v ON v.id=ir.vaccine_id
     LEFT JOIN users d ON d.id=ir.doctor_id
     LEFT JOIN hospitals h ON h.id=ir.hospital_id
     WHERE ir.child_id=? AND ir.status IN ('COMPLETED','CORRECTED')
     ORDER BY ir.vaccination_date DESC,ir.id DESC`,
    [childId]
  );
  return rows;
}

export async function getLastCompletedVaccine(childId) {
  const rows = await getCompletedVaccines(childId);
  return rows[0] || null;
}

export async function findMentionedVaccine(question) {
  const [vaccines] = await pool.query(
    `SELECT id,name,description,disease_prevented,recommended_age_days,dose_number,
            gap_between_doses_days,administration_route
     FROM vaccines WHERE is_active=1 ORDER BY CHAR_LENGTH(name) DESC`
  );
  const text = String(question || '').toLowerCase();
  return vaccines.find(vaccine => text.includes(String(vaccine.name).toLowerCase())) || null;
}

export function buildDatabaseAnswer({ intent, language = 'English', child, data }) {
  const t = languageText[language] || languageText.English;
  let answer;
  if (intent === 'NEXT_VACCINE') answer = data ? t.next(child.name, data.vaccine_name, formatDate(data.due_date)) : t.noNext(child.name);
  else if (intent === 'OVERDUE_VACCINES') answer = data.length ? t.overdue(child.name, data) : t.noOverdue(child.name);
  else if (intent === 'COMPLETED_VACCINES') answer = data.length ? t.completed(child.name, data) : t.noCompleted(child.name);
  else if (intent === 'LAST_COMPLETED_VACCINE') answer = data ? t.last(child.name, data) : t.noLast(child.name);
  else if (intent === 'VACCINE_INFORMATION') answer = data ? t.purpose(data) : t.noVaccine;
  else answer = t.unsupported;
  return `${answer} ${MEDICAL_DISCLAIMER}`;
}

export async function improveAnswerWithAI({ question, language, verifiedAnswer, context }) {
  if (!process.env.OPENAI_API_KEY) return { answer: verifiedAnswer, source: 'DATABASE' };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || 'gpt-5-mini',
      instructions: `You are a vaccination FAQ assistant. Rewrite the verified answer clearly in ${language}. Do not add facts, dates, diagnoses or treatment advice. Keep the medical disclaimer.`,
      input: `Parent question: ${question}\nVerified answer: ${verifiedAnswer}\nVerified context: ${JSON.stringify(context)}`
    })
  });
  if (!response.ok) return { answer: verifiedAnswer, source: 'DATABASE', aiWarning: `AI service returned ${response.status}` };
  const payload = await responseUtils.json();
  const text = payload.output_text || payload.output?.flatMap(item => item.content || []).find(item => item.type === 'output_text')?.text;
  return { answer: text?.trim() || verifiedAnswer, source: text ? 'DATABASE_AND_AI' : 'DATABASE' };
}
