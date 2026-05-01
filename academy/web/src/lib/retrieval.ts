const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export interface RetrievedChunk {
  source_title: string;
  content: string;
  similarity: number;
}

export async function retrieveRelevantPassages(
  query: string,
  courseId: string,
  k = 3
): Promise<RetrievedChunk[]> {
  try {
    const res = await fetch(`${API_BASE}/api/academy/retrieve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, courseId, k }),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.chunks ?? [];
  } catch {
    return [];
  }
}

export function formatRagContext(chunks: RetrievedChunk[]): string {
  if (chunks.length === 0) return '';
  return (
    `\n\n[RELEVANT SOURCE TEXTS]\nThe following passages from the assigned corpus are directly relevant to the current seminar exchange. Draw on them to ground your questioning in the actual text:\n\n` +
    chunks.map((c, i) => `${i + 1}. (${c.source_title})\n${c.content}`).join('\n\n') +
    `\n[END SOURCE TEXTS]`
  );
}
