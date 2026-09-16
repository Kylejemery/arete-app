// The Garden: exhibits, the interactive pieces.
//
// Direct supabase-js access. Every rule about what may be read (gallery
// rows are public, workshop rows are unlisted and reachable only by exact
// slug) is enforced by RLS and by the exhibit_by_slug() function in
// supabase/migrations/20260916140000_exhibits.sql. This module only shapes
// the calls, and enforces the one rule the database cannot: that nothing
// user-derived reaches an exhibit page.
//
// Mirrors the mobile app at lib/exhibits.ts. Keep the two in step.
import { supabase } from './supabase';

// The name of the room, in one place. Renaming the Garden means editing
// this constant and its mirror, and nothing else.
export const GARDEN_TITLE = 'The Garden';
export const GARDEN_SUBTITLE = 'Interactive Stoic ideas to explore';

export type Branch = 'logic' | 'physics' | 'ethics';
export type ExhibitKind = 'native' | 'web_embed' | 'external';
export type ExhibitStatus = 'workshop' | 'gallery';

export interface Exhibit {
  id: string;
  slug: string;
  title: string;
  summary: string;
  branch: Branch;
  thinkers: string[];
  concepts: string[];
  source_citation: string | null;
  source_passage: string | null;
  academy_path: string | null;
  agora_prompt: string | null;
  kind: ExhibitKind;
  component_key: string | null;
  embed_url: string | null;
  status: ExhibitStatus;
  sort_order: number;
}

// The three branches, in the order the Stoics taught them, with the image
// they used for each: philosophy is a fertile field, logic the fence round
// it, ethics the fruit, physics the soil and the trees.
// Diogenes Laertius, Lives, Life of Zeno XXXIII (tr. Yonge, 1853).
export const BRANCHES: readonly Branch[] = ['logic', 'physics', 'ethics'] as const;

export const BRANCH_LABEL: Record<Branch, string> = {
  logic: 'Logic',
  physics: 'Physics',
  ethics: 'Ethics',
};

export const BRANCH_GLOSS: Record<Branch, string> = {
  logic: 'The fence round the field',
  physics: 'The soil and the trees',
  ethics: 'The crop',
};

// ── the privacy fence ────────────────────────────────────────────────────
//
// Exhibits are a public surface, and no exhibit may display user-derived
// content. Two things hold that line, neither of them a convention:
//
//   1. The table has no user column at all, and no write path but the
//      service role (see the migration header).
//   2. Every row entering an exhibit screen passes assertNoUserContent()
//      below, which reads an explicit allowlist of keys and throws on
//      anything else. So widening the select to join profiles, or adding
//      a comment count, or embedding an author name, fails loudly at the
//      boundary instead of quietly rendering.
//
// A discussion board is the one exemption, and it is not an exemption to
// this rule: it never travels on the exhibit row. It is passed to the
// template as its own `discussion` slot, rendered below the exhibit frame
// and clearly outside it.

// One literal, not a concatenation: supabase-js reads this string at the
// type level, and a built-up string defeats it.
export const EXHIBIT_COLUMNS = 'id, slug, title, summary, branch, thinkers, concepts, source_citation, source_passage, academy_path, agora_prompt, kind, component_key, embed_url, status, sort_order';

const ALLOWED_KEYS: readonly string[] = [
  'id', 'slug', 'title', 'summary', 'branch', 'thinkers', 'concepts',
  'source_citation', 'source_passage', 'academy_path', 'agora_prompt',
  'kind', 'component_key', 'embed_url', 'status', 'sort_order',
];

/**
 * Throws unless the row carries exactly the exhibit's own fields. The
 * failure this exists to catch is a future select that reaches past the
 * exhibits table and drags a user's name, handle or words onto a public
 * page. Called on every row before it is handed to a screen.
 */
export function assertNoUserContent(row: Record<string, unknown>): Exhibit {
  const stray = Object.keys(row).filter(k => !ALLOWED_KEYS.includes(k));
  if (stray.length) {
    throw new Error(
      `Exhibit row carries fields that are not the exhibit's own: ${stray.join(', ')}. ` +
      'Exhibits are a public surface and may not display user-derived content. ' +
      'If this is a discussion board, pass it to the template as its discussion slot instead.',
    );
  }
  return row as unknown as Exhibit;
}

// ── reads ────────────────────────────────────────────────────────────────

/** Every exhibit in the gallery, in sort order. The Garden index is this. */
export async function listGalleryExhibits(): Promise<Exhibit[]> {
  const { data, error } = await supabase
    .from('exhibits')
    .select(EXHIBIT_COLUMNS)
    .eq('status', 'gallery')
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true });
  if (error) throw error;
  // The project has no generated Database types, so supabase-js cannot infer
  // the row shape from the column list. assertNoUserContent is what actually
  // checks it, one row at a time.
  const rows = (data ?? []) as unknown as Record<string, unknown>[];
  return rows.map(assertNoUserContent);
}

/**
 * One exhibit by slug, whatever its status. Goes through exhibit_by_slug()
 * so a workshop exhibit is reachable at a known link for testing while
 * still being absent from every list.
 */
export async function getExhibit(slug: string): Promise<Exhibit | null> {
  const { data, error } = await supabase.rpc('exhibit_by_slug', { p_slug: slug });
  if (error) throw error;
  const row = (data ?? [])[0];
  if (!row) return null;
  // The RPC returns the whole row, created_at and updated_at included;
  // drop them so the shape the guard sees is the shape the screens use.
  const { created_at: _c, updated_at: _u, ...rest } = row as Record<string, unknown>;
  return assertNoUserContent(rest);
}

// ── shaping for the index ────────────────────────────────────────────────

/** The exhibits of one branch, preserving the incoming order. */
export function byBranch(exhibits: Exhibit[], branch: Branch): Exhibit[] {
  return exhibits.filter(e => e.branch === branch);
}

/** Every thinker named by any exhibit, alphabetical, for the index filter. */
export function thinkersOf(exhibits: Exhibit[]): string[] {
  const all = new Set<string>();
  for (const e of exhibits) for (const t of e.thinkers) all.add(t);
  return [...all].sort((a, b) => a.localeCompare(b));
}
