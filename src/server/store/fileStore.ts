import { promises as fs } from "node:fs";
import path from "node:path";
import type {
  Activity,
  Campaign,
  Lead,
  Meeting,
  Message,
  Settings,
  WhatsAppSession,
} from "../../lib/types";

export interface DatabaseShape {
  leads: Lead[];
  campaigns: Campaign[];
  messages: Message[];
  meetings: Meeting[];
  activities: Activity[];
  sessions: WhatsAppSession[];
  settings: Settings;
  googleTokens?: {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
    scope?: string;
  };
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

let cache: DatabaseShape | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function emptyDb(): DatabaseShape {
  return {
    leads: [],
    campaigns: [],
    messages: [],
    meetings: [],
    activities: [],
    sessions: [],
    settings: {
      gmailConnected: false,
      calendarConnected: false,
      sandboxMode: process.env.SANDBOX_MODE !== "false",
      aiKeysConfigured: {
        groq: Boolean(process.env.GROQ_API_KEY),
        gemini: Boolean(process.env.GEMINI_API_KEY),
        openrouter: Boolean(process.env.OPENROUTER_API_KEY),
      },
      attachments: [],
    },
  };
}

import { getMongoSnapshot, saveMongoSnapshot } from "./index";

export async function loadDb(): Promise<DatabaseShape> {
  if (cache) return cache;

  if (process.env.MONGODB_URI) {
    const mongoData = await getMongoSnapshot();
    if (mongoData) {
      cache = mongoData as DatabaseShape;
    } else {
      cache = emptyDb();
      await persist();
    }
  } else {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const raw = await fs.readFile(DB_PATH, "utf8");
      cache = JSON.parse(raw) as DatabaseShape;
    } catch {
      cache = emptyDb();
      await persist();
    }
  }

  cache.settings.sandboxMode = process.env.SANDBOX_MODE !== "false";
  cache.settings.aiKeysConfigured = {
    groq: Boolean(process.env.GROQ_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    openrouter: Boolean(process.env.OPENROUTER_API_KEY),
  };
  return cache;
}

export async function mutate<T>(fn: (db: DatabaseShape) => T | Promise<T>): Promise<T> {
  const db = await loadDb();
  const result = await fn(db);
  await persist();
  return result;
}

async function persist() {
  const snapshot = cache;
  if (!snapshot) return;
  writeQueue = writeQueue.then(async () => {
    if (process.env.MONGODB_URI) {
      await saveMongoSnapshot(snapshot);
    } else {
      await fs.mkdir(DATA_DIR, { recursive: true });
      await fs.writeFile(DB_PATH, JSON.stringify(snapshot, null, 2), "utf8");
    }
  });
  await writeQueue;
}

export function nowIso() {
  return new Date().toISOString();
}

export function newId() {
  return crypto.randomUUID();
}

export const fileDriver = "file" as const;
