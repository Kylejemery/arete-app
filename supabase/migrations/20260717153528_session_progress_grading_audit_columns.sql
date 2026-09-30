-- Columns the admin review page writes when overriding a grade.
alter table public.session_progress
  add column if not exists graded_at timestamptz,
  add column if not exists graded_by uuid references auth.users(id);
