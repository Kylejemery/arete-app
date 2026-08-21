import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

/**
 * A signed-in visitor's saved worlds — several, named, switchable.
 *
 * GET                → { authenticated, saves: [{id, name, updated_at}] }  (list, no state)
 * GET   ?id=<uuid>   → { save: {id, name, state} | null }                  (load one)
 * POST  { name, state }        → { id, name }                              (create)
 * PUT   { id, name?, state? }  → { ok }                                    (rename / save)
 * DELETE ?id=<uuid>            → { ok }                                    (forget)
 *
 * Everything runs through the caller's cookie session, so row-level security is
 * the guard: a visitor only ever touches their own rows in kosmopolis_saves.
 * Anonymous callers get { authenticated: false } and keep their worlds in
 * localStorage instead.
 */

export const dynamic = "force-dynamic";

const MAX_STATE_CHARS = 400_000;

function cleanName(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().slice(0, 80);
  return t.length ? t : null;
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ authenticated: false, saves: [] });

    if (id) {
      const { data, error } = await supabase
        .from("kosmopolis_saves")
        .select("id, name, state")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return NextResponse.json({ authenticated: true, save: data ?? null });
    }

    const { data, error } = await supabase
      .from("kosmopolis_saves")
      .select("id, name, updated_at")
      .order("updated_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ authenticated: true, saves: data ?? [] });
  } catch (err) {
    console.error("[api/playground/kosmopolis/saves GET]", err);
    return NextResponse.json({ authenticated: false, saves: [], error: "Could not load your worlds." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  let payload: { name?: unknown; state?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const name = cleanName(payload.name) ?? "A world";
  const state = payload.state;
  if (!state || typeof state !== "object" || Array.isArray(state)) {
    return NextResponse.json({ error: "A world state object is required." }, { status: 400 });
  }
  if (JSON.stringify(state).length > MAX_STATE_CHARS) {
    return NextResponse.json({ error: "World is too large to save." }, { status: 413 });
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to save worlds to your account." }, { status: 401 });

    const { data, error } = await supabase
      .from("kosmopolis_saves")
      .insert({ user_id: user.id, name, state })
      .select("id, name")
      .single();
    if (error) throw error;
    return NextResponse.json({ id: data.id, name: data.name });
  } catch (err) {
    console.error("[api/playground/kosmopolis/saves POST]", err);
    return NextResponse.json({ error: "Could not create the world." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  let payload: { id?: unknown; name?: unknown; state?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const id = typeof payload.id === "string" ? payload.id : "";
  if (!id) return NextResponse.json({ error: "A world id is required." }, { status: 400 });

  const patch: { name?: string; state?: unknown; updated_at: string } = { updated_at: new Date().toISOString() };
  const name = cleanName(payload.name);
  if (name) patch.name = name;
  if (payload.state !== undefined) {
    if (!payload.state || typeof payload.state !== "object" || Array.isArray(payload.state)) {
      return NextResponse.json({ error: "World state must be an object." }, { status: 400 });
    }
    if (JSON.stringify(payload.state).length > MAX_STATE_CHARS) {
      return NextResponse.json({ error: "World is too large to save." }, { status: 413 });
    }
    patch.state = payload.state;
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Sign in to save worlds." }, { status: 401 });

    const { error } = await supabase.from("kosmopolis_saves").update(patch).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/playground/kosmopolis/saves PUT]", err);
    return NextResponse.json({ error: "Could not save the world." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "A world id is required." }, { status: 400 });
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

    const { error } = await supabase.from("kosmopolis_saves").delete().eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[api/playground/kosmopolis/saves DELETE]", err);
    return NextResponse.json({ error: "Could not forget the world." }, { status: 500 });
  }
}
