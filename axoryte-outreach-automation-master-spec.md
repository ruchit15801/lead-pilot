# Axoryte Outreach Automation — Master Specification
### PRD + Architecture + Algorithms + Formulas + UI/Branding + API + Flows + Wireframes (single reference)

**Owner:** Ruchit — Axoryte Infosoft
**Purpose:** One complete document covering every layer of the system — nothing left in separate files.

---

# PART 1 — PRD

## 1.1 Problem
Axoryte needs a self-owned, 24x7, near-$0-cost system that sources leads matching its services, finds their contact info, messages them on the right channel, follows up automatically, and books a meeting the moment a lead says yes — with zero manual work day to day.

## 1.2 Goals
- Source leads matched to Axoryte's services (Web Dev, Mobile App, AI Automation, SaaS, UI/UX)
- Auto-discover contact info (phone/email) per lead
- Auto-route channel: phone → WhatsApp, email → Gmail
- Send humanized, AI-written outreach + timed follow-ups, fully automatic
- Auto-book calendar meeting the moment a lead replies positively
- Run on free/near-free infrastructure
- Fully responsive dashboard, every screen usable on any device
- Production-grade reliability — no silent failures

## 1.3 Non-Goals (v1)
- No paid ads, no paid scraping APIs
- No automated LinkedIn messaging on Ruchit's real profile (ban risk)
- No AI voice calling (later phase)

## 1.4 Users
Single user (Ruchit, admin) — no multi-tenant requirement in v1.

---

# PART 2 — SYSTEM ARCHITECTURE

## 2.1 Diagram

```
┌─────────────────────────────┐
│  Next.js 14 Dashboard         │
│  (Tailwind + shadcn/ui)       │
└──────────────┬───────────────┘
               │ REST /api/v1
               ▼
┌─────────────────────────────┐
│  Node.js + Express API        │
│  ├─ leads.controller           │
│  ├─ campaigns.controller       │
│  ├─ outreach.controller (AI)   │
│  ├─ whatsapp.controller        │
│  ├─ email.controller           │
│  └─ meetings.controller        │
└───┬────────┬────────┬────────┘
    ▼        ▼        ▼
 MongoDB   OpenWA   Free-AI-Router
 (Atlas)   (Docker) (Groq→Gemini→OpenRouter)
    │        │        │
    ▼        ▼        ▼
 Lead      WhatsApp  Gmail API +
 Sources   Gateway   Calendar API
```

## 2.2 Stack Table

| Layer | Tech | Why |
|---|---|---|
| Frontend | Next.js 14 App Router, TS, Tailwind, shadcn/ui | Fast, responsive, free hosting on Vercel |
| Backend | Node.js 22 + Express | Matches OpenWA's runtime, simple REST |
| DB | MongoDB Atlas free tier + Mongoose | Free, flexible schema for lead data |
| WhatsApp | OpenWA (self-hosted, MIT license) | Free, full REST API + webhooks |
| Email | Gmail API (OAuth2) | Free, uses Ruchit's own account |
| Calendar | Google Calendar API | Free, native notifications |
| AI | Groq / Gemini / OpenRouter free tiers | $0 message generation |
| Hosting | Oracle Always Free or $5 VPS + Vercel | Near-$0 total |

---

# PART 3 — ALGORITHMS & FORMULAS

## 3.1 Lead Scoring Formula

```
LeadScore = (ServiceMatch × 40) + (ContactCompleteness × 25)
          + (CompanySizeFit × 15) + (SourceQuality × 10)
          + (Recency × 10)

Where:
  ServiceMatch        = 1.0 if role/company clearly matches an Axoryte
                         service keyword set, 0.5 partial, 0 no match
  ContactCompleteness = 1.0 if both email+phone found, 0.6 if one, 0 none
  CompanySizeFit       = 1.0 if company size in target SMB/startup range,
                         0.5 borderline, 0 too large/too small
  SourceQuality        = 1.0 official site/LinkedIn, 0.5 directory,
                         0.2 unknown source
  Recency               = 1.0 if scraped data < 30 days old, decays linearly
                         to 0 at 180 days

Threshold: LeadScore >= 70  → enters outreach queue
           LeadScore 40-69  → "review" bucket (manual check)
           LeadScore < 40   → discarded
```

## 3.2 Channel Routing Algorithm

```
function routeChannel(lead):
    if lead.phone exists AND lead.email exists:
        primary = "email"          # lower ban risk, higher safe volume
        secondary = "whatsapp"     # used only if no email reply by day 5
    elif lead.email exists:
        primary = "email"
        secondary = null
    elif lead.phone exists:
        primary = "whatsapp"
        secondary = null
    else:
        primary = null             # goes to "needs manual research" queue
    return { primary, secondary }
```

## 3.3 Follow-up Timing Formula

```
FollowUpSchedule = [Day 0 (initial), Day 3, Day 7, Day 14]

delay_seconds(step) = step.dayOffset × 86400
                       + random(0, 3600)   # jitter to avoid robotic pattern

Stop condition: lead.status == "replied" OR step index > 3
```

## 3.4 WhatsApp Safe-Sending Rate Formula

```
MaxMessagesPerMinute = 3
MaxMessagesPerHour   = 40
MaxMessagesPerDay    = 200   (per session/number)

send_interval_seconds = 60 / MaxMessagesPerMinute  → ~20s between sends,
                          plus random(5,15)s jitter
```

## 3.5 AI Provider Fallback Algorithm

```
function generateMessage(prompt):
    for provider in [Groq, Gemini, OpenRouter]:
        try:
            response = provider.call(prompt)
            if response.success: return response
        except RateLimitError:
            continue
    return queueForRetryLater(prompt)   # never silently drop a lead
```

## 3.6 Humanizing Pass (second AI call)

```
humanize(draft):
    prompt = """
      Rewrite this message so it reads like a real person wrote it:
      - vary sentence length, remove generic AI phrasing
      - no corporate buzzwords, no "I hope this finds you well"
      - keep it under 80 words, one clear CTA
    """
    return AI_call(prompt + draft)
```

## 3.7 Reply Sentiment Classification

```
classify(replyText) → { "positive", "neutral", "negative", "unsubscribe" }

positive  → trigger meeting auto-booking (Part 3.8)
neutral   → flag for manual review
negative/unsubscribe → stop all sequences for that lead immediately
```

## 3.8 Meeting Auto-Booking Trigger

```
on replyClassified == "positive":
    slot = nextAvailableSlot(RuchitCalendar, durationMinutes=30)
    createCalendarEvent(slot, attendee=lead.email, title="Axoryte x {lead.company}")
    lead.status = "meeting_booked"
    notify(Ruchit)   # native Google Calendar notification, no extra step
```

---

# PART 4 — API SPECIFICATION

Base: `/api/v1` · Auth: `X-API-Key` header · All responses JSON.

| Method | Endpoint | Body / Params | Response |
|---|---|---|---|
| POST | `/leads` | `{name, company, role, email, phone, source}` | `{leadId, score}` |
| GET | `/leads?status=&service=&channel=` | query filters | `[Lead]` |
| GET | `/leads/:id` | — | `Lead` |
| PATCH | `/leads/:id` | `{status}` | `Lead` |
| POST | `/leads/import` | CSV file | `{imported, skipped}` |
| POST | `/campaigns` | `{name, serviceTarget, sequenceId, leadIds[]}` | `Campaign` |
| POST | `/campaigns/:id/start` | — | `{status:"active"}` |
| POST | `/outreach/generate-message` | `{leadId, channel, tone}` | `{message}` |
| POST | `/whatsapp/sessions` | `{name}` | `{sessionId}` |
| GET | `/whatsapp/sessions/:id/qr` | — | `{qrImage}` |
| POST | `/whatsapp/send` | `{sessionId, chatId, text}` | `{messageId, status}` |
| POST | `/whatsapp/webhook` | (from OpenWA) | 200 OK |
| POST | `/email/send` | `{leadId, subject, body, attachments[]}` | `{messageId}` |
| POST | `/email/webhook` | (Gmail push) | 200 OK |
| POST | `/meetings` | `{leadId, slot}` | `Meeting` |
| GET | `/meetings` | — | `[Meeting]` |
| GET | `/dashboard/stats` | — | `{leads, sent, replied, booked}` |

---

# PART 5 — UI / BRANDING

## 5.1 Brand Direction
- **Feel:** modern, technical, trustworthy — matches Axoryte's IT-agency positioning, not a "spammy bot tool" look
- **Primary color:** deep indigo `#4338CA` (trust, tech)
- **Accent:** emerald `#10B981` (used for "success/replied/booked" states)
- **Warning/danger:** amber `#F59E0B` / red `#EF4444`
- **Neutral background:** `#F8FAFC` (light mode), `#0F172A` (dark mode)
- **Typography:** Inter (UI text), JetBrains Mono (for API keys/technical values)
- **Logo direction:** reuse Axoryte's existing agency branding/logo in the dashboard header — this is an internal tool, not a separate product brand

## 5.2 Component Style
- shadcn/ui components throughout (buttons, tables, dialogs, forms) for consistency and built-in accessibility/responsiveness
- Status badges: colored pill (grey=new, blue=contacted, green=replied, emerald=booked, red=lost)
- Mobile: tables collapse into stacked cards; sidebar nav collapses into a bottom tab bar or hamburger drawer

---

# PART 6 — SCREEN-BY-SCREEN DETAIL + WIREFRAMES

## Screen 1 — Dashboard / Overview (`/dashboard`)

**Purpose:** at-a-glance system health and funnel numbers.

```
┌───────────────────────────────────────────────────────┐
│ [Axoryte Logo]   Dashboard  Leads  Campaigns  WhatsApp │
│                                          Settings ⚙ 👤 │
├───────────────────────────────────────────────────────┤
│  Leads Sourced   Contacted   Replied   Meetings Booked │
│     [ 240 ]       [ 180 ]     [ 32 ]       [ 9 ]        │
├───────────────────────────────────────────────────────┤
│  Funnel Chart (bar)          │  Recent Activity feed    │
│  ▇▇▇▇▇▇▇▇▇                    │  • Lead X replied         │
│  ▇▇▇▇▇                        │  • Meeting booked w/ Y    │
│  ▇▇                           │  • WhatsApp session OK    │
├───────────────────────────────────────────────────────┤
│  System Status: ● Gmail connected  ● WhatsApp connected │
│                 ● AI router healthy ● Calendar connected│
└───────────────────────────────────────────────────────┘
```
Mobile: 4 stat cards stack 2x2, charts stack below, status row becomes a vertical checklist.

## Screen 2 — Leads List (`/dashboard/leads`)

```
┌───────────────────────────────────────────────────────┐
│ Leads    [Search…]   [Filter: Status ▾] [Service ▾]     │
│                                          [+ Import]      │
├───────────────────────────────────────────────────────┤
│ Name        Company     Service     Channel  Status     │
│ John D.     Acme Inc    Web Dev     📧       Contacted  │
│ Priya S.    Zeta Labs   AI Automat  📱       Replied    │
│ ...                                                       │
└───────────────────────────────────────────────────────┘
```
Mobile: each row becomes a card —
```
┌─────────────────────────┐
│ John D. — Acme Inc        │
│ Web Dev · 📧 Contacted    │
└─────────────────────────┘
```

## Screen 3 — Lead Detail (`/dashboard/leads/:id`)

```
┌───────────────────────────────────────────────────────┐
│ ← Back    John D. — Acme Inc              [Edit] [⋮]    │
├───────────────────────────────────────────────────────┤
│ Score: 82   Service: Web Dev   Channel: Email            │
│ Email: john@acme.com   Phone: —                          │
├───────────────────────────────────────────────────────┤
│ Message Timeline                                          │
│  [Day 0] Outbound — "Hi John, saw Acme is expanding…"    │
│  [Day 3] Outbound — follow-up sent                        │
│  [Day 4] Inbound — "Sounds interesting, tell me more"     │
├───────────────────────────────────────────────────────┤
│ [Book Meeting Manually]   [Mark Lost]   [Pause Sequence]  │
└───────────────────────────────────────────────────────┘
```

## Screen 4 — Import Leads (`/dashboard/leads/import`)

```
┌───────────────────────────────────────────────────────┐
│ Import Leads                                              │
├───────────────────────────────────────────────────────┤
│  [ Drag & drop CSV here, or click to upload ]             │
│                                                             │
│  — or manual entry —                                      │
│  Name:      [___________]                                 │
│  Company:   [___________]                                 │
│  Service:   [Dropdown ▾]                                  │
│  Email:     [___________]      Phone: [___________]       │
│                                    [+ Add Lead]            │
└───────────────────────────────────────────────────────┘
```

## Screen 5 — Campaigns (`/dashboard/campaigns`)

```
┌───────────────────────────────────────────────────────┐
│ Campaigns                              [+ New Campaign]  │
├───────────────────────────────────────────────────────┤
│ Name              Leads   Status     Replied  Booked     │
│ Web Dev Outreach   85     Active      12       3          │
│ AI Automation Q3   60     Paused      8        2          │
└───────────────────────────────────────────────────────┘
```

## Screen 6 — Campaign Builder (`/dashboard/campaigns/new`)

```
┌───────────────────────────────────────────────────────┐
│ New Campaign                                              │
├───────────────────────────────────────────────────────┤
│ Name:          [___________]                              │
│ Target Service: [Dropdown ▾]                               │
│ Select Leads:   [Table w/ checkboxes]                      │
│ Sequence Steps:                                             │
│   Day 0  [Email] Initial — [Edit prompt]                   │
│   Day 3  [Email] Follow-up 1                                │
│   Day 7  [WhatsApp] Follow-up 2                              │
│   Day 14 [Email] Final                                       │
│                                    [Save & Start Campaign]   │
└───────────────────────────────────────────────────────┘
```

## Screen 7 — WhatsApp Connect (`/dashboard/whatsapp`)

```
┌───────────────────────────────────────────────────────┐
│ WhatsApp Connection                                        │
├───────────────────────────────────────────────────────┤
│  Status: ● Not Connected                                    │
│                                                               │
│         [   QR CODE IMAGE   ]                                │
│                                                               │
│  Scan with WhatsApp on your dedicated number.                │
│  ⚠ Do not use your primary business number.                  │
├───────────────────────────────────────────────────────┤
│  Rate limit: 3 msgs/min   Sent today: 42/200                │
└───────────────────────────────────────────────────────┘
```

## Screen 8 — Settings (`/dashboard/settings`)

```
┌───────────────────────────────────────────────────────┐
│ Settings                                                   │
├───────────────────────────────────────────────────────┤
│ Integrations                                                │
│  Gmail       ● Connected     [Reconnect]                    │
│  Calendar    ● Connected     [Reconnect]                    │
│  WhatsApp    ○ Not connected [Go to WhatsApp page]           │
│  AI Providers: Groq ✓  Gemini ✓  OpenRouter ✓ [Edit keys]    │
├───────────────────────────────────────────────────────┤
│ Attachments (CV/Resume/Portfolio)                            │
│  [ resume.pdf ]  [ portfolio.pdf ]        [+ Upload]         │
└───────────────────────────────────────────────────────┘
```

## Screen 9 — Meetings (`/dashboard/meetings`)

```
┌───────────────────────────────────────────────────────┐
│ Upcoming Meetings                                           │
├───────────────────────────────────────────────────────┤
│ Date        Lead          Company       Service            │
│ Sep 12      John D.       Acme Inc      Web Dev             │
│ Sep 14      Priya S.      Zeta Labs     AI Automation        │
└───────────────────────────────────────────────────────┘
```

---

# PART 7 — END-TO-END LOGIC FLOW (full lifecycle)

```
1. n8n / scraper finds a lead → POST /leads
2. LeadScore calculated (3.1) → if ≥70, enters queue; else review/discard
3. routeChannel() (3.2) decides email vs WhatsApp vs both
4. Campaign assigns a Sequence (3.3 timing)
5. On each due step:
     generate-message → AI draft (3.5) → humanize (3.6) → send via
     Gmail or OpenWA, rate-limited (3.4)
6. Inbound reply arrives (webhook) → classify(replyText) (3.7)
     - positive  → auto-book meeting (3.8) → notify Ruchit
     - negative/unsubscribe → stop sequence
     - neutral → flag for manual review
7. Dashboard stats + activity feed update in real time
```

---

# PART 8 — RELIABILITY / NO-BUG CHECKLIST

- Every external call (OpenWA, Gmail, AI providers) wrapped in try/catch with retry (3 attempts, exponential backoff)
- Failed sends logged to `Message.status = "failed"` with error reason — never silently dropped
- Idempotency keys on send endpoints (prevent duplicate sends if a cron job overlaps)
- Webhook signature verification (HMAC) on both OpenWA and Gmail webhooks
- Rate limiter enforced server-side, not just trusted to the client
- Health check endpoint (`/api/v1/health`) polled by the dashboard's "System Status" row

---

*This single file supersedes the earlier separate PRD and architecture docs — everything (PRD, architecture, algorithms/formulas, API, UI/branding, screens/wireframes, and full logic flow) is now in one place.*
