import type { Sentiment } from "../../lib/types";

const POSITIVE = [
  "yes",
  "interested",
  "sounds good",
  "sounds interesting",
  "tell me more",
  "let's talk",
  "lets talk",
  "let us talk",
  "schedule",
  "meeting",
  "book a",
  "sure",
  "happy to",
  "works for me",
  "let's do it",
  "please share",
];

const UNSUBSCRIBE = [
  "unsubscribe",
  "stop messaging",
  "stop contacting",
  "remove me",
  "do not contact",
  "don't contact",
  "opt out",
  "opt-out",
];

const NEGATIVE = [
  "not interested",
  "no thanks",
  "no thank",
  "don't bother",
  "do not bother",
  "leave me alone",
  "wrong person",
  "stop",
  "never contact",
];

export function classifyReply(replyText: string): Sentiment {
  const text = replyText.toLowerCase().trim();
  if (!text) return "neutral";
  if (UNSUBSCRIBE.some((phrase) => text.includes(phrase))) return "unsubscribe";
  if (NEGATIVE.some((phrase) => text.includes(phrase))) return "negative";
  if (POSITIVE.some((phrase) => text.includes(phrase))) return "positive";
  return "neutral";
}
