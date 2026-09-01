-- Distinguish who produced each relevance judgment: NULL = human (the blind
-- judging UI), otherwise the model id of the LLM judge. Lets a human-judged
-- sample validate the LLM judge later.
ALTER TABLE eval.eval_judgments ADD COLUMN IF NOT EXISTS judge text;
