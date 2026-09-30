
CREATE OR REPLACE FUNCTION try_increment_message_count(
  p_user_id uuid,
  p_today text,
  p_limit integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  rows_updated integer;
BEGIN
  UPDATE profiles
  SET
    daily_message_count = CASE
      WHEN message_count_date::text = p_today THEN daily_message_count + 1
      ELSE 1
    END,
    message_count_date = p_today::date
  WHERE id = p_user_id
    AND (
      message_count_date IS DISTINCT FROM p_today::date
      OR daily_message_count < p_limit
    );

  GET DIAGNOSTICS rows_updated = ROW_COUNT;
  RETURN rows_updated > 0;
END;
$$;
