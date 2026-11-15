-- Free-text notes about a donor, edited on their profile and read by the AI
-- when it writes a draft. '' = no notes.
ALTER TABLE donors ADD COLUMN notes TEXT NOT NULL DEFAULT '';
