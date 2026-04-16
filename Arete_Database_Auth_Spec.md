# Arete App — Database & Authentication Spec

*For GitHub Copilot. This spec covers the full Supabase integration: database schema, authentication, replacing AsyncStorage (mobile) and localStorage (web) with Supabase client calls, and real-time sync. Implement in the order described. Do not skip steps.*

---

## 1. Overview

The Arete app currently stores all data locally — AsyncStorage on mobile, localStorage on web. These two surfaces do not share any data. This spec replaces both with a shared Supabase backend so that all user data is persistent, synced in real time across mobile and web, and tied to an authenticated user account.

**What Supabase provides for this project:**
- Postgres database (hosted, managed)
- Authentication (email/password to start)
- Real-time subscriptions — database changes push instantly to all connected clients, no Socket.io needed
- TypeScript SDK that works in both Next.js and React Native/Expo

---

## 2. Setup

### 2.1 Create Supabase Project
- Create a new project at supabase.com
- Note the project URL and anon public key — these go into environment variables
- Note the service role key — this goes into the Express backend only, never the frontend

### 2.2 Environment Variables

**Mobile app (`app/`) — add to `.env`:**
```
EXPO_PUBLIC_SUPABASE_URL=your_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Web app (`web/`) — add to `.env.local`:**
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

**Backend (`server/`) — add to Railway environment variables:**
```
SUPABASE_URL=your_project_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2.3 Install Supabase Client

**Mobile:**
```
npx expo install @supabase/supabase-js @react-native-async-storage/async-storage
```
Note: AsyncStorage is still used here — but only by the Supabase auth client internally for session persistence. It is no longer used directly by the app for data storage.

**Web:**
```
npm install @supabase/supabase-js
```

### 2.4 Supabase Client Initialization

Create a shared client file in each frontend:

**Mobile — `app/lib/supabase.ts`:**
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

**Web — `web/lib/supabase.ts`:**
```typescript
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

---

## 3. Authentication

### 3.1 Method
Email and password authentication to start. No OAuth, no magic links in v1.

### 3.2 Auth Flow — Mobile
- App opens → check for existing Supabase session
- If session exists → route to main app
- If no session → route to login screen
- Login screen has two modes: Sign In and Sign Up (toggle between them)
- Sign Up: email, password, confirm password
- Sign In: email, password
- On successful auth → store session (Supabase handles this via AsyncStorage automatically)
- Sign out → clear session, route to login screen

### 3.3 Auth Flow — Web
- Same logic as mobile
- Pre-login homepage (marketing layer) is public — no auth required
- All app routes (`/app/*`) require auth — middleware redirects unauthenticated users to `/login`
- On successful auth → route to `/app/dashboard`

### 3.4 Auth UI — Mobile
Create `app/(auth)/login.tsx` — a clean login/signup screen matching the existing dark navy + gold design language.

### 3.5 Auth UI — Web
Create `web/app/login/page.tsx` — matches the web design language.

### 3.6 User Profile
On first sign up, create a row in the `profiles` table (see Section 4.1). This happens automatically via a Supabase database trigger — do not handle it manually in the frontend.

---

## 4. Database Schema

Create all tables in the Supabase SQL editor in the order listed. All tables use Row Level Security (RLS) — users can only read and write their own data.

### 4.1 `profiles`
Created automatically on user sign up via trigger.

```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Trigger to create profile on sign up
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();
```

### 4.2 `journal_entries`
Stores all Unified Journal entries: Reflections, Quotes, and Ideas. Beliefs are stored separately (see 4.3).

```sql
create table journal_entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('reflection', 'quote', 'idea')),
  content text not null,
  book_title text,        -- Quote entries only
  author text,            -- Quote entries only
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4.3 `beliefs`
Stores encoded beliefs — the output of the Belief Journal process.

```sql
create table beliefs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  raw_input text not null,
  dialogue_history jsonb not null default '[]',
  encoded_belief text not null,
  has_virtue_concern boolean default false,
  virtue_concern text,
  encoded_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

`dialogue_history` stores the full cabinet dialogue as a JSON array:
```json
[
  { "role": "user", "content": "...", "timestamp": "..." },
  { "role": "cabinet", "content": "...", "timestamp": "..." }
]
```

### 4.4 `check_ins`
Stores morning and evening check-ins and their cabinet responses.

```sql
create table check_ins (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  type text not null check (type in ('morning', 'evening')),
  user_input text not null,
  cabinet_response text not null,
  check_in_date date not null default current_date,
  created_at timestamptz default now()
);
```

### 4.5 `books`
Stores the reading tracker — books in progress and completed.

```sql
create table books (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  author text,
  status text not null check (status in ('reading', 'finished', 'want_to_read')),
  started_at date,
  finished_at date,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4.6 `habits`
Stores the fixed habits tracked in the Progress tracker.

```sql
create table habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  name text not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
```

Fixed habits to seed on first login (handle in app, not database):
`meditation`, `boxing`, `running`, `cold shower`, `stretching`, `reading`

### 4.7 `habit_logs`
A log entry for each habit completion.

```sql
create table habit_logs (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  habit_id uuid references habits(id) on delete cascade not null,
  logged_date date not null default current_date,
  created_at timestamptz default now(),
  unique(habit_id, logged_date)
);
```

### 4.8 `milestones`
Stores user milestones in the Progress tracker.

```sql
create table milestones (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  title text not null,
  description text,
  achieved_at date,
  is_achieved boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### 4.9 `weekly_reviews`
Stores generated weekly reviews.

```sql
create table weekly_reviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  week_start date not null,
  week_end date not null,
  generated_review text not null,
  created_at timestamptz default now()
);
```

### 4.10 `sessions`
Tracks time spent in the Arete app for the screen time tracker.

```sql
create table sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id) on delete cascade not null,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer
);
```

---

## 5. Row Level Security (RLS)

Enable RLS on every table and add a policy so users can only access their own data.

```sql
alter table journal_entries enable row level security;
alter table beliefs enable row level security;
alter table check_ins enable row level security;
alter table books enable row level security;
alter table habits enable row level security;
alter table habit_logs enable row level security;
alter table milestones enable row level security;
alter table weekly_reviews enable row level security;
alter table sessions enable row level security;

-- Apply this policy to every table above (repeat for each)
create policy "Users can manage their own data"
  on journal_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 6. Real-Time Sync

Enable real-time on the following tables in the Supabase dashboard under Database → Replication:

`journal_entries`, `beliefs`, `check_ins`, `habit_logs`, `milestones`

### 6.1 Subscription Pattern

Use this pattern in both mobile and web wherever live updates are needed:

```typescript
const subscription = supabase
  .channel('journal_changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'journal_entries',
      filter: `user_id=eq.${userId}`
    },
    (payload) => {
      // Update local state with payload.new or payload.old
    }
  )
  .subscribe()

// Clean up on component unmount
return () => { supabase.removeChannel(subscription) }
```

---

## 7. Replacing AsyncStorage and localStorage

Every place the app currently reads from or writes to AsyncStorage (mobile) or localStorage (web) for app data — replace with a Supabase query. AsyncStorage remains in use only for Supabase auth session persistence internally.

**Read:**
```typescript
const { data, error } = await supabase
  .from('journal_entries')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false })
```

**Write:**
```typescript
const { data, error } = await supabase
  .from('journal_entries')
  .insert({ user_id: userId, type: 'reflection', content: entryText })
```

**Update:**
```typescript
const { error } = await supabase
  .from('journal_entries')
  .update({ content: updatedText, updated_at: new Date().toISOString() })
  .eq('id', entryId)
  .eq('user_id', userId)
```

**Delete:**
```typescript
const { error } = await supabase
  .from('journal_entries')
  .delete()
  .eq('id', entryId)
  .eq('user_id', userId)
```

---

## 8. Session Tracking (Screen Time)

- On app open → insert a new row into `sessions` with `started_at = now()`, store the session ID locally
- On app close / background → update that row with `ended_at = now()` and calculate `duration_seconds`
- Mobile: use Expo's `AppState` API to detect foreground/background transitions
- Web: use the `visibilitychange` event

---

## 9. Weekly Review Generator

The weekly review button calls the Express backend, which calls Claude. The prompt passed to Claude must include data pulled from Supabase for the current week:

- All `habit_logs` for the week
- All `check_ins` for the week
- Count of journal entries written
- Count of books finished
- Any milestones achieved

The generated review text is saved to the `weekly_reviews` table.

---

## 10. Push Notifications

Push notifications are currently device-level (Expo push tokens). Once auth is in place, store the Expo push token against the user profile so notifications can be targeted per user across devices.

```sql
alter table profiles add column expo_push_token text;
```

Update the push token in the profile whenever it changes — Expo provides a hook for this.

---

## 11. Order of Implementation

Implement in this exact order. Confirm each step is working before proceeding to the next.

1. Supabase project created, environment variables set in all three locations
2. Supabase client initialized in mobile and web
3. Authentication — mobile login/signup screen built and working
4. Authentication — web login/signup screen built and working
5. Database tables created with RLS policies
6. Profiles trigger confirmed working (sign up creates a profile row)
7. Replace AsyncStorage on mobile — journal entries first, confirm sync
8. Replace localStorage on web — journal entries first, confirm sync
9. Real-time subscription confirmed working (write on mobile, appears on web)
10. Replace remaining AsyncStorage / localStorage calls for all other features
11. Session tracking added to both mobile and web
12. Push token stored against user profile
13. Weekly review generator updated to pull from Supabase

---

*If anything in this spec is ambiguous, ask before building. Do not combine steps or skip confirmations — each step needs to be verified working before the next begins. The order of implementation matters.*
