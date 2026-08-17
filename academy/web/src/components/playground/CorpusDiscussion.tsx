"use client";

import { useEffect, useMemo, useRef, useState } from "react";

/**
 * The corpus discussion board, reused across the playground.
 *
 * A visitor posts a comment — optionally taking a stance (agree / disagree /
 * unsure) toward whatever the page is arguing — and the corpus answers it.
 * Threads are keyed by `threadKey`; the `context` string is sent to the server
 * so the tradition can frame its reply against what the reader is responding to.
 *
 * Styling lives in playground.css under the `.cd-` prefix.
 */

type Comment = {
  id: string;
  thread_key: string;
  author_role: "visitor" | "corpus";
  author_name: string | null;
  stance: "agree" | "disagree" | "unsure" | null;
  body: string;
  parent_id: string | null;
  sources: unknown;
  created_at: string;
};

type Stance = "agree" | "disagree" | "unsure";

const STANCE_META: Record<Stance, { label: string; short: string }> = {
  agree: { label: "I agree", short: "agrees" },
  disagree: { label: "I disagree", short: "disagrees" },
  unsure: { label: "I'm unsure", short: "unsure" },
};

export default function CorpusDiscussion({
  threadKey,
  context,
  heading = "Take it up with the corpus",
  intro,
  placeholder = "Say where you land — and why. The corpus will answer.",
}: {
  threadKey: string;
  context: string;
  heading?: string;
  intro?: string;
  placeholder?: string;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [stance, setStance] = useState<Stance | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/playground/comments?thread=${encodeURIComponent(threadKey)}`
        );
        const data = await res.json();
        if (alive && Array.isArray(data.comments)) setComments(data.comments);
      } catch {
        /* leave the board empty; the composer still works */
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [threadKey]);

  // Pair each visitor comment with its corpus reply (parent_id === comment.id).
  const threads = useMemo(() => {
    const replies = new Map<string, Comment>();
    for (const c of comments) {
      if (c.author_role === "corpus" && c.parent_id) replies.set(c.parent_id, c);
    }
    return comments
      .filter((c) => c.author_role === "visitor")
      .map((c) => ({ comment: c, reply: replies.get(c.id) ?? null }));
  }, [comments]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/playground/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread: threadKey,
          context,
          stance,
          name: name.trim() || undefined,
          body: trimmed,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong. Try again.");
        return;
      }
      setComments((prev) => {
        const next = [...prev];
        if (data.comment) next.push(data.comment);
        if (data.reply) next.push(data.reply);
        return next;
      });
      setBody("");
      setStance(null);
      // Let the new exchange settle into view.
      requestAnimationFrame(() => {
        feedRef.current?.querySelector(".cd-thread:last-child")?.scrollIntoView({
          behavior: "smooth",
          block: "nearest",
        });
      });
    } catch {
      setError("The corpus could not be reached. Your comment was not saved.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="cd" aria-label="Discussion with the corpus">
      <div className="cd-head">
        <span className="cd-mark" aria-hidden="true" />
        <h2>{heading}</h2>
      </div>
      {intro ? <p className="cd-intro">{intro}</p> : null}

      <div className="cd-feed" ref={feedRef}>
        {loading ? (
          <p className="cd-empty">Opening the board…</p>
        ) : threads.length === 0 ? (
          <p className="cd-empty">
            No one has spoken yet. Be the first to put a view to the corpus.
          </p>
        ) : (
          threads.map(({ comment, reply }) => (
            <div className="cd-thread" key={comment.id}>
              <article className="cd-msg cd-visitor">
                <header className="cd-byline">
                  <span className="cd-who">{comment.author_name || "A reader"}</span>
                  {comment.stance ? (
                    <span className={`cd-stance cd-stance-${comment.stance}`}>
                      {STANCE_META[comment.stance].short}
                    </span>
                  ) : null}
                </header>
                <p className="cd-body">{comment.body}</p>
              </article>

              {reply ? (
                <article className="cd-msg cd-corpus">
                  <header className="cd-byline">
                    <span className="cd-dot" aria-hidden="true" />
                    <span className="cd-who">The Corpus</span>
                  </header>
                  <div className="cd-body cd-corpus-body">
                    {reply.body.split(/\n{2,}/).map((para, i) => (
                      <p key={i}>{para}</p>
                    ))}
                  </div>
                </article>
              ) : (
                <p className="cd-silent">The corpus was silent on this one.</p>
              )}
            </div>
          ))
        )}
      </div>

      <form className="cd-form" onSubmit={submit}>
        <div className="cd-stances" role="group" aria-label="Your stance">
          {(Object.keys(STANCE_META) as Stance[]).map((s) => (
            <button
              type="button"
              key={s}
              className={`cd-chip${stance === s ? " cd-chip-on" : ""}`}
              aria-pressed={stance === s}
              onClick={() => setStance((cur) => (cur === s ? null : s))}
            >
              {STANCE_META[s].label}
            </button>
          ))}
        </div>

        <textarea
          className="cd-text"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={placeholder}
          rows={4}
          maxLength={4000}
        />

        <div className="cd-row">
          <input
            className="cd-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            maxLength={80}
          />
          <button className="cd-submit" type="submit" disabled={submitting || !body.trim()}>
            {submitting ? "The corpus is considering…" : "Post & ask the corpus"}
          </button>
        </div>

        {error ? <p className="cd-error">{error}</p> : null}
      </form>
    </section>
  );
}
