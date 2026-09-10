# PRD — Axoryte Outreach Automation Platform

**Owner:** Ruchit (Axoryte Infosoft)
**Goal:** A self-owned, 24x7, mostly-free lead generation + outreach automation system that finds leads matching Axoryte's services, contacts them on the right channel automatically, follows up without manual work, and books meetings on the calendar the moment a client agrees.

---

## 1. Problem Statement

Axoryte currently gets leads manually / via a partial n8n workflow. There's no single system that: sources leads across platforms, decides the right contact channel per lead, sends humanized outreach + follow-ups automatically, and closes the loop by booking a meeting — all while keeping cost near-zero.

---

## 2. Goals

- Find leads that match Axoryte's actual services (Web Dev, Mobile App, AI Automation, SaaS, UI/UX) — not random leads
- Automatically discover each lead's usable contact info
- Automatically choose the channel: **phone number found → WhatsApp**, **email found → Gmail**
- Send fully automated, human-sounding outreach + timed follow-ups, 24x7, with zero manual sending
- When a lead replies positively, automatically create a calendar meeting so Ruchit gets notified — no manual scheduling
- Keep the entire stack free or as close to $0/month as possible
- No single points of failure / bugs — production-grade reliability
- Fully responsive dashboard UI, usable on any device

## 3. Non-Goals (for v1)

- No paid ad spend or paid scraping tools (v1 must run on free tiers)
- No automated bulk LinkedIn messaging on Ruchit's personal profile (ban risk — see Section 9)
- No voice calling / AI calling (deferred, not in scope right now)

---

## 4. Users

| User | Need |
|---|---|
| Ruchit (admin/owner) | Sees all leads, campaigns, messages, meetings in one dashboard; connects WhatsApp/Gmail/Calendar once, then hands off control to automation |

---

## 5. Feature List (everything requested, one place)

### 5.1 Lead Sourcing
- Pull leads from web (existing n8n: keyword generation → DuckDuckGo search → website scraping → contact extraction → lead scoring)
- LinkedIn leads via manual search/export + CSV import (not automated scraping — ban risk)
- Every lead tagged with which Axoryte **service** it matches (drives which pitch gets used)
- Lead scoring (quality threshold, existing n8n already scores at 70+)

### 5.2 Contact Discovery
- Extract phone number and/or email from scraped site/profile data
- Store both if available; system picks primary channel per rule below

### 5.3 Channel Routing Logic
- **IF phone number found → WhatsApp** outreach path
- **IF email found → Gmail** outreach path
- If both found, email is primary (lower ban risk, higher volume safe), WhatsApp as secondary touch

### 5.4 Message Generation
- AI drafts outreach message specific to the lead's matched service
- Message passed through a **humanizing pass** (per Ruchit's /humanizer skill principles) so it reads like a real person wrote it, not AI-generated
- Uses **free AI models only**: Groq (primary) → Gemini (fallback) → OpenRouter (fallback) — no paid API cost

### 5.5 WhatsApp Automation
- Self-hosted **OpenWA** (open-source, free, MIT license) as the WhatsApp gateway
- Dedicated business number (not Ruchit's personal number) — see safety note
- Auto-send + auto-receive replies via webhook
- Rate-limited sending to avoid bans

### 5.6 Email Automation
- Ruchit's own Gmail account, connected via OAuth2 (free, official Gmail API)
- Automated send with attachments (CV, resume, portfolio docs)
- Timed follow-up sequences (e.g. Day 0, Day 3, Day 7) with no manual trigger
- Reply detection to stop sequence and flag lead as "replied"

### 5.7 24x7 Operation
- Backend cron / scheduler runs continuously — sourcing, sending, follow-ups all happen without Ruchit doing anything
- Runs on free-tier hosting (Oracle Always Free) or ~$5/month VPS

### 5.8 Meeting Auto-Booking
- When a reply is classified as "interested/positive" (AI sentiment check), system automatically creates a Google Calendar event with the lead as an attendee
- Ruchit gets a native calendar notification — this is how he "finds out" a meeting is set, with zero manual scheduling

### 5.9 Dashboard (Next.js UI)
- Leads table (filter/search/sort by status, service, channel)
- Campaign management (create/pause/monitor sequences)
- WhatsApp session panel (QR code linking, connection status)
- Settings (Gmail OAuth connect, Calendar connect, API keys)
- **Fully responsive** — works cleanly on desktop, tablet, and mobile (card-based layout on small screens)
- Clean, modern UI (Tailwind + shadcn/ui)

### 5.10 Reliability
- Centralized error logging (so a single failure doesn't silently break the pipeline)
- Retry logic on message sends (e.g. 3 attempts before marking failed)
- Audit trail — every message sent/received logged with status

---

## 6. Tech Stack (confirmed)

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind + shadcn/ui |
| Backend | Node.js + Express |
| Database | MongoDB (Atlas free tier) + Mongoose |
| WhatsApp | OpenWA (self-hosted, open-source) |
| Email | Gmail API (OAuth2) |
| Calendar | Google Calendar API |
| AI | Groq → Gemini → OpenRouter (free-tier fallback chain) |
| Orchestration | node-cron / existing n8n (self-hosted) |
| Hosting | Oracle Cloud Always Free / Render free tier + Vercel (frontend) |

*(Full schema, API routes, and integration flow are in the companion architecture doc already shared.)*

---

## 7. Success Metrics

- Leads sourced per week (target: define after Phase 1 baseline)
- % of leads with a usable contact channel found
- Message delivery rate (email + WhatsApp)
- Reply rate
- Meetings auto-booked per week
- $ spent per month (target: ≤ $5)
- Zero unhandled crashes/bugs in the pipeline over a rolling 7-day period

---

## 8. Phased Rollout

1. Lead DB + dashboard shell (leads list only)
2. Wire existing n8n scraper into new backend
3. Gmail send + follow-up sequences (**current priority**)
4. AI message generation + humanizing pipeline
5. OpenWA WhatsApp integration
6. Reply classification + calendar auto-booking
7. LinkedIn CSV import + service-matching + UI polish/responsiveness pass

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| WhatsApp number ban | Use dedicated number, warm up before automating, low send rate, opted-in recipients only, prefer `whatsapp-web.js` engine over `baileys` |
| LinkedIn account ban | No automated scraping/messaging on real profile — manual/CSV import only |
| Free AI rate limits hit | 3-provider fallback chain (Groq → Gemini → OpenRouter) |
| Gmail flagged as spam | Reasonable send volume, real reply-to address, no misleading subject lines |
| Single point of failure | Retry logic + audit logging on every send |

---

## 10. Open Questions (for Ruchit to decide as we build)

- What's the target daily/weekly lead volume?
- Should WhatsApp be v1 or added after email flow is proven (Phase 3 vs Phase 5, as currently phased)?
- Should the dedicated WhatsApp number be a new SIM or a VoIP number?
