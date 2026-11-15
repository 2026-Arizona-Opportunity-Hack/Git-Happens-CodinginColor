-- Program outcomes for funder packets and quarterly updates, one row per
-- program. Admins edit them on the Program outcomes page. The starting text is
-- only what CIC's hackathon brief says about each program.
CREATE TABLE program_outcomes (
  program TEXT PRIMARY KEY,
  students_served INTEGER,
  summary TEXT NOT NULL DEFAULT '',
  updated_at TEXT,
  updated_by TEXT
);

INSERT INTO program_outcomes (program, students_served, summary) VALUES
  ('K12', NULL, 'Year-long computer science and AI classes at partner high schools that don''t offer them, some for high school credit and some after school.'),
  ('AI Academy', NULL, 'AI Academy cohorts at Desert Edge, Maryvale and Salt River schools.'),
  ('Summer Camp', NULL, 'Summer coding camps for Arizona high schoolers.'),
  ('Day of Compute', 140, 'A day of hands-on computing for Phoenix Union students.'),
  ('General', NULL, 'Computer science and AI education for Arizona high schoolers whose schools don''t offer it.');
