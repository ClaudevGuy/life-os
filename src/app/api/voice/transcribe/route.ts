/**
 * Speech-to-text proxy to OpenAI Whisper. The browser posts recorded audio plus
 * an `Authorization: Bearer <openai-key>` header (the user's own key); we forward
 * it to OpenAI and return just the text. Audio is never stored.
 *
 * Default model is whisper-1 (broadly available). Set LIFEOS_TRANSCRIBE_MODEL to
 * gpt-4o-transcribe / gpt-4o-mini-transcribe for higher accuracy if your key has
 * access.
 */
const MODEL = process.env.LIFEOS_TRANSCRIBE_MODEL || "whisper-1";
const ENDPOINT = "https://api.openai.com/v1/audio/transcriptions";

export async function POST(req: Request) {
  const auth =
    req.headers.get("authorization") ?? req.headers.get("Authorization");
  if (!auth || !/^Bearer\s+\S/i.test(auth)) {
    return Response.json({ error: "no_key" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob) || file.size === 0) {
    return Response.json({ error: "no_audio" }, { status: 400 });
  }
  // Guard against runaway uploads (~25MB is OpenAI's limit anyway).
  if (file.size > 25 * 1024 * 1024) {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  const name =
    file instanceof File && file.name ? file.name : "audio.webm";
  const out = new FormData();
  out.append("file", file, name);
  out.append("model", MODEL);
  out.append("response_format", "json");
  out.append("temperature", "0");

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: auth },
      body: out,
    });
    if (!res.ok) {
      const detail = (await res.text().catch(() => "")).slice(0, 300);
      return Response.json(
        { error: "transcribe_failed", status: res.status, detail },
        { status: 502 },
      );
    }
    const j = (await res.json()) as { text?: string };
    return Response.json({ text: typeof j.text === "string" ? j.text : "" });
  } catch (e) {
    return Response.json(
      { error: "transcribe_failed", detail: e instanceof Error ? e.message : String(e) },
      { status: 502 },
    );
  }
}
