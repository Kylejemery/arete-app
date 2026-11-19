# Arete corpus MCP server

`POST /mcp` on the Railway backend exposes `rag_corpus` to any MCP client
(a Claude.ai custom connector, Claude Code, ChatGPT developer mode). The code
is in `routes/mcp.js`.

It is read-only. It offers three tools:

- `search_corpus` finds passages by meaning. It filters by author, work,
  language, and text_type, and returns 1 to 10 results.
- `get_passage` returns one passage by id, with up to 3 neighbors on each side.
- `list_sources` lists every author, work, language, and text_type, with the
  number of passages for each.

It uses one shared key and needs no OAuth.

A separate server, `POST /mcp/corpus` (`routes/corpus-mcp.js`, `ARETE_MCP_TOKEN`),
serves the Moltbook agent. It is unchanged and has its own token.

## Key

Set `ARETE_MCP_KEY` in the Railway service's Variables. Generate it with:

```
openssl rand -hex 32
```

Until the variable is set, `/mcp` answers 503 to every request.

The key is accepted two ways:

- in an `Authorization: Bearer <key>` header
- as `?key=<key>` on the URL

Use the header wherever the client allows it. A key in a URL can end up in
proxy and edge logs. This app's own request log records the path only.

## Connecting

Claude Code:

```
claude mcp add --transport http arete-corpus https://arete-app-production.up.railway.app/mcp --header "Authorization: Bearer <ARETE_MCP_KEY>"
```

Claude.ai (Settings, Connectors, Add custom connector), using the query-string form because the dialog only accepts a URL:

```
https://arete-app-production.up.railway.app/mcp?key=<ARETE_MCP_KEY>
```

ChatGPT developer mode takes the same URL.

## Behavior worth knowing

**Layers**

- With no `text_type`, `search_corpus` leaves out `synthesis` and
  `counterposition_summary`. This follows the corpus fence in
  `lib/corpus-fence.js`.
- Name either as the `text_type` to get it.
- Synthesis results carry a "not evidence" note and their
  `verification_status`.

**Language**

- `match_rag_corpus` matches language exactly, so a call searches one
  language. The default is `english`.
- Ask for `ancient_greek` or `french` by name.

**Deprecated rows** are never returned. The RPC filters them, and so does
every direct read.

**Rate limit:** 60 tool calls per rolling minute per key, held in memory.
Once the limit is reached, a call returns a tool-level error, not an HTTP
error.

**Timeouts:** a search restricted to a small layer with no author can pass the
8 second statement timeout on a cold cache. The tool retries once with the same
embedding before it reports a timeout.

## Verifying

```
ARETE_MCP_KEY=<key> node scripts/verify-mcp.js
```

The script checks the following, against production by default (pass a base
URL to test another server):

1. A call with no key gets 401.
2. Both key forms are accepted.
3. `initialize` returns `arete-corpus`.
4. `tools/list` returns three tools, all annotated read-only.
5. A Seneca search returns three passages.
6. `get_passage` with context 1 returns three chunks in order.
7. `list_sources` returns the table.
8. The rate limit returns a tool-level error.
9. `GET /mcp` returns 405.

The rate-limit check spends the minute's budget, so don't run the script twice
within a minute.

The `list_sources` total is not the same as `/health`'s `total_chunks`.
`/health` counts deprecated rows, and PostgREST caps its read at 1000 rows.
