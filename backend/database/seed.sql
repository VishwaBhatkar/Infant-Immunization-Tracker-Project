USE child_vaccination_db;
INSERT INTO hospitals(name,address,phone) VALUES ('Sunrise Children Hospital','Baner Road, Pune','020-40000001'),('Lotus Mother & Child Hospital','Hinjewadi, Pune','020-40000002'),('City Care Paediatric Centre','Wakad, Pune','020-40000003');
INSERT INTO vaccines(name,description,recommended_age_days,dose_number) VALUES ('BCG','Tuberculosis protection',0,1),('Hepatitis B','Birth dose',0,1),('OPV','Oral polio vaccine',42,1),('Pentavalent','DPT, Hep B and Hib',42,1),('MR','Measles and rubella',270,1);
-- Create doctor/parent accounts using the registration API so passwords are hashed correctly.

INSERT IGNORE INTO vaccination_schedule_templates(name,description,is_active)
VALUES('Default Child Vaccination Schedule','Initial schedule generated from active vaccine doses',TRUE);
INSERT IGNORE INTO template_vaccines(template_id,vaccine_id,recommended_age_days,is_active)
SELECT t.id,v.id,v.recommended_age_days,TRUE
FROM vaccination_schedule_templates t
JOIN vaccines v ON v.is_active=TRUE
WHERE t.name='Default Child Vaccination Schedule';
