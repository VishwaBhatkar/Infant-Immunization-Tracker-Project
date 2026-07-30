-- Fix doctor selection and appointment time-slot availability.
-- Run this file after at least one active DOCTOR account and the default hospitals exist.
USE child_vaccination_db;

-- Link every active doctor to every active hospital currently in the database.
INSERT INTO doctor_hospitals (doctor_id, hospital_id, is_active)
SELECT doctor.id, hospital.id, TRUE
FROM users AS doctor
CROSS JOIN hospitals AS hospital
WHERE doctor.role = 'DOCTOR'
  AND doctor.is_active = TRUE
ON DUPLICATE KEY UPDATE is_active = TRUE;

-- Give linked doctors 30-minute slots from 09:00 to 17:00 on every day of the week.
INSERT INTO doctor_availability
  (doctor_id, hospital_id, weekday, start_time, end_time, slot_minutes, is_available)
SELECT
  link.doctor_id,
  link.hospital_id,
  weekday.day_number,
  '09:00:00',
  '17:00:00',
  30,
  TRUE
FROM doctor_hospitals AS link
CROSS JOIN (
  SELECT 0 AS day_number UNION ALL
  SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
  SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6
) AS weekday
JOIN users AS doctor ON doctor.id = link.doctor_id
WHERE link.is_active = TRUE
  AND doctor.role = 'DOCTOR'
  AND doctor.is_active = TRUE
ON DUPLICATE KEY UPDATE
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  slot_minutes = VALUES(slot_minutes),
  is_available = TRUE;

SELECT doctor.id AS doctor_id, doctor.name AS doctor_name,
       hospital.id AS hospital_id, hospital.name AS hospital_name
FROM doctor_hospitals AS link
JOIN users AS doctor ON doctor.id = link.doctor_id
JOIN hospitals AS hospital ON hospital.id = link.hospital_id
WHERE link.is_active = TRUE
ORDER BY doctor.name, hospital.name;
