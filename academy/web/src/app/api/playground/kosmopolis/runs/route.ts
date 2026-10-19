import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import { resolveVisitor } from "@/lib/playground-visitor";
import { BOARD_RE, SCENARIO_KEYS, utcDate } from "@/content/playground/kosmopolis-modes";
import { SCHOOL_KEYS } from "@/content/playground/kosmopolis-polis";
import { RUN_END_META, RUN_YEARS } from "@/content/playground/kosmopolis-run";

/**
 * Kosmopolis boards: the ranked first cycle of a daily world or a scenario.
 *
 * GET  ?board=daily:2026-10-19  → the top ten (each visitor's best), and the
 *      signed-in visitor's own best and rank. Names and scores only.
 * POST { board, school, end, score, runYears } → posts a signed-in visitor's
 *      score. A daily board takes one score per visitor (the first); a
 *      scenario board takes any number and shows the best.
 *
 * kosmopolis_runs has RLS with no policies; this route is the only reader and
 * writer, with the service role. The score is reported by the browser, so a
 * determined visitor could post a false one; the bounds below only catch the
 * impossible.
 */

type Row = { user_id: string; author_name: string; score: number; run_end: string; school: string; run_years: number; created_at: string };

const TOP = 10;
const MAX_SCORE = 20000;
const POSTS_PER_DAY = 20;

function bestPerVisitor(rows: Row[]): Row[] {
  const seen = new Set<string>();
  const out: Row[] = [];
  for (const r of rows) {
    if (seen.has(r.user_id)) continue;
    seen.add(r.user_id);
    out.push(r);
  }
  return out;
}

const publicRow = (r: Row, rank: number) => ({
  rank,
  name: r.author_name,
  score: r.score,
  end: r.run_end,
  school: r.school,
  runYears: r.run_years,
});

export async function GET(request: NextRequest) {
  const board = request.nextUrl.searchParams.get("board") ?? "";
  if (!BOARD_RE.test(board)) return NextResponse.json({ error: "No such board." }, { status: 400 });
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("kosmopolis_runs")
      .select("user_id, author_name, score, run_end, school, run_years, created_at")
      .eq("board", board)
      .order("score", { ascending: false })
      .order("created_at", { ascending: true })
      .limit(500);
    if (error) throw error;
    const best = bestPerVisitor((data ?? []) as Row[]);
    const visitor = await resolveVisitor();
    const mine = visitor ? best.findIndex((r) => r.user_id === visitor.userId) : -1;
    return NextResponse.json({
      board,
      top: best.slice(0, TOP).map((r, i) => publicRow(r, i + 1)),
      players: best.length,
      you: mine >= 0 ? publicRow(best[mine], mine + 1) : null,
      authenticated: !!visitor,
    });
  } catch (err) {
    console.error("[api/playground/kosmopolis/runs GET]", err);
    return NextResponse.json({ error: "The board could not be read." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let body: { board?: unknown; school?: unknown; end?: unknown; score?: unknown; runYears?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const board = typeof body.board === "string" ? body.board : "";
  const school = typeof body.school === "string" ? body.school : "";
  const end = typeof body.end === "string" ? body.end : "";
  const score = typeof body.score === "number" && isFinite(body.score) ? Math.round(body.score) : NaN;
  const runYears = typeof body.runYears === "number" && isFinite(body.runYears) ? Math.round(body.runYears) : NaN;
  if (
    !BOARD_RE.test(board) ||
    !(SCHOOL_KEYS as string[]).includes(school) ||
    !(end in RUN_END_META) ||
    !(score >= 0 && score <= MAX_SCORE) ||
    !(runYears >= 0 && runYears <= RUN_YEARS)
  ) {
    return NextResponse.json({ error: "That run cannot be posted." }, { status: 400 });
  }
  // A daily board is open on its own day, and the day after (for visitors west of UTC).
  if (board.startsWith("daily:")) {
    const day = board.slice(6);
    const today = utcDate();
    const yesterday = utcDate(new Date(Date.now() - 86400000));
    if (day !== today && day !== yesterday) return NextResponse.json({ error: "That day's board has closed." }, { status: 400 });
  } else if (!(SCENARIO_KEYS as string[]).includes(board.slice(9))) {
    return NextResponse.json({ error: "No such scenario." }, { status: 400 });
  }

  const visitor = await resolveVisitor();
  if (!visitor) return NextResponse.json({ error: "Sign in to post your score.", authenticated: false }, { status: 401 });

  try {
    const supabase = createAdminClient();
    const daily = board.startsWith("daily:");
    let priorQuery = supabase.from("kosmopolis_runs").select("created_at").eq("user_id", visitor.userId).eq("board", board);
    if (!daily) priorQuery = priorQuery.gte("created_at", new Date(Date.now() - 86400000).toISOString());
    const { data: prior, error: priorErr } = await priorQuery;
    if (priorErr) throw priorErr;
    if (daily && (prior?.length ?? 0) > 0) {
      return NextResponse.json({ error: "You have already posted today's world. One score a day.", alreadyPosted: true }, { status: 409 });
    }
    if ((prior?.length ?? 0) >= POSTS_PER_DAY) {
      return NextResponse.json({ error: "That is enough runs on this board for one day." }, { status: 429 });
    }
    const { error } = await supabase.from("kosmopolis_runs").insert({
      user_id: visitor.userId,
      author_name: visitor.name,
      board,
      school,
      run_end: end,
      score,
      run_years: runYears,
    });
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/playground/kosmopolis/runs POST]", err);
    return NextResponse.json({ error: "The score could not be posted." }, { status: 500 });
  }
}
