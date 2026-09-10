import type { Sentiment } from "../../lib/types";

export interface AiResult {
  text: string;
  provider: "groq" | "gemini" | "openrouter" | "template";
}

const HUMANIZE_PROMPT = `Rewrite this message so it reads like a real person wrote it:
- vary sentence length, remove generic AI phrasing
- no corporate buzzwords, no "I hope this finds you well"
- keep it under 80 words, one clear CTA
Return only the rewritten message.`;

export async function generateMessage(prompt: string): Promise<AiResult> {
  const providers: Array<{ name: AiResult["provider"]; call: () => Promise<string> }> = [
    { name: "openrouter", call: () => callOpenRouter(prompt) },
    { name: "groq", call: () => callGroq(prompt) },
    { name: "gemini", call: () => callGemini(prompt) },
  ];

  for (const provider of providers) {
    try {
      const text = await provider.call();
      if (text.trim()) return { text: text.trim(), provider: provider.name };
    } catch (err) {
      console.warn(`[AI Fallback] Provider ${provider.name} failed: ${err instanceof Error ? err.message : String(err)}`);
      continue;
    }
  }

  return { text: templateMessage(prompt), provider: "template" };
}

export async function humanize(draft: string): Promise<AiResult> {
  const result = await generateMessage(`${HUMANIZE_PROMPT}\n\n${draft}`);
  return { ...result, text: stripAiTells(result.text) };
}

export async function classifyWithAi(replyText: string): Promise<Sentiment | null> {
  const prompt = `Classify this outreach reply as exactly one of: positive, neutral, negative, unsubscribe.\nReply:\n${replyText}`;
  try {
    const result = await generateMessage(prompt);
    const value = result.text.toLowerCase();
    if (value.includes("unsubscribe")) return "unsubscribe";
    if (value.includes("positive")) return "positive";
    if (value.includes("negative")) return "negative";
    if (value.includes("neutral")) return "neutral";
  } catch {
    return null;
  }
  return null;
}

function stripAiTells(text: string) {
  return text
    .replace(/i hope this (email |message )?finds you well[,!.]?\s*/gi, "")
    .replace(/\b(synergy|leverage|circle back|touch base|kindly)\b/gi, "")
    .trim();
}

function templateMessage(prompt: string) {
  if (prompt.includes("JSON Schema:") && prompt.includes("Agency name")) {
    return `{
  "name": "Demo Agency (Fallback Mode)",
  "description": "A demo agency profile since AI providers are currently unavailable.",
  "services": ["Web Development", "Digital Marketing"],
  "searchQueries": [
    { "service": "Web Development", "query": "\\\"looking for web developer\\\" startup" },
    { "service": "Digital Marketing", "query": "\\\"need digital marketing\\\" ecommerce" }
  ]
}`;
  }

  if (prompt.includes("Classify this outreach reply")) {
    return "neutral";
  }

  const name = /Name:\s*(.+)/i.exec(prompt)?.[1]?.trim() ?? "there";
  const company = /Company:\s*(.+)/i.exec(prompt)?.[1]?.trim() ?? "your team";
  const service = /Service:\s*(.+)/i.exec(prompt)?.[1]?.trim() ?? "product work";
  const first = name.split(" ")[0];
  return `Hi ${first} — saw ${company} and thought a tighter ${service} setup might save you some grind. We build this for small teams without the agency theatre. Open to a 20-min look this week?`;
}

async function callGroq(prompt: string) {
  const key = process.env.GROQ_API_KEY;
  if (!key) throw new Error("missing groq key");
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL ?? "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: 240,
    }),
  });
  if (!response.ok) throw new Error(`groq ${response.status}`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("empty groq");
  return text;
}

async function callGemini(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("missing gemini key");
  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );
  if (!response.ok) throw new Error(`gemini ${response.status}`);
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("empty gemini");
  return text;
}

async function callOpenRouter(prompt: string) {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) throw new Error("missing openrouter key");
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENROUTER_MODEL ?? "meta-llama/llama-3.1-8b-instruct:free",
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`openrouter ${response.status}`);
  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("empty openrouter");
  return text;
}

export function configuredAiProviders() {
  return {
    groq: Boolean(process.env.GROQ_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
  };
}
