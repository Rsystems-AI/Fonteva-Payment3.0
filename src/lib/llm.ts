// Streaming LLM adapter.
//
// Modes:
//   - openai (default when OPENAI_API_KEY is set): real OpenAI Chat Completions
//     with streaming. Supports OPENAI_BASE_URL for company proxies.
//   - mock (fallback): deterministic reasoner that still emits tokens
//     progressively so the UI's streaming path always works.
//
// The agents interact with this module via reason() (single call, structured)
// and streamReason() (token-by-token, structured summary + reasoning array).

export interface ChatMsg {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ReasoningRequest {
  agent: string;
  task: string;
  context: Record<string, unknown>;
  options?: Array<{ id: string; label: string; description?: string }>;
  systemPrompt?: string;
}

export interface ReasoningResponse {
  summary: string;
  reasoning: string[];
  chosenOptionId?: string;
  confidence: number;
  narrative?: string; // free-form paragraph the agent wants to display
}

export interface LLMChunk {
  kind: "reasoning" | "summary" | "narrative";
  text: string;
}

export interface LLM {
  reason(req: ReasoningRequest): Promise<ReasoningResponse>;
  streamReason?(req: ReasoningRequest, onChunk: (c: LLMChunk) => void): Promise<ReasoningResponse>;
  streamChat?(messages: ChatMsg[], onDelta: (text: string) => void, opts?: { system?: string }): Promise<string>;
  info(): { provider: string; model: string; live: boolean };
}

// ============ Utility ============

function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function readinessConfidence(ctx: Record<string, unknown>): number {
  const missingPerm = (ctx.missingPermissions as string[] | undefined)?.length ?? 0;
  const outdated = (ctx.outdatedLayouts as string[] | undefined)?.length ?? 0;
  const missingApps = (ctx.missingConnectedApps as string[] | undefined)?.length ?? 0;
  const missingEvents = (ctx.missingWebhookEvents as string[] | undefined)?.length ?? 0;
  const base = 0.98;
  const penalty = missingPerm * 0.09 + outdated * 0.015 + missingApps * 0.12 + missingEvents * 0.01;
  return Math.max(0.55, Math.min(0.99, base - penalty));
}

function selectRecommendation(options: ReasoningRequest["options"], _ctx: Record<string, unknown>): string | undefined {
  if (!options || options.length === 0) return undefined;
  const auto = options.find((o) => /auto|apply|proceed|approve|signoff|send|simulate/i.test(o.id + o.label));
  return (auto ?? options[0]).id;
}

async function paceString(s: string, onChunk: (text: string) => void, minMs = 8, maxMs = 24): Promise<void> {
  // Emit in small groups of 1-3 tokens to look like a language-model stream.
  const parts = s.match(/(\s+|\S+)/g) ?? [s];
  let buf = "";
  for (const part of parts) {
    buf += part;
    if (buf.length > 4 || part.match(/\s/)) {
      onChunk(buf);
      buf = "";
      await new Promise((r) => setTimeout(r, minMs + Math.random() * (maxMs - minMs)));
    }
  }
  if (buf) onChunk(buf);
}

// ============ MockLLM ============

class MockLLM implements LLM {
  info() { return { provider: "mock", model: "MockLLM v1", live: false }; }

  async reason(req: ReasoningRequest): Promise<ReasoningResponse> {
    return this.compute(req);
  }

  async streamReason(req: ReasoningRequest, onChunk: (c: LLMChunk) => void): Promise<ReasoningResponse> {
    const out = this.compute(req);
    for (const bullet of out.reasoning) {
      await paceString(bullet, (t) => onChunk({ kind: "reasoning", text: t }));
      // Small pause between bullets so the UI can render them as separate lines.
      await new Promise((r) => setTimeout(r, 120));
      onChunk({ kind: "reasoning", text: "\n" });
    }
    if (out.narrative) await paceString(out.narrative, (t) => onChunk({ kind: "narrative", text: t }));
    await paceString(out.summary, (t) => onChunk({ kind: "summary", text: t }));
    return out;
  }

  async streamChat(messages: ChatMsg[], onDelta: (t: string) => void): Promise<string> {
    // Simple deterministic answer that echoes the most recent question + context.
    const last = messages[messages.length - 1]?.content ?? "";
    const answer =
      "I'm running on the deterministic fallback (no API key configured). " +
      "Once you set OPENAI_API_KEY in your .env, this Copilot will stream real GPT-4o Mini answers over your live upgrade data. " +
      "Your question was: " + last.slice(0, 240);
    await paceString(answer, onDelta, 6, 18);
    return answer;
  }

  private compute(req: ReasoningRequest): ReasoningResponse {
    const seed = hash(req.agent + ":" + req.task + ":" + JSON.stringify(req.context));
    const openers = [
      "Reviewing the evidence gathered so far",
      "Cross-checking the observed state against the target v3 configuration",
      "Weighing the confidence signals from prior stages",
      "Comparing the current metadata footprint against the target package",
      "Running the risk model over collected signals",
    ];
    const conns = ["Given that", "Considering", "Since", "Because", "Taking into account that"];
    const opener = openers[seed % openers.length];
    const conn = conns[(seed >> 3) % conns.length];
    const bullets: string[] = [];
    bullets.push(`${opener} for the ${req.task.toLowerCase()}.`);
    for (const [k, v] of Object.entries(req.context)) {
      if (v === null || v === undefined) continue;
      if (Array.isArray(v)) {
        if (v.length === 0) bullets.push(`${conn} the ${k} check is clean, this signal is positive.`);
        else bullets.push(`${conn} the ${k} contains ${v.length} item(s) (${v.slice(0, 3).join(", ")}${v.length > 3 ? ", …" : ""}), it must be addressed.`);
      } else if (typeof v === "boolean") {
        bullets.push(`${conn} ${k} is ${v ? "true" : "false"}, this ${v ? "reinforces" : "reduces"} confidence in proceeding.`);
      } else if (typeof v === "number") {
        bullets.push(`${conn} ${k} = ${v}, factored into the risk model.`);
      } else {
        bullets.push(`${conn} ${k} = "${String(v).slice(0, 60)}", noted.`);
      }
    }
    const confidence = readinessConfidence(req.context);
    const chosen = selectRecommendation(req.options, req.context);
    const summary = req.options && chosen
      ? `Recommending "${req.options.find((o) => o.id === chosen)?.label}" with ${(confidence * 100).toFixed(0)}% confidence.`
      : `Reasoning complete; confidence ${(confidence * 100).toFixed(0)}%.`;
    const narrative = `Deterministic reasoner used because no LLM API key was provided. Reasoning is derived from the actual evidence collected by the agent — the same fields a real LLM would receive.`;
    return { summary, reasoning: bullets, chosenOptionId: chosen, confidence, narrative };
  }
}

// ============ OpenAI streaming adapter ============

class OpenAILLM implements LLM {
  constructor(private key: string, private model: string, private baseUrl: string) {}

  info() { return { provider: "openai", model: this.model, live: true }; }

  private buildMessages(req: ReasoningRequest): ChatMsg[] {
    const system = req.systemPrompt ?? `You are a senior specialist agent in the Fonteva Payments 3.0 upgrade pipeline. You reason carefully about Salesforce Metadata API state (page layouts, scheduled jobs, permission sets, custom metadata) and Stripe integration state (webhook events, rates). Always ground your reasoning in the evidence provided. Output STRICT JSON only, in this exact shape:
{
  "summary": "one sentence, ≤ 25 words",
  "reasoning": ["bullet 1", "bullet 2", "bullet 3", "bullet 4"],
  "chosenOptionId": "one of the provided option ids or null",
  "confidence": 0.0..1.0,
  "narrative": "2-3 sentence natural-language explanation an engineer can paste into a report"
}
Do not include markdown, code fences, or any text outside the JSON object.`;
    const user = JSON.stringify({
      agent: req.agent,
      task: req.task,
      context: req.context,
      options: req.options ?? null,
    }, null, 2);
    return [
      { role: "system", content: system },
      { role: "user", content: user },
    ];
  }

  async reason(req: ReasoningRequest): Promise<ReasoningResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: this.buildMessages(req),
        temperature: 0.4,
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const j = await res.json() as { choices: Array<{ message: { content: string } }> };
    return this.parse(j.choices[0].message.content);
  }

  async streamReason(req: ReasoningRequest, onChunk: (c: LLMChunk) => void): Promise<ReasoningResponse> {
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({
        model: this.model,
        response_format: { type: "json_object" },
        messages: this.buildMessages(req),
        temperature: 0.4,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) throw new Error(`OpenAI stream ${res.status}`);
    let full = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    // Track parse state so we can emit only reasoning/narrative fragments as they stream.
    let reasoningBuffer = "";
    let inReasoning = false;
    let inNarrative = false;
    let narrativeBuffer = "";
    let seenReasoningStart = false;
    let seenNarrativeStart = false;
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const raw of parts) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const evt = JSON.parse(data) as { choices: Array<{ delta: { content?: string } }> };
          const chunk = evt.choices[0]?.delta?.content ?? "";
          if (!chunk) continue;
          full += chunk;
          // Progressively emit reasoning and narrative sections as they appear.
          if (!seenReasoningStart) {
            const idx = full.indexOf("\"reasoning\"");
            if (idx >= 0) {
              seenReasoningStart = true;
              // Skip forward past the array start.
              const arrStart = full.indexOf("[", idx);
              if (arrStart >= 0) {
                inReasoning = true;
                reasoningBuffer = full.slice(arrStart + 1);
              }
            }
          } else if (inReasoning) {
            reasoningBuffer += chunk;
            // Emit anything between quote pairs progressively; naive but effective.
            // Look for end of the reasoning array.
            const endIdx = reasoningBuffer.indexOf("]");
            const emitPart = endIdx >= 0 ? reasoningBuffer.slice(0, endIdx) : reasoningBuffer;
            // Extract new characters since last emit and pass through as reasoning text.
            onChunk({ kind: "reasoning", text: chunk });
            if (endIdx >= 0) {
              inReasoning = false;
            }
          }
          if (!seenNarrativeStart) {
            const nidx = full.indexOf("\"narrative\"");
            if (nidx >= 0) {
              seenNarrativeStart = true;
              const colon = full.indexOf(":", nidx);
              const quote = full.indexOf("\"", colon + 1);
              if (quote >= 0) {
                inNarrative = true;
                narrativeBuffer = full.slice(quote + 1);
              }
            }
          } else if (inNarrative) {
            narrativeBuffer += chunk;
            onChunk({ kind: "narrative", text: chunk });
            if (narrativeBuffer.includes("\"")) {
              inNarrative = false;
            }
          }
        } catch { /* ignore partial */ }
      }
    }
    return this.parse(full);
  }

  async streamChat(messages: ChatMsg[], onDelta: (text: string) => void, opts?: { system?: string }): Promise<string> {
    const msgs: ChatMsg[] = [];
    if (opts?.system) msgs.push({ role: "system", content: opts.system });
    msgs.push(...messages);
    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.key}` },
      body: JSON.stringify({ model: this.model, messages: msgs, stream: true, temperature: 0.5 }),
    });
    if (!res.ok || !res.body) throw new Error(`OpenAI chat ${res.status}`);
    let full = "";
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split("\n\n");
      buffer = parts.pop() ?? "";
      for (const raw of parts) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (data === "[DONE]") continue;
        try {
          const evt = JSON.parse(data) as { choices: Array<{ delta: { content?: string } }> };
          const chunk = evt.choices[0]?.delta?.content ?? "";
          if (chunk) {
            full += chunk;
            onDelta(chunk);
          }
        } catch { /* ignore */ }
      }
    }
    return full;
  }

  private parse(content: string): ReasoningResponse {
    // Try to extract the JSON object even if the model added stray whitespace.
    const start = content.indexOf("{");
    const end = content.lastIndexOf("}");
    const jsonSlice = start >= 0 && end > start ? content.slice(start, end + 1) : content;
    try {
      const parsed = JSON.parse(jsonSlice) as Partial<ReasoningResponse>;
      return {
        summary: parsed.summary ?? "",
        reasoning: Array.isArray(parsed.reasoning) ? parsed.reasoning : [],
        chosenOptionId: parsed.chosenOptionId ?? undefined,
        confidence: typeof parsed.confidence === "number" ? Math.max(0, Math.min(1, parsed.confidence)) : 0.8,
        narrative: parsed.narrative,
      };
    } catch {
      return { summary: content.slice(0, 200), reasoning: [], confidence: 0.6 };
    }
  }
}

// ============ Singleton ============

declare global {
  // eslint-disable-next-line no-var
  var __fontevaLlm: LLM | undefined;
}

export function getLLM(): LLM {
  if (globalThis.__fontevaLlm) return globalThis.__fontevaLlm;
  const key = process.env.OPENAI_API_KEY;
  const provider = (process.env.LLM_PROVIDER ?? (key ? "openai" : "mock")).toLowerCase();
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  if (provider === "openai" && key) {
    globalThis.__fontevaLlm = new OpenAILLM(key, model, baseUrl);
  } else {
    globalThis.__fontevaLlm = new MockLLM();
  }
  return globalThis.__fontevaLlm;
}
