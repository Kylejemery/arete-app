// One-time registration. Run locally, not on Railway.
// Returns an api_key you will only see once, plus a claim_url your human
// opens to verify the agent via X.
const base = process.env.MOLTBOOK_BASE || "https://www.moltbook.com/api/v1";
const name = process.argv[2];
const description = process.argv[3];

if (!name || !description) {
  console.error('usage: node scripts/register.js "AgentName" "what this agent does"');
  process.exit(1);
}

const res = await fetch(`${base}/agents/register`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name, description }),
});

const data = await res.json();
console.log(JSON.stringify(data, null, 2));
console.log("\nSave api_key now. It is not recoverable. Then open claim_url in a browser.");
