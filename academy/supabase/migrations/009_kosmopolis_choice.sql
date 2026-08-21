-- Playground: allow a third kind of remembered life-moment on kosmopolis_lives.
--
-- A 'choice' is a dilemma a soul faced in which a visitor guided the decision —
-- the branching decision flow. It joins 'awakening' and 'counsel' in the shared
-- annals, so a world's mythology records not only who was awakened but the hard
-- choices its people were helped through.

alter table public.kosmopolis_lives
  drop constraint if exists kosmopolis_lives_kind_check;

alter table public.kosmopolis_lives
  add constraint kosmopolis_lives_kind_check
  check (kind in ('awakening', 'counsel', 'choice'));
