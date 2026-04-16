# Job Agent — Getting Started on a New Machine

## Prerequisites

- Node.js 18+
- Git
- Claude Code (`npm install -g @anthropic-ai/claude-code`)

---

## 1. Clone the Repo

```bash
git clone https://github.com/Kylejemery/job-agent.git
cd job-agent
```

---

## 2. Set Up Environment Variables

```bash
copy .env.example .env   # Windows
# or
cp .env.example .env     # Mac/Linux
```

Fill in the following in `.env`:

```
ANTHROPIC_API_KEY=        # console.anthropic.com
SUPABASE_URL=             # Supabase → Settings → API
SUPABASE_ANON_KEY=        # Supabase → Settings → API
SUPABASE_SERVICE_KEY=     # Supabase → Settings → API (service_role)
DATABASE_URL=             # Supabase → Settings → Database → Connection string → URI
JSEARCH_API_KEY=          # Leave blank for now (Phase 2)
PORT=3001
```

---

## 3. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and open your project
2. Run the migration: **SQL Editor** → paste contents of `server/migrations/001_initial.sql` → Run
3. Create a storage bucket: **Storage** → **New bucket** → name it `resumes` → set to **public**

---

## 4. Install Dependencies

```bash
cd server && npm install
cd ../client && npm install
```

---

## 5. Start the App

Open two terminals:

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173)

---

## 6. Claude Code Setup

```bash
# Install Claude Code
npm install -g @anthropic-ai/claude-code

# Launch in project root
cd job-agent
claude
```

### Recommended Plugins

```
/plugin marketplace add https://github.com/Yeachan-Heo/oh-my-claudecode
/plugin install oh-my-claudecode
/reload-plugins
```

---

## 7. Current Status

### Completed
- Phase 1 fully built and tested
- Resume upload and text extraction
- Job fit scoring (Claude Sonnet, batch up to 10)
- Tailored resume generation (streaming)
- Cover letter generation (streaming, first person)
- PDF export for resume and cover letter
- Application saved to DB with status tracking
- Documents persist across sessions

### Known Issues Being Fixed
- Resume PDF: non-standard bullet characters (⚫) cause encoding error — replace with plain hyphens
- Cover letter PDF: missing header, salutation, date, and closing signature

### Up Next
- Phase 2: JSearch API integration and job feed UI

---

## 8. Build Order Reference

See `CLAUDE.md` for full build instructions. When resuming with Claude Code:

```
Read CLAUDE.md and job-agent-spec.md, then continue from where we left off.
```
