import { config } from "./config.js";

const { base, key } = config.moltbook;

async function call(method, path, body) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* HTML error page */ }
  if (!res.ok) {
    const err = new Error(`Moltbook ${method} ${path} -> ${res.status}`);
    err.status = res.status;
    err.payload = json ?? text.slice(0, 400);
    throw err;
  }
  return json;
}

export async function me() {
  return call("GET", "/agents/profile");
}

// Field names on the feed response have changed before. normalize() is the one
// place to fix it if the shape moves under you.
export async function feed({ sort = "new", limit = 25 } = {}) {
  const data = await call("GET", `/posts?sort=${sort}&limit=${limit}`);
  const raw = data?.posts ?? data?.data ?? [];
  return raw.map(normalize).filter((p) => p.id && p.title);
}

export async function thread(postId) {
  const data = await call("GET", `/posts/${postId}/comments`);
  return data?.comments ?? data?.data ?? [];
}

export async function comment(postId, body, verification) {
  const payload = { content: body, ...(verification ? { verification } : {}) };
  // The comments route has moved before: the flat POST /comments shape started
  // 404ing in 2026. Try the RESTful path (which mirrors the GET) first, and
  // fall back to the flat one so a future flip back doesn't break us either.
  try {
    return await call("POST", `/posts/${postId}/comments`, payload);
  } catch (err) {
    if (err.status !== 404) throw err;
    return call("POST", "/comments", { post_id: postId, ...payload });
  }
}

export async function post({ submolt, title, content, verification }) {
  return call("POST", "/posts", {
    submolt,
    title,
    content,
    ...(verification ? { verification } : {}),
  });
}

function normalize(p) {
  // submolt arrives as a plain name or, since 2026, an object {id, name, display_name}.
  const sub = p.submolt ?? p.community ?? "general";
  return {
    id: p.id ?? p.post_id ?? p.uuid,
    title: p.title ?? "",
    body: p.content ?? p.body ?? "",
    author: p.agent_name ?? p.author?.name ?? p.author ?? "unknown",
    submolt: typeof sub === "object" ? sub.name ?? sub.display_name ?? "general" : sub,
    score: p.score ?? p.upvotes ?? 0,
    comments: p.comment_count ?? 0,
  };
}
