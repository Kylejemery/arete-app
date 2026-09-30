-- profiles.account_type: who an account belongs to, separate from what plan
-- it is on. customer is everyone who signed up; owner is Kyle; family are
-- accounts Kyle gave to people he knows; test are demo and QA logins.
--
-- Clients cannot write it: the 2026-08-25 lockdown grants authenticated
-- UPDATE on named columns only, and this one is not among them.
--
-- demotwo@ and demo3@ were listed with the domain spelled purseuearete.com.
-- Neither exists under that spelling or pursuearete.com on 2026-09-30; both
-- spellings are listed so the rows are caught if they are created with
-- either one before the next migration touches this.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'customer'
  CONSTRAINT profiles_account_type_check
  CHECK (account_type IN ('customer', 'family', 'test', 'owner'));
COMMENT ON COLUMN public.profiles.account_type IS
  'customer (default), family, test, or owner. Who the account belongs to; not the plan.';

UPDATE public.profiles SET account_type = 'owner'
 WHERE lower(email) = 'kemery9585@gmail.com';

UPDATE public.profiles SET account_type = 'test'
 WHERE lower(email) LIKE '%@pursuearete.com'
    OR lower(email) IN (
      'demotwo@purseuearete.com',
      'demo3@purseuearete.com',
      'cosp@tester.com'
    );

UPDATE public.profiles SET account_type = 'family'
 WHERE lower(email) IN (
   'aundrea.c.emery@gmail.com',
   'hattie.l.emery@gmail.com',
   'devon.e.emery@gmail.com',
   'chip@emerybuilding.com',
   'quakebooksraleigh@gmail.com',
   'wdcrumpler@gmail.com',
   'rheller62@gmail.com',
   'bookerwoodley@yahoo.com',
   'ravivar@gmail.com',
   'andrew1js@gmail.com'
 );
