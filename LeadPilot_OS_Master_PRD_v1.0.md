# LEADPILOT OS
Master Product Requirements Document (PRD) + Software Requirements Specification + Technical Architecture + Implementation Blueprint
Version: 1.0
Date: 8 September 2026
Purpose: Single source-of-truth specification for an AI-assisted lead discovery, enrichment, CRM, email/WhatsApp outreach, follow-up, reply intelligence and meeting-booking platform.
Target deployment: Self-hosted / low-cost first, with a path to multi-tenant SaaS.
Primary stack: Next.js + TypeScript + Node.js/Fastify + MongoDB + Redis/BullMQ + SearXNG + Cheerio/Puppeteer + Gmail API + Google Calendar API + OpenWA + Docker.
Important product principle: automate repetitive work, but keep policy, permissions, compliance, rate limits, deduplication, idempotency, auditability and human approval under deterministic application control.

## How to use this document
This document is intentionally written as an implementation handoff. An AI coding agent or developer should treat the MUST/SHOULD/MAY requirements as acceptance criteria. Do not skip requirements because a feature looks optional. Build in phases, but preserve the interfaces and data contracts defined here.
This is one master file: product vision, scope, personas, UX, functional requirements, non-functional requirements, data model, API contracts, queues, integrations, security, compliance controls, deployment, testing, acceptance criteria, roadmap and cost model.

## 0. Executive decision summary
- Build a lead operating system, not a collection of disconnected scripts.
- Email is the first production outreach channel. WhatsApp is a separate service integrated through OpenWA.
- LinkedIn should be supported through user-supplied/imported data and public-data enrichment rather than making direct automated LinkedIn account control a core dependency.
- Next.js is the UI. Node.js is the API/application layer. Workers handle long-running jobs.
- MongoDB stores product state; Redis + BullMQ handles asynchronous jobs, delayed follow-ups, retries and rate limiting.
- SearXNG is the self-hosted discovery/search layer; Cheerio handles static HTML and Puppeteer handles JavaScript-rendered pages.
- AI is provider-agnostic. The application must support local/free/paid providers through one interface and deterministic fallback rules.
- Every outbound action must pass suppression, duplicate, eligibility, rate-limit, policy and idempotency checks.
- Every meaningful state transition must be persisted and auditable.
- The first release is single-workspace capable, but all core data carries organizationId so the product can become multi-tenant without a rewrite.

## 1. Product vision
LeadPilot OS turns a user's service offerings and target niches into a repeatable lead-generation and outreach system. The user defines what services they sell, what roles/industries/locations they want, which channels are allowed, which documents may be attached, and how aggressive automation may be. The platform discovers candidates, enriches them, scores fit and intent, generates grounded personalized outreach, sends through approved channels, manages follow-ups, detects replies, classifies intent and creates calendar meetings.
The product must feel like a modern SaaS CRM with an AI copilot, not like a collection of developer tools.

## 2. Goals

| Goal | Definition of done |
| --- | --- |
| Lead discovery | User can define a niche/service/search brief and obtain normalized candidate leads from configured discovery sources. |
| Lead intelligence | System can enrich a candidate with company/contact/site signals and produce a transparent qualification score. |
| Personalization | AI can generate a concise, evidence-grounded message matched to the lead and selected service. |
| Email automation | User can connect Gmail, send/schedule messages, attach selected files, run sequences and stop follow-ups on reply/opt-out. |
| WhatsApp | User can connect a dedicated WhatsApp account through OpenWA, see connection state/QR, send and receive messages and log the conversation. |
| Reply intelligence | Inbound messages are matched to leads and classified into actionable intents. |
| Meetings | Interested leads can be routed into Google Calendar availability and booked meetings. |
| Reliability | Jobs survive transient failures, retry safely, expose failures and never silently duplicate outbound messages. |
| Cost control | Core software should be open-source/free where practical; paid APIs must be optional adapters. |
| UX | Responsive desktop/tablet/mobile UI with clear status, search, filters, timelines and operational visibility. |

## 3. Non-goals / explicit boundaries
- Do not promise 100% accurate lead data, AI decisions, deliverability or third-party uptime.
- Do not build a system whose primary purpose is bypassing LinkedIn, WhatsApp or website anti-automation controls.
- Do not store Gmail passwords; use OAuth.
- Do not put third-party API secrets in browser code.
- Do not make n8n the authoritative database or core business-logic engine.
- Do not require a paid enrichment provider for the MVP.
- Do not put large binary attachments directly into ordinary MongoDB documents.
- Do not let AI directly bypass deterministic sending policies.

## 4. Primary user / personas

| Persona | Needs | Key screens |
| --- | --- | --- |
| Owner / Founder | Find clients, define services, review hot leads, send outreach, book meetings. | Dashboard, Lead Finder, Leads, Campaigns, Inbox, Meetings, Settings |
| Sales operator | Work queues, review leads, approve messages, handle replies. | Leads, Review Queue, Inbox, Campaigns |
| Admin | Integrations, accounts, permissions, system health. | Settings, Integrations, Audit, Health |
| Developer / maintainer | Debug jobs, APIs, workers and integrations. | System Health, Jobs, Logs, API docs |

## 5. Core user journeys

### 5.1 Onboarding
1. Create account/workspace.
1. Set company/service profile: services, niches, locations, roles, company sizes, keywords and exclusions.
1. Connect Gmail through OAuth.
1. Optionally connect Google Calendar.
1. Optionally connect WhatsApp/OpenWA.
1. Upload reusable assets: CV/resume, portfolio, case studies, proposal, company profile.
1. Configure sending limits, approval mode, working hours and follow-up policy.
1. Run a small test search and review results.

### 5.2 Lead discovery
User brief
  -> query planner
  -> SearXNG/search sources
  -> URL normalization
  -> crawl queue
  -> contact/company extraction
  -> deduplication
  -> enrichment
  -> AI qualification
  -> score
  -> ready/review queue

### 5.3 Email outreach
Qualified lead
  -> campaign match
  -> message generation
  -> humanizer
  -> policy/quality checks
  -> approval or auto-send
  -> email queue
  -> Gmail
  -> delivery/thread log
  -> follow-up scheduler
  -> reply detection
  -> stop/continue decision

### 5.4 WhatsApp
Lead with eligible phone
  -> suppression/eligibility checks
  -> WhatsApp queue
  -> OpenWA adapter
  -> send
  -> delivery event
  -> conversation timeline
  -> inbound reply
  -> intent classification
  -> CRM action

### 5.5 Meeting
Reply classified as meeting intent
  -> propose availability or meeting link
  -> client selection
  -> Google Calendar event
  -> confirmation
  -> lead status = MEETING_BOOKED
  -> reminder/task

## 6. Product information architecture
- Dashboard
- Lead Finder
- Leads
- Companies
- Contacts
- Campaigns
- Sequences
- Inbox
- WhatsApp
- Email
- Meetings
- Tasks
- Analytics
- Assets
- Integrations
- Automation Rules
- Suppression / Do-Not-Contact
- System Health
- Audit Logs
- Settings

## 7. UX requirements
- Desktop-first productivity layout with responsive tablet/mobile behavior.
- Persistent sidebar on desktop; collapsible navigation on tablet; compact bottom navigation on mobile.
- Use a consistent design system: Tailwind CSS + shadcn/ui + Lucide icons.
- Support light/dark mode.
- Tables must support search, filters, sorting, pagination and column selection.
- All long-running operations must show progress/status rather than blocking the browser.
- Destructive actions require confirmation.
- Every status badge must map to a deterministic enum.
- Keyboard-friendly actions and accessible labels are required.
- No visual design should depend on color alone; status must also have text/icon.

## 8. Dashboard requirements
- KPI cards: total leads, qualified, contacted, replies, meetings, won, failed jobs.
- Charts: lead acquisition by source, outreach activity, reply rate, meeting rate, conversion rate, service performance.
- Operational widgets: pending approvals, failed jobs, disconnected integrations, upcoming meetings.
- Recent activity timeline.
- Quick actions: Find Leads, Import CSV, Create Campaign, Connect Gmail, Connect WhatsApp.

## 9. Lead Finder requirements

### 9.1 Input form
- Service(s)
- Industry/niche
- Target role/title
- Geography/country/city
- Company size
- Technology/stack signals
- Intent signals
- Keywords
- Exclude keywords
- Domain exclusions
- Maximum results
- Pages per domain
- Allowed sources

### 9.2 Search generation
The system creates multiple search queries from structured inputs. Query generation must be deterministic enough to reproduce a run. Store the generated queries with the search job.

### 9.3 Result processing
- Normalize URLs and domains.
- Reject obvious non-company pages and unsupported schemes.
- Deduplicate before crawling.
- Respect configured crawl policies and stop conditions.
- Use static extraction first; use browser rendering only when required.
- Persist source URL and collection timestamp.

## 10. Lead intelligence requirements
- Extract company name, domain, website, description, industry, location, technologies, contact details and social/profile URLs when available from allowed sources.
- Discover likely contact/about/team/service pages.
- Extract mailto and tel links plus normalized textual email/phone patterns.
- Normalize international phone numbers where country context is known.
- Record evidence URL for each important extracted signal.
- Never present an AI inference as a verified fact without an evidence/confidence marker.

## 11. Lead scoring
Scoring is configurable. The initial default model is 0–100.

| Signal | Default weight |
| --- | --- |
| Clear service need / intent | 25 |
| Strong pain/problem signal | 20 |
| Hiring/active project signal | 20 |
| Business/company fit | 10 |
| Valid business email | 10 |
| Valid phone/WhatsApp candidate | 5 |
| Recent/relevant activity | 10 |

Bands: 80–100 HOT, 60–79 WARM, 40–59 NURTURE, 0–39 LOW. Store component scores and evidence; never store only the final number.

## 12. Service profile system
The user must be able to define services as structured profiles.
ServiceProfile
- name
- description
- keywords[]
- synonyms[]
- targetIndustries[]
- targetRoles[]
- painSignals[]
- intentSignals[]
- exclusions[]
- preferredChannels[]
- messageGuidance
- active

## 13. AI requirements
- Provider abstraction: Local, Groq, Gemini, OpenRouter or future provider adapters.
- Structured outputs validated by Zod.
- Configurable model per task.
- Fallback chain for transient provider failure.
- Timeouts and retry policy.
- Prompt/version stored with each generation.
- Input evidence and output confidence stored for audit.
- No fabricated facts.
- AI cannot override suppression, authorization, rate limits or campaign state.
- AI tasks include qualification, summarization, service matching, message generation, humanization, reply intent classification and meeting intent detection.

## 14. AI message pipeline
Lead evidence
 -> service profile
 -> campaign instructions
 -> previous conversation
 -> draft generation
 -> humanization
 -> quality validator
 -> policy validator
 -> approval/auto-send
Humanization rules: concise, specific, natural, no fake familiarity, no invented claims, no excessive buzzwords, no generic flattery, no repeated template openings, and a clear but non-pushy CTA.

## 15. Email requirements
- Google OAuth connection.
- Account health/status visible.
- Compose and preview before send.
- Subject/body templates with validated variables.
- Attachments selected from Asset Library.
- Schedule send.
- Campaign sequence support.
- Inbound thread matching.
- Bounce/failure capture where available.
- Unsubscribe/opt-out handling.
- Per-account and per-campaign limits.
- Idempotency key per logical send.

## 16. Email sequence requirements

| Step | Example delay | Stop condition |
| --- | --- | --- |
| Initial | Immediately or scheduled | Reply, opt-out, manual stop |
| Follow-up 1 | 3 days | Reply, opt-out, manual stop |
| Follow-up 2 | 7 days after previous | Reply, opt-out, manual stop |
| Final | 14 days after previous | Reply, opt-out, manual stop |

These are defaults only. Users can customize delays and maximum steps.

## 17. WhatsApp / OpenWA requirements
OpenWA is an isolated integration service, not the source of truth for CRM data.
- Create/connect/disconnect/reconnect session.
- Display QR or connection state returned by the gateway.
- Store session metadata, not plaintext secrets in frontend.
- Outbound message queue with rate limiting.
- Inbound webhook handling.
- Conversation/thread mapping to Lead/Contact.
- Media handling through controlled attachment storage.
- Delivery/read state where provider supports it.
- Failure/retry and disconnected-account handling.
- Dedicated automation/business number strongly recommended.
- Respect opt-out and suppression state before every send.

## 18. LinkedIn requirements
- CSV import for user-supplied/exported lead data.
- Manual LinkedIn URL input.
- Store profile URL and source metadata.
- Enrich only from permitted/public/supplied data.
- No dependency on automated LinkedIn account login or automated connection/message actions.
- If future LinkedIn integration is added, isolate it behind an adapter and policy gate.

## 19. Inbox requirements
- Unified view of Email and WhatsApp conversations.
- Filters: unread, needs reply, interested, meeting request, opt-out, channel.
- Conversation timeline.
- AI reply suggestion.
- Human edit before send.
- Mark resolved.
- Assign owner.
- Link every conversation to Lead and Campaign.
- Never lose inbound events because the UI was offline.

## 20. Reply classification

| Intent | Action |
| --- | --- |
| INTERESTED | Stop sequence; create follow-up task or meeting flow. |
| MEETING_REQUEST | Open calendar flow. |
| QUESTION | Create AI draft; require approval by default. |
| PRICE_REQUEST | Create draft; require approval. |
| NOT_INTERESTED | Stop campaign; optionally mark nurture. |
| UNSUBSCRIBE | Immediately suppress. |
| OUT_OF_OFFICE | Pause follow-up until configured date if detected. |
| BOUNCE | Stop email sequence and mark address invalid. |
| UNKNOWN | Route to manual review. |

## 21. Calendar requirements
- Google OAuth.
- Read free/busy for configured calendars.
- Timezone-aware availability.
- Configurable working hours, buffers and meeting duration.
- Create event with attendee, title, description and meeting link/details.
- Store Google event ID.
- Sync cancellation/update events when available.
- Meeting status: PROPOSED, REQUESTED, BOOKED, COMPLETED, CANCELLED, NO_SHOW.

## 22. Asset library requirements
- Upload CV/resume, portfolio, case studies, company deck, proposals and other files.
- Store file metadata and checksum.
- Prevent accidental duplicate uploads.
- Per-asset active/inactive state.
- Campaign can select allowed assets.
- Email sender must validate file existence and permission before attaching.

## 23. Campaign requirements
- Campaign name, service, audience, sources, channels, templates, AI instructions, sequence, schedule and limits.
- Modes: Manual, Approval Required, Auto Send.
- Campaign lifecycle: DRAFT, READY, RUNNING, PAUSED, COMPLETED, FAILED, ARCHIVED.
- Preview audience before activation.
- Show why each lead qualifies.
- Pause/resume safely without losing queued state.
- Stop conditions on reply, opt-out, bounce, meeting, manual suppression.

## 24. Automation rule engine
Rules are event-driven and deterministic.
WHEN lead.score >= 80
AND lead.email exists
AND lead.doNotContact = false
THEN add lead to campaign X

WAIT 3 days

IF no reply
THEN queue follow-up 1

IF reply received
THEN stop sequence
AND classify reply
Rules must be versioned and auditable.

## 25. Core state machine
DISCOVERED
 -> ENRICHING
 -> ENRICHED
 -> QUALIFYING
 -> QUALIFIED / UNQUALIFIED
 -> READY
 -> QUEUED
 -> CONTACTED
 -> FOLLOW_UP
 -> REPLIED
 -> INTERESTED / NOT_INTERESTED / MEETING_REQUESTED
 -> MEETING_BOOKED
 -> WON / LOST
Any state can also transition to ERROR or DO_NOT_CONTACT where applicable. Transitions must be validated in code.

## 26. Data model — collections

| Collection | Purpose |
| --- | --- |
| users | Identity and account membership. |
| organizations | Workspace/tenant boundary. |
| members | Organization roles/permissions. |
| leads | Primary lead record and qualification state. |
| companies | Normalized company entities. |
| contacts | Normalized person entities. |
| leadSources | Search/import/source metadata. |
| serviceProfiles | User-defined services and matching rules. |
| campaigns | Outreach campaigns. |
| sequences | Reusable follow-up sequences. |
| sequenceSteps | Individual sequence actions. |
| messages | Inbound/outbound communication records. |
| conversations | Channel conversation containers. |
| emailAccounts | OAuth-connected Gmail accounts. |
| whatsappAccounts | OpenWA session metadata. |
| attachments | Asset metadata/storage references. |
| meetings | Calendar events linked to leads. |
| automationRules | Event/condition/action definitions. |
| jobs | Application job metadata and operational state. |
| aiGenerations | Prompt/model/output/audit records. |
| suppressionList | Global opt-out and do-not-contact records. |
| auditLogs | Security and business audit trail. |
| systemErrors | Normalized operational errors. |

## 27. Lead schema
Lead {
  _id,
  organizationId,
  companyId?,
  contactId?,
  source: {
    type, url, query, importedAt
  },
  company: {
    name, domain, website, description,
    industry, location, country, employeeRange
  },
  contact: {
    firstName, lastName, fullName, title,
    email, phone, whatsapp, linkedinUrl
  },
  enrichment: {
    technologies[], services[], painPoints[],
    hiringSignals[], businessSignals[], evidence[]
  },
  qualification: {
    score, fitScore, intentScore, confidence,
    matchedServices[], reasons[], evidence[]
  },
  outreach: {
    preferredChannel, status, lastContactedAt,
    nextFollowUpAt
  },
  compliance: {
    sourceUrl, collectedAt, consentStatus,
    doNotContact, suppressionReason
  },
  tags[],
  status,
  createdAt,
  updatedAt
}

## 28. Message schema
Message {
  _id,
  organizationId,
  leadId,
  conversationId?,
  campaignId?,
  sequenceStepId?,
  channel: EMAIL | WHATSAPP,
  direction: INBOUND | OUTBOUND,
  type,
  subject?,
  body,
  attachments[],
  provider,
  providerMessageId?,
  status,
  idempotencyKey,
  scheduledAt?,
  sentAt?,
  deliveredAt?,
  readAt?,
  repliedAt?,
  error?,
  createdAt,
  updatedAt
}

## 29. MongoDB indexes
- Unique or compound unique indexes for organizationId + normalized email/domain/profile URL where appropriate.
- lead status, qualification.score, outreach.nextFollowUpAt.
- message leadId, campaignId, providerMessageId, idempotencyKey.
- conversation leadId + channel.
- meeting leadId + startTime.
- audit organizationId + timestamp.
- Jobs status + scheduledAt.
- All multi-tenant queries must include organizationId.

## 30. API conventions
- Base path: /api/v1.
- JSON request/response.
- Zod validation at API boundary.
- Consistent error envelope.
- Pagination using cursor where possible.
- Idempotency-Key header for side-effecting endpoints.
- Authentication middleware on protected routes.
- Authorization checks after authentication.
- Request correlation ID on every request.
Success:
{
  "data": {...},
  "meta": {...}
}

Error:
{
  "error": {
    "code": "LEAD_NOT_FOUND",
    "message": "Lead was not found",
    "requestId": "..."
  }
}

## 31. Required API surface

| Area | Endpoints |
| --- | --- |
| Auth | POST /auth/login, POST /auth/logout, GET /auth/me |
| Leads | GET/POST /leads, GET/PATCH/DELETE /leads/:id, POST /leads/import, POST /leads/:id/enrich, POST /leads/:id/score |
| Search | POST /search/jobs, GET /search/jobs/:id, POST /search/preview |
| Campaigns | GET/POST /campaigns, GET/PATCH /campaigns/:id, POST /campaigns/:id/start, /pause, /resume |
| Messages | GET /messages, POST /messages/generate, POST /messages/:id/send, POST /messages/:id/schedule |
| Email | GET /email/accounts, POST /email/connect, POST /email/send, POST /webhooks/gmail |
| WhatsApp | GET /whatsapp/accounts, POST /whatsapp/accounts, POST /whatsapp/accounts/:id/connect, /disconnect, /qr, POST /whatsapp/send, POST /webhooks/whatsapp |
| Calendar | GET /calendar/availability, POST /calendar/events, PATCH /calendar/events/:id |
| Assets | GET/POST /assets, DELETE /assets/:id |
| Health | GET /health, /health/live, /health/ready, /health/dependencies |
| Audit | GET /audit-logs |

## 32. Queue architecture
Redis
 ├─ discovery
 ├─ crawl
 ├─ enrichment
 ├─ qualification
 ├─ ai-generation
 ├─ email-send
 ├─ whatsapp-send
 ├─ follow-up
 ├─ reply-processing
 ├─ calendar
 └─ notifications
BullMQ is the job execution layer. Use delayed jobs for follow-ups, retries with backoff for transient failures, concurrency controls, and rate limits. Do not rely on an obsolete QueueScheduler pattern; current BullMQ documentation notes QueueScheduler is deprecated from BullMQ 2 onward.

## 33. Job requirements
- Every job has a stable business idempotency key where side effects are possible.
- Retries use exponential/fixed backoff according to error type.
- Unrecoverable errors must stop retrying.
- Rate-limit responses must delay the job rather than count as a normal failure.
- Failed jobs are visible in System Health.
- Manual retry is available to admins/operators.
- Job payloads should contain IDs and compact data; workers load current state from DB.
- Workers must be horizontally scalable.

## 34. Idempotency rules
For email/WhatsApp sends, construct a logical key such as organizationId + campaignId + leadId + sequenceStepId. Persist it before/with dispatch and enforce a unique constraint. If a provider times out after accepting a message, the system must reconcile by provider message/thread ID before retrying.
The goal is not a false promise of mathematical exactly-once delivery; the product must behave safely under at-least-once execution and external-provider ambiguity.

## 35. Rate limiting
- Separate discovery, enrichment, AI, email and WhatsApp limits.
- Limits can be global, per organization, per provider account and per campaign.
- Use BullMQ rate limiting where appropriate.
- Respect provider 429 responses and retry-after signals.
- Do not hard-code aggressive platform-specific volumes; expose configurable safety limits.

## 36. Webhooks
- Validate provider signature/authentication when supported.
- Persist raw event metadata for debugging with retention controls.
- Deduplicate webhook event IDs.
- Immediately enqueue processing; do not run heavy AI/crawl logic inside webhook request.
- Return quickly after persistence/queueing.
- Handle replayed events safely.

## 37. Security requirements
- HTTPS in production.
- Secure, httpOnly, sameSite cookies if cookie-based sessions are used.
- OAuth tokens encrypted at rest.
- Secrets only in server-side environment/configuration.
- Role-based access control.
- Organization scoping on every data access.
- Audit logs for authentication, integrations and outbound actions.
- Input validation and output encoding.
- File type/size validation.
- SSRF protection for crawler URLs: block localhost, private IP ranges, metadata endpoints and unsafe schemes.
- Rate-limit public/auth endpoints.
- CSRF protection where applicable.
- Do not log access tokens, refresh tokens, passwords or full message bodies unnecessarily.

## 38. Scraping/crawling safety
- Only crawl URLs permitted by the product's policy and configuration.
- Honor configured robots/policy behavior where applicable.
- Set request timeout and maximum response size.
- Restrict content types.
- Limit pages per domain.
- Use a safe redirect policy.
- Detect repeated 403/429 and back off.
- Never let one hostile page execute arbitrary server-side commands.
- Run browser automation in an isolated worker/container.

## 39. Compliance / suppression
- Global do-not-contact list by email, phone and domain.
- Per-lead suppression state.
- Opt-out keywords and manual suppression.
- Campaign send checks must query suppression immediately before dispatch.
- Store source URL and collection timestamp for lead provenance.
- Provide data deletion/export capability for workspace records.
- Treat legal requirements as deployment-specific; the software must provide controls, not claim universal legal compliance.

## 40. AI safety and grounding
- Do not invent company achievements, funding, hiring, customers, technologies or pain points.
- Every personalized claim must be traceable to evidence stored on the lead.
- If evidence is insufficient, use neutral language.
- AI-generated outbound content is always subject to deterministic validation.
- Never allow prompt injection from scraped webpage content to alter system policy.
- Treat scraped content as untrusted input.
- System prompts and policy rules must be separated from lead content.

## 41. Observability
- Structured JSON logs using Pino or equivalent.
- Request ID / correlation ID.
- Worker job ID in logs.
- Integration health checks.
- Queue depth metrics.
- Failed job counts.
- Outbound success/failure metrics.
- AI provider latency/error metrics.
- Crawler response codes and domain failure rates.
- Admin System Health page.

## 42. System health UI
System Health
--------------------------------
API             HEALTHY
MongoDB         HEALTHY
Redis           HEALTHY
Workers         6/6 ONLINE
SearXNG         HEALTHY
Gmail           CONNECTED
Google Calendar CONNECTED
OpenWA          CONNECTED
AI Provider     HEALTHY

Queues
discovery       12 waiting
crawl            4 waiting
email            7 delayed
whatsapp         2 waiting

Failures today: 3

## 43. Repository structure
leadpilot/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── hooks/
│   │   ├── lib/
│   │   └── styles/
│   ├── api/
│   │   └── src/
│   │       ├── modules/
│   │       ├── middleware/
│   │       ├── plugins/
│   │       ├── routes/
│   │       └── server.ts
│   ├── worker/
│   │   └── src/
│   │       ├── queues/
│   │       ├── processors/
│   │       └── worker.ts
│   └── scraper/
│       └── src/
│           ├── engines/
│           ├── extractors/
│           └── crawler.ts
├── packages/
│   ├── database/
│   ├── types/
│   ├── validation/
│   ├── ai/
│   ├── email/
│   ├── whatsapp/
│   ├── scraping/
│   ├── calendar/
│   ├── logger/
│   └── config/
├── infrastructure/
│   ├── docker/
│   ├── caddy/
│   └── scripts/
├── docs/
├── docker-compose.yml
├── docker-compose.prod.yml
├── pnpm-workspace.yaml
└── turbo.json

## 44. Frontend page map

| Route | Purpose |
| --- | --- |
| / | Redirect to dashboard |
| /dashboard | KPIs, activity, health, approvals |
| /leads | Lead table |
| /leads/:id | Lead intelligence + timeline |
| /finder | Lead discovery form/results |
| /companies | Company list |
| /contacts | Contact list |
| /campaigns | Campaign list |
| /campaigns/new | Campaign builder |
| /campaigns/:id | Campaign dashboard |
| /inbox | Unified conversations |
| /whatsapp | WhatsApp accounts/conversations |
| /email | Email accounts/composer |
| /meetings | Meeting list/calendar |
| /assets | Asset library |
| /analytics | Performance analytics |
| /automation | Automation rules |
| /settings/* | Integrations, workspace, permissions, limits |
| /system | Jobs, health, errors, audit |

## 45. Campaign builder UX
1. Step 1: Campaign basics.
1. Step 2: Audience/service filters.
1. Step 3: Channel selection.
1. Step 4: Sequence builder.
1. Step 5: AI personalization rules.
1. Step 6: Assets and attachments.
1. Step 7: Sending limits and schedule.
1. Step 8: Preview sample leads.
1. Step 9: Compliance/readiness checks.
1. Step 10: Save as Draft / Activate.

## 46. Readiness checks before campaign activation
- Sending account connected.
- At least one valid channel configured.
- At least one sequence step.
- Template variables valid.
- Attachments exist.
- Suppression checks enabled.
- Daily/hourly limits configured.
- No invalid audience query.
- AI provider available if AI generation is required.
- Timezone and working hours configured.

## 47. Email provider adapter
interface EmailProvider {
  connect(): Promise<void>
  send(input: SendEmailInput): Promise<ProviderSendResult>
  getThread(id: string): Promise<EmailThread>
  listInbound(cursor?: string): Promise<InboundEmail[]>
  health(): Promise<ProviderHealth>
}

## 48. WhatsApp provider adapter
interface WhatsAppProvider {
  createSession(): Promise<Session>
  getStatus(sessionId: string): Promise<SessionStatus>
  getQr(sessionId: string): Promise<QrResult>
  sendText(input: SendWhatsAppInput): Promise<ProviderSendResult>
  receiveWebhook(payload: unknown): Promise<InboundEvent>
  disconnect(sessionId: string): Promise<void>
  health(): Promise<ProviderHealth>
}

## 49. AI provider adapter
interface AIProvider {
  generateText(input: AIRequest): Promise<AIResponse>
  generateStructured<T>(input: AIRequest, schema: ZodSchema<T>): Promise<T>
  health(): Promise<ProviderHealth>
}

## 50. Search provider adapter
interface SearchProvider {
  search(query: string, options: SearchOptions): Promise<SearchResult[]>
  health(): Promise<ProviderHealth>
}

## 51. Calendar adapter
interface CalendarProvider {
  getAvailability(input: AvailabilityInput): Promise<AvailabilitySlot[]>
  createEvent(input: CreateMeetingInput): Promise<MeetingResult>
  updateEvent(id: string, input: UpdateMeetingInput): Promise<MeetingResult>
  cancelEvent(id: string): Promise<void>
}

## 52. Recommended technologies

| Layer | Choice | Reason |
| --- | --- | --- |
| Frontend | Next.js 16.x + TypeScript | Current React framework; strong app architecture and responsive web app foundation. |
| UI | Tailwind + shadcn/ui + Lucide | Fast, consistent, accessible component system. |
| API | Node.js + TypeScript + Fastify | Lightweight, typed, fast HTTP layer. |
| Validation | Zod | Runtime validation and shared schemas. |
| DB | MongoDB Community | Free/self-managed option; document model fits evolving lead data. |
| ODM | Mongoose | Typed schemas, indexes and familiar Node integration. |
| Queue | BullMQ + Redis | Delayed jobs, retries, concurrency, rate limiting and scheduled work. |
| Search | SearXNG | Self-hosted HTTP search API. |
| Static crawl | Cheerio | Fast HTML parsing. |
| Browser crawl | Puppeteer | JS-rendered page extraction when necessary. |
| Email | Gmail API | OAuth-based integration with Google account. |
| Calendar | Google Calendar API | Availability and event creation. |
| WhatsApp | OpenWA adapter | Isolated self-hosted gateway. |
| Automation | n8n optional | External integrations and workflows; not core state store. |
| Testing | Vitest + Playwright | Unit/integration + end-to-end. |
| Containers | Docker Compose | Low-cost reproducible environment. |

## 53. Current research notes
The implementation choices below were checked against current official documentation as of 8 September 2026.
- Next.js documentation currently lists 16.3.4 as the latest version. Its August 2026 security release also emphasizes staying on patched releases, so pin a current patched version rather than blindly using latest at build time.
- BullMQ currently documents queues, delayed/repeatable jobs, retries, concurrency and rate limiting. Current docs also state QueueScheduler is deprecated from BullMQ 2 onward; do not copy old QueueScheduler tutorials into the implementation.
- SearXNG exposes HTTP GET/POST search endpoints and can return JSON when the instance enables that format.
- MongoDB Community can be run with the official Docker image and is free/self-managed; production backup/monitoring still needs to be designed.
- Google Calendar's events.insert creates events and supports a primary calendar identifier.
- OpenWA is used here as a separately deployed WhatsApp gateway; integration must be isolated behind an adapter so it can be replaced later.

## 54. Environment variables
NODE_ENV=
APP_URL=
API_URL=

MONGODB_URI=
REDIS_URL=

AUTH_SECRET=
ENCRYPTION_KEY=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=

SEARXNG_URL=

OPENWA_URL=
OPENWA_API_KEY=

AI_PROVIDER=
GROQ_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=

STORAGE_DRIVER=local
STORAGE_PATH=

LOG_LEVEL=info

## 55. Docker services
services:
  web
  api
  worker
  mongo
  redis
  searxng
  openwa
  n8n (optional)
  caddy (production)
Production should use persistent volumes for MongoDB, Redis where required by the queue design, and attachment storage. Backups must be tested, not merely configured.

## 56. Deployment modes

| Mode | Use |
| --- | --- |
| Local Docker | Development and testing. |
| Single VPS Docker Compose | Lowest-cost first production deployment. |
| Managed DB + VPS | When reliability/backups matter more than lowest cost. |
| Multi-node | Later, when queue/workload requires horizontal scaling. |

## 57. Cost strategy
- Keep application software open-source/free wherever practical.
- Self-host MongoDB Community, Redis, SearXNG, workers and OpenWA for low software cost.
- Use Gmail/Calendar APIs instead of paid email/meeting platforms for MVP.
- AI provider costs depend on chosen model; build local/free-provider adapters first.
- Infrastructure is not guaranteed to be $0 in production: domain, VPS, backups, bandwidth, email reputation and third-party API usage can create costs.
- Never design the product around a fragile 'free tier forever' assumption.

## 58. Testing strategy

### 58.1 Unit tests
- Lead normalization.
- URL normalization.
- Email/phone normalization.
- Scoring.
- Service matching.
- Suppression checks.
- Template rendering.
- State transitions.
- Idempotency keys.
- Rate-limit policy.
- AI output schema validation.

### 58.2 Integration tests
- MongoDB repositories.
- Redis/BullMQ jobs.
- Gmail adapter with mocks.
- Calendar adapter with mocks.
- OpenWA adapter with mocks.
- SearXNG adapter.
- Crawler safety checks.

### 58.3 End-to-end
- Onboarding.
- Lead import.
- Lead finder run.
- Lead qualification.
- Campaign activation.
- Approval and email send.
- Reply ingestion.
- Meeting creation.
- WhatsApp connect/send/receive using a test account.

## 59. Acceptance criteria

| Feature | Must pass |
| --- | --- |
| Auth | User can sign in/out; unauthorized API requests rejected. |
| CRM | Create/import/edit/filter/dedupe leads. |
| Finder | Search job creates results and processes asynchronously. |
| Crawler | Static and JS pages can be processed without blocking API. |
| Scoring | Score has component evidence and deterministic output. |
| AI | Structured output validates; provider failure falls back or fails visibly. |
| Email | OAuth, preview, attachment, queue, send, log, reply match. |
| Follow-up | Delayed job stops on reply/opt-out and retries transient errors. |
| WhatsApp | Session state, QR, send/receive, logging and failure handling. |
| Calendar | Availability and event creation work with timezone handling. |
| Security | Secrets are server-side/encrypted; SSRF protection exists. |
| Observability | Failed jobs and integration health visible in UI. |
| Audit | Important actions produce audit events. |
| Mobile | Core lead/inbox/campaign views usable on phone width. |

## 60. Failure scenarios that MUST be handled
- MongoDB temporarily unavailable.
- Redis temporarily unavailable.
- AI provider timeout.
- AI provider quota/rate limit.
- Search provider returns 429.
- Website returns 403/429/500.
- Website hangs.
- Puppeteer crashes.
- Gmail token expires.
- Gmail send times out after provider accepted the message.
- OpenWA disconnects.
- WhatsApp QR expires.
- Inbound webhook arrives twice.
- Same lead imported twice.
- User pauses campaign while jobs are queued.
- Lead opts out while a send is queued.
- Calendar event creation fails after reply classification.
- Worker crashes during processing.

## 61. Exact behavior for key failure cases

| Failure | Required behavior |
| --- | --- |
| AI timeout | Retry transiently; then use fallback provider or mark AI job failed for review. |
| Email timeout | Reconcile provider/thread state before retrying to avoid duplicate send. |
| Opt-out while queued | Send worker re-checks suppression and cancels job. |
| Campaign paused | Workers re-check campaign state before dispatch. |
| Duplicate webhook | Ignore via provider event ID/idempotency key. |
| OpenWA offline | Mark account disconnected; pause WhatsApp jobs; expose reconnect action. |
| Crawler 429 | Backoff domain; do not hammer URL. |
| Invalid AI output | Reject, log validation failure and retry with constrained prompt/model. |
| Worker crash | Job becomes retryable according to queue configuration. |

## 62. Analytics definitions
Qualified Rate = qualified leads / discovered leads
Contact Rate = contacted leads / qualified leads
Delivery Rate = delivered / sent
Reply Rate = replies / delivered
Positive Reply Rate = interested / replies
Meeting Rate = meetings / positive replies
Win Rate = won / qualified
Channel Reply Rate = channel replies / channel delivered
Analytics must use persisted event/message state, not frontend counters.

## 63. Security checklist before production
- Rotate all development secrets.
- Enable HTTPS.
- Encrypt OAuth refresh tokens.
- Verify cookie/session configuration.
- Enable RBAC.
- Test cross-organization data isolation.
- Test SSRF protection.
- Limit file upload size/type.
- Add rate limits to auth and webhook endpoints.
- Review logs for secret leakage.
- Configure database backups.
- Test restore from backup.
- Set retention for raw webhook/crawl data.
- Pin and patch dependencies.
- Run npm/pnpm audit plus SAST/dependency scanning appropriate to the repository.

## 64. Implementation phases

| Phase | Deliverables | Exit criteria |
| --- | --- | --- |
| P0 Foundation | Monorepo, Docker, DB, Redis, auth, design system | App boots locally and CI passes. |
| P1 CRM | Leads, companies, contacts, filters, timeline | Manual CRM usable. |
| P2 Discovery | SearXNG, crawl, extraction, dedupe | Search creates qualified candidate records. |
| P3 AI | Scoring, service match, message generation | Grounded structured AI output works. |
| P4 Email | Gmail OAuth, composer, attachments, send, inbound | Email lifecycle works end-to-end. |
| P5 Campaigns | Sequences, scheduler, stop rules, analytics | 24/7 email sequence works safely. |
| P6 WhatsApp | OpenWA integration, QR, send/receive | Dedicated test number works end-to-end. |
| P7 Calendar | Availability, booking, event sync | Meeting flow works. |
| P8 LinkedIn assist | CSV/manual URL/import/enrichment | LinkedIn-supplied leads enter CRM. |
| P9 Hardening | Security, observability, backups, load tests | Production readiness checklist passes. |

## 65. First MVP definition
The first usable MVP should include: authentication, workspace, service profiles, manual/CSV lead import, lead CRM, SearXNG discovery, basic crawling, scoring, Gmail OAuth, message generation, approval workflow, campaign sequences, follow-ups, reply detection, suppression, audit logs and a dashboard. WhatsApp and Calendar can be added immediately after the email core is stable.
Do not attempt a giant first deployment. The architecture must be complete now, but implementation must be incremental.

## 66. Definition of done for the whole product
- A user can onboard without editing source code.
- A user can define services/niches and discover leads.
- Leads are deduplicated and evidence-backed.
- A user can inspect why a lead is qualified.
- AI-generated outreach is grounded and validated.
- Gmail can send and receive with thread matching.
- Follow-ups are scheduled and safely stopped.
- WhatsApp can be connected through OpenWA and conversations are logged.
- LinkedIn-supplied data can be imported without requiring direct account automation.
- Replies can trigger human review, follow-up or calendar flow.
- Meetings appear in Google Calendar.
- All outbound actions are auditable.
- Failures are visible and retryable.
- The application can run continuously without keeping a browser tab open.
- The system can be deployed with Docker Compose.
- The core codebase is structured for later multi-tenant SaaS.

## 67. Recommended initial GitHub repository files
README.md
LICENSE
SECURITY.md
CONTRIBUTING.md
CHANGELOG.md
.env.example
docker-compose.yml
docker-compose.prod.yml
pnpm-workspace.yaml
turbo.json
package.json

apps/web/
apps/api/
apps/worker/
apps/scraper/

packages/database/
packages/types/
packages/validation/
packages/ai/
packages/email/
packages/whatsapp/
packages/scraping/
packages/calendar/
packages/logger/
packages/config/

docs/architecture.md
docs/api.md
docs/database.md
docs/security.md
docs/deployment.md
docs/integrations/gmail.md
docs/integrations/calendar.md
docs/integrations/openwa.md
docs/integrations/searxng.md

## 68. Research references
Official/current references used to validate technology choices:
Next.js Docs: https://nextjs.org/docs
BullMQ Docs: https://docs.bullmq.io/
BullMQ Rate Limiting: https://docs.bullmq.io/guide/rate-limiting
BullMQ Retrying Jobs: https://docs.bullmq.io/guide/retrying-job
SearXNG Search API: https://docs.searxng.org/dev/search_api.html
MongoDB Community Docker: https://www.mongodb.com/docs/v8.0/tutorial/install-mongodb-community-with-docker/
Google Calendar Create Events: https://developers.google.com/workspace/calendar/api/guides/create-events
OpenWA: https://github.com/rmyndharis/OpenWA
Puppeteer: https://github.com/puppeteer/puppeteer
Cheerio: https://github.com/cheeriojs/cheerio
Tiptap: https://github.com/ueberdosis/tiptap
n8n: https://docs.n8n.io/

## 69. AI coding-agent handoff prompt
Use the following as the operating instruction when giving this document to an AI coding agent:
You are implementing LeadPilot OS from the attached Master PRD.
Treat this PRD as the source of truth.

Rules:
1. Do not invent requirements that contradict this document.
2. Implement in phases; do not create a giant untestable first commit.
3. Keep API, worker and UI separated.
4. Use TypeScript throughout.
5. Validate all external input with Zod.
6. Keep third-party providers behind adapters.
7. Keep all secrets server-side.
8. Make side effects idempotent.
9. Re-check campaign state and suppression immediately before outbound send.
10. Add unit/integration tests with every core module.
11. Add audit logs for important actions.
12. Do not silently swallow errors.
13. Do not claim a feature works until its acceptance criteria and tests pass.
14. Prefer open-source/self-hosted components where this PRD specifies them.
15. When a third-party API is unavailable, implement the adapter interface and a mock/test provider rather than hard-coding a fake production integration.
16. Never bypass platform restrictions or build hidden account-automation behavior.
17. Keep the product usable on desktop and mobile.
18. Update documentation when architecture or API contracts change.

## 70. Final architecture at a glance
┌─────────────────────────────┐
                         │        Next.js Web UI       │
                         │ CRM / Finder / Campaigns    │
                         │ Inbox / Analytics / Admin   │
                         └──────────────┬──────────────┘
                                        │ REST/SSE
                                        ▼
                         ┌─────────────────────────────┐
                         │      Node.js API Layer      │
                         │ Auth / CRM / Policies       │
                         │ Integrations / AI Router    │
                         └───────┬───────────┬─────────┘
                                 │           │
                         ┌───────▼───┐   ┌──▼──────────┐
                         │ MongoDB   │   │ Redis       │
                         │ Source of │   │ BullMQ      │
                         │ truth     │   │ queues      │
                         └───────────┘   └──────┬───────┘
                                               │
                 ┌─────────────────────────────┼─────────────────────────┐
                 │                             │                         │
          ┌──────▼──────┐              ┌───────▼──────┐          ┌───────▼──────┐
          │ Scraper     │              │ Outreach     │          │ Intelligence │
          │ SearXNG     │              │ Gmail        │          │ AI providers │
          │ Cheerio     │              │ OpenWA       │          │ scoring      │
          │ Puppeteer   │              │ Calendar     │          │ classification│
          └─────────────┘              └──────────────┘          └──────────────┘

                    Optional external workflow layer: n8n
                    Deployment: Docker Compose / VPS / later scale-out

## 71. Final product principle
The platform should make the user's work feel automatic while keeping the underlying system deterministic, inspectable and recoverable. The user should be able to look at any lead and answer: Where did this lead come from? Why was it qualified? What evidence was found? Which service matched? What message was generated? Why was it sent? Which channel sent it? Did the client reply? What did the system understand? What happens next? Was a meeting booked? If something failed, can I see and retry it?
END OF MASTER PRD — VERSION 1.0