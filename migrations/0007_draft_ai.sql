-- 1 when the AI gateway wrote the draft's body (Follow-ups shows "Drafted by
-- AI"), 0 for a template.
ALTER TABLE drafts ADD COLUMN ai INTEGER NOT NULL DEFAULT 0;
