-- Playground: allow a fourth kind of remembered life-moment on kosmopolis_lives.
--
-- A 'legacy' is the saying an awakened soul dies leaving behind — an epitaph
-- carried from its ephemeral world into the shared annals, so a soul's words
-- outlast the world they were spoken in. It joins 'awakening', 'counsel', and
-- 'choice'.

alter table public.kosmopolis_lives
  drop constraint if exists kosmopolis_lives_kind_check;

alter table public.kosmopolis_lives
  add constraint kosmopolis_lives_kind_check
  check (kind in ('awakening', 'counsel', 'choice', 'legacy'));
