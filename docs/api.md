# Life OS REST API

All `/api/v1/*` endpoints use **bearer-token auth**. Mint a token at `/settings/keys`.

```http
Authorization: Bearer lifeos_xxx
```

Session-cookie auth is **not** accepted here — it's the integration surface. Tokens grant the same access as the owning user account.

---

## `POST /api/v1/capture`

Capture a new item. Idempotent by `(userId, sourceUrl)` — repeat calls with the same URL return the existing item with `duplicate: true`.

### Body

```json
{
  "kind": "bookmark",       // bookmark | note | decision | person | journal | voice | task | idea
  "title": "optional",
  "body": "optional markdown",
  "sourceUrl": "https://...",
  "rawText": "full extracted content, used for embedding",
  "metadata": { "why": "research" }
}
```

### Response

```json
{
  "item": { "id": "abc123", "kind": "bookmark", "status": "inbox", "...": "..." },
  "duplicate": false
}
```

Enrichment (AI summary, tags, embedding) runs asynchronously after the response is sent. Poll `GET /api/v1/items/:id` to see it land.

---

## `GET /api/v1/items?kind=&status=&limit=`

List items. Default order: `capturedAt desc`. Max `limit=200`.

```json
{
  "items": [ /* full item rows */ ]
}
```

---

## `GET /api/v1/items/:id`

Fetch a single item.

## `PATCH /api/v1/items/:id`

Update a subset of fields:

```json
{ "title": "...", "body": "...", "status": "archived", "isPinned": true, "metadata": { } }
```

## `DELETE /api/v1/items/:id`

Hard-delete. (Soft-delete is phase 2.)

---

## `POST /api/v1/items/:id/enrich`

Force re-enrichment. Useful after editing body/rawText.

---

## `GET /api/v1/search?q=&limit=`

Hybrid search: pgvector cosine similarity (if embeddings exist) + ILIKE on title/summary/body/topic/keyPoints.

```json
{
  "hits": [
    {
      "id": "abc",
      "kind": "bookmark",
      "title": "...",
      "summary": "...",
      "topic": "agent-ux",
      "sourceUrl": "...",
      "capturedAt": "2026-05-18T...",
      "score": 1.74
    }
  ]
}
```

---

## Errors

```json
{ "error": "unauthorized" }
{ "error": "invalid_body", "issues": [ /* zod issues */ ] }
{ "error": "not_found" }
```

---

## Roadmap (not yet implemented)

- `POST /api/v1/bundles` — render a markdown context bundle from a query
- `POST /api/v1/voice` — accept audio, transcribe, capture as `kind=voice`
- MCP server (`life-os-mcp` package) wrapping these endpoints as tools
- Webhooks for capture events
