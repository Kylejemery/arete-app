/**
 * A thin server-side client for the Stoic Oracle (the Railway backend that
 * powers the Library and the playground discussion board).
 *
 * The Oracle answers from the corpus with RAG. Its `question` field is capped
 * at 500 chars upstream — it drives both retrieval and the final user turn — so
 * the caller must keep the pointed part short and push framing into `history`.
 * The daily per-IP rate limit is enforced upstream, and `remaining` is returned
 * so callers can surface it. This is the same seam the comments route uses; it
 * lives here so the Kosmopolis mind and counsel routes can share it.
 */

const BACKEND_URL =
  process.env.RAILWAY_BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  "https://arete-app-production.up.railway.app";

/** The Oracle caps `question` at 500 chars. */
export const QUESTION_MAX = 500;

export type HistoryTurn = { role: "user" | "assistant"; content: string };

export type OracleReply = {
  answer: string;
  sources: unknown;
  remaining: number | null;
};

/** Trim a string to fit the Oracle's question limit, with an ellipsis. */
export function fitQuestion(q: string): string {
  const trimmed = q.trim();
  if (trimmed.length <= QUESTION_MAX) return trimmed;
  return trimmed.slice(0, QUESTION_MAX - 1).trimEnd() + "…";
}

/**
 * Ask the Oracle. `author` selects a voice (null = the whole tradition); only
 * Marcus Aurelius, Epictetus, Seneca, and Michel de Montaigne carry a distinct
 * grounded prompt upstream. Returns null if the Oracle could not be reached or
 * answered — callers decide how to degrade.
 */
export async function callOracle(args: {
  question: string;
  author?: string | null;
  history?: HistoryTurn[];
}): Promise<OracleReply | null> {
  const question = fitQuestion(args.question);
  if (!question) return null;

  try {
    const res = await fetch(`${BACKEND_URL}/oracle`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        author: args.author ?? null,
        history: Array.isArray(args.history) ? args.history : [],
      }),
    });
    if (!res.ok) {
      // 429 (daily limit) is a normal, expected outcome — pass the count back.
      if (res.status === 429) {
        return { answer: "", sources: null, remaining: 0 };
      }
      console.error("[lib/oracle] upstream", res.status, await res.text().catch(() => ""));
      return null;
    }
    const data = await res.json();
    const answer = typeof data.answer === "string" ? data.answer.trim() : "";
    const remaining = typeof data.remaining === "number" ? data.remaining : null;
    return { answer, sources: data.sources ?? null, remaining };
  } catch (err) {
    console.error("[lib/oracle] fetch", err);
    return null;
  }
}
