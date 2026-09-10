# Axoryte Outreach Automation

> AI-powered lead discovery, outreach, and meeting booking system for Axoryte Infosoft.

Finds leads matching Axoryte's services (Web Dev, Mobile App, AI Automation, SaaS, UI/UX), auto-discovers contact info, sends humanized outreach via Gmail or WhatsApp, follows up on a Day 0/3/7/14 schedule, classifies replies, and books meetings on Google Calendar — all with zero daily manual work.

## Features

- **Lead Finder** — DuckDuckGo search + Cheerio HTML scraping to discover companies needing Axoryte's services
- **Lead Scoring** — 5-factor scoring formula (service match, contact completeness, company size, source quality, recency)
- **AI Message Generation** — Groq → Gemini → OpenRouter fallback chain with humanizing pass
- **Gmail Automation** — OAuth2 integration, automated outreach + follow-ups, reply detection
- **WhatsApp Automation** — OpenWA self-hosted gateway, QR pairing, rate-limited sending
- **Meeting Auto-Booking** — Positive reply → calendar event created → Ruchit gets notified
- **Automation Engine** — Auto-enroll high-scoring leads into active campaigns
- **Responsive Dashboard** — 10 screens, desktop + mobile, dark mode ready

## Quick Start

```bash
# 1. Clone the repo
git clone https://github.com/axoryte/outreach-automation.git
cd outreach-automation

# 2. Install dependencies
npm install

# 3. Copy and configure environment
cp .env.example .env
# Edit .env with your API keys (optional — works in sandbox mode without them)

# 4. Start development
npm run dev
# API: http://localhost:4000
# Dashboard: http://localhost:3000
```

## Architecture

```
┌─────────────────────────────┐
│   Next.js 14 Dashboard      │ ← Tailwind + shadcn/ui
│   (localhost:3000)           │
└──────────────┬──────────────┘
               │ REST /api/v1 (proxy)
               ▼
┌─────────────────────────────┐
│   Node.js + Express API     │ ← localhost:4000
│   ├─ leads, campaigns       │
│   ├─ outreach (AI pipeline) │
│   ├─ scraper (DuckDuckGo)   │
│   ├─ WhatsApp (OpenWA)      │
│   └─ Gmail + Calendar       │
└───┬────────┬────────┬───────┘
    ▼        ▼        ▼
 JSON/Mongo  OpenWA  AI Providers
  (data/)   (Docker) (Groq/Gemini/OpenRouter)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, Recharts |
| Backend | Node.js, Express 5, TypeScript |
| Database | JSON file store (dev) / MongoDB Atlas (prod) |
| WhatsApp | OpenWA (self-hosted, open source) |
| Email | Gmail API (OAuth2) |
| Calendar | Google Calendar API |
| AI | Groq → Gemini → OpenRouter (free tier fallback chain) |
| Scraper | DuckDuckGo HTML + Cheerio |

## Dashboard Screens

1. **Dashboard** — Funnel stats, activity feed, system health
2. **Lead Finder** — Run discovery, select services, view results
3. **Leads** — Search, filter, sort all leads
4. **Lead Detail** — Timeline, actions, reply simulator
5. **Import Leads** — CSV upload + manual entry
6. **Campaigns** — Create, start, pause, monitor sequences
7. **Campaign Builder** — Pick service, leads, sequence steps
8. **WhatsApp** — QR connection, rate limit monitor
9. **Meetings** — Auto-booked + manual meetings
10. **Settings** — Gmail, Calendar, WhatsApp, AI keys, attachments

## Environment Variables

See [.env.example](.env.example) for all available configuration options.

### Required for production:
- `API_KEY` — Authentication key for API requests
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Gmail + Calendar OAuth
- At least one AI key (`GROQ_API_KEY`, `GEMINI_API_KEY`, or `OPENROUTER_API_KEY`)

### Optional:
- `MONGODB_URI` — Use MongoDB instead of JSON file store
- `OPENWA_URL` — Self-hosted OpenWA for live WhatsApp
- `SCRAPER_TICK_MS` — Enable automatic lead scraping (set > 0)

## Docker Deployment

```bash
# Build and run with Docker Compose
docker compose up -d

# Or build manually
docker build -t axoryte-outreach .
docker run -p 3000:3000 -p 4000:4000 --env-file .env axoryte-outreach
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/v1/health` | System health check |
| GET | `/api/v1/leads` | List leads (filter by status/service/channel) |
| POST | `/api/v1/leads` | Create a lead |
| POST | `/api/v1/leads/import` | Import CSV file |
| POST | `/api/v1/scraper/run` | Run lead discovery pipeline |
| POST | `/api/v1/campaigns` | Create campaign |
| POST | `/api/v1/campaigns/:id/start` | Start campaign + process outreach |
| POST | `/api/v1/outreach/generate-message` | AI-generate outreach message |
| POST | `/api/v1/email/send` | Send email via Gmail |
| POST | `/api/v1/whatsapp/send` | Send WhatsApp message |
| POST | `/api/v1/meetings` | Book a meeting |
| GET | `/api/v1/dashboard/stats` | Dashboard KPIs |

## How It Works

```
1. Scraper discovers leads → POST /leads
2. LeadScore calculated → if ≥70, enters outreach queue
3. Channel routed → email primary, WhatsApp secondary
4. Campaign assigns a sequence (Day 0/3/7/14)
5. Each step: AI draft → humanize → send via Gmail/WhatsApp
6. Reply arrives (webhook) → classify sentiment
   - positive → auto-book meeting → notify Ruchit
   - negative/unsubscribe → stop sequence
   - neutral → flag for review
7. Dashboard shows real-time funnel + activity feed
```

## License

Private — Axoryte Infosoft internal tool.
