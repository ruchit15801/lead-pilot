"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ChannelMark, ServiceLabel, StatusBadge } from "@/components/leads/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { Lead, Meeting, Message } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type LeadDetail = Lead & { messages: Message[]; meetings: Meeting[] };

export default function LeadDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { data, error, refetch, loading } = useApi<LeadDetail>(params.id ? `/leads/${params.id}` : null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);

  async function act(path: string, body?: unknown, method = "POST") {
    setBusy(true);
    try {
      await api(path, { method, body });
      toast.success("Updated");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to permanently delete this lead and all its history?")) return;
    setBusy(true);
    try {
      await api(`/leads/${data!.id}`, { method: "DELETE" });
      toast.success("Lead deleted");
      router.push("/dashboard/leads");
    } catch (err) {
      toast.error("Failed to delete lead");
    } finally {
      setBusy(false);
    }
  }

  async function handleApplyAndSend() {
    setBusy(true);
    try {
      // Step 1: Auto-enroll in campaign
      await api(`/leads/${data!.id}/auto-enroll`, { method: "POST" });
      // Step 2: Send the first email immediately
      await api("/outreach/send-now", { method: "POST", body: { leadId: data!.id } });
      toast.success("Lead enrolled & first email sent!");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Apply failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <span className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
      <span className="ml-3 text-slate-500">Loading lead...</span>
    </div>
  );
  if (error || !data) return <p className="text-sm text-red-600 bg-red-50 p-4 rounded-xl">{error ?? "Lead not found"}</p>;

  const isActive = ["queued", "contacted"].includes(data.status);
  const isWon = data.status === "meeting_booked" || data.status === "won";
  const isLost = data.status === "lost" || data.status === "discarded";

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <Link href="/dashboard/leads" className="text-sm text-indigo-600 hover:underline dark:text-indigo-400 flex items-center gap-1">
          ← Back to Leads
        </Link>
        <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {data.name}
            </h1>
            <p className="text-slate-500 mt-0.5">{data.company} · {data.role}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={data.status} />
            <ServiceLabel service={data.service} />
            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2.5 py-1 rounded-full font-mono text-xs font-semibold">
              ⭐ {data.score}
            </span>
          </div>
        </div>
      </div>

      {/* Contact Info */}
      <Card>
        <CardContent className="p-5">
          <div className="grid gap-4 sm:grid-cols-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-slate-400">✉️</span>
              <span className="font-medium">{data.email || <span className="text-slate-400 italic">No email</span>}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">📞</span>
              <span className="font-medium">{data.phone || <span className="text-slate-400 italic">No phone</span>}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400">🏢</span>
              <span>{data.source}</span>
            </div>
            {data.sourceUrl && (
              <div className="flex items-center gap-2">
                <span className="text-slate-400">🌐</span>
                <a href={data.sourceUrl} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline truncate">{data.sourceUrl}</a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons — the core automation controls */}
      <Card className="border-indigo-100 dark:border-indigo-900/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            🚀 Actions & Automation
            {data.paused && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">PAUSED</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            {/* APPLY — the main CTA: enroll + send first email */}
            {!isActive && !isWon && !isLost && (
              <Button
                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                disabled={busy || !data.email}
                onClick={handleApplyAndSend}
              >
                {busy ? "Sending..." : "✅ Apply — Send First Email"}
              </Button>
            )}

            {isActive && (
              <>
                <Button variant="secondary" disabled={busy} onClick={() => void act("/outreach/send-now", { leadId: data.id })}>
                  ✉️ Send Next Follow-up Now
                </Button>
                <Button variant="secondary" disabled={busy} onClick={() => void act(`/leads/${data.id}`, { status: "paused" }, "PATCH")}>
                  ⏸️ Pause Sequence
                </Button>
              </>
            )}

            {data.paused && (
              <Button variant="secondary" disabled={busy} onClick={() => void act(`/leads/${data.id}`, { status: "queued", paused: false }, "PATCH")}>
                ▶️ Resume Automation
              </Button>
            )}

            <Button variant="outline" disabled={busy} onClick={() => void act("/meetings", { leadId: data.id })}>
              🗓️ Book Meeting
            </Button>

            {isWon && (
              <Button variant="outline" className="text-emerald-600 border-emerald-200" disabled>
                ✅ Successfully Converted
              </Button>
            )}

            {!isLost && (
              <Button variant="outline" className="text-amber-600 hover:text-amber-700 hover:bg-amber-50 border-amber-200" disabled={busy} onClick={() => void act(`/leads/${data.id}`, { status: "lost" }, "PATCH")}>
                Archive as Lost
              </Button>
            )}

            <Button variant="outline" className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" disabled={busy} onClick={handleDelete}>
              🗑️ Delete Lead
            </Button>
          </div>

          {!data.email && (
            <p className="mt-3 text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
              ⚠️ This lead has no email. You need an email to send outreach. Edit this lead to add one.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Meetings */}
      {data.meetings.length > 0 && (
        <Card className="border-emerald-100 dark:border-emerald-900/50">
          <CardHeader className="pb-3">
            <CardTitle>🗓️ Booked Meetings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.meetings.map((meeting) => (
              <div key={meeting.id} className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl text-sm">
                <div>
                  <div className="font-semibold text-emerald-800 dark:text-emerald-300">{meeting.title}</div>
                  <div className="text-emerald-600 dark:text-emerald-400 text-xs mt-0.5">
                    {formatDate(meeting.slot, true)} · {meeting.durationMinutes} min
                  </div>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-full font-medium uppercase">
                  {meeting.status}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Conversation Timeline — chat-bubble style */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>💬 Conversation Timeline ({data.messages.length} messages)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.messages.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <p className="text-lg mb-1">No messages yet</p>
              <p className="text-sm">Click "Apply" above to send the first outreach email to this lead.</p>
            </div>
          ) : (
            data.messages.map((message) => {
              const isOutbound = message.direction === "outbound";
              return (
                <div key={message.id} className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 text-sm ${
                    isOutbound
                      ? "bg-indigo-600 text-white rounded-br-md"
                      : "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100 rounded-bl-md"
                  }`}>
                    {message.subject && (
                      <div className={`font-semibold mb-1 text-xs ${isOutbound ? "text-indigo-200" : "text-slate-500"}`}>
                        📧 {message.subject}
                      </div>
                    )}
                    <p className="text-pretty whitespace-pre-line">{message.body}</p>
                    <div className={`flex flex-wrap items-center gap-2 mt-2 text-[10px] ${
                      isOutbound ? "text-indigo-200" : "text-slate-400"
                    }`}>
                      <span>{formatDate(message.createdAt, true)}</span>
                      <span>·</span>
                      <span>{isOutbound ? "You → Lead" : "Lead → You"}</span>
                      <span>·</span>
                      <span className="uppercase">{message.status}</span>
                      {message.sentiment && (
                        <>
                          <span>·</span>
                          <span className={`font-semibold ${
                            message.sentiment === "positive" ? "text-emerald-300" : 
                            message.sentiment === "negative" ? "text-red-300" : ""
                          }`}>
                            {message.sentiment === "positive" ? "👍" : message.sentiment === "negative" ? "👎" : "🤔"} {message.sentiment}
                          </span>
                        </>
                      )}
                      {message.errorReason && (
                        <>
                          <span>·</span>
                          <span className="text-red-300">❌ {message.errorReason}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Reply composer — simulate client response for testing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>📨 Simulate Client Reply (Testing)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-slate-500">
            Type a reply as if the client responded. The AI will classify the sentiment (positive → auto-book meeting, negative → stop sequence, neutral → needs review).
          </p>
          <Textarea 
            value={reply} 
            onChange={(e) => setReply(e.target.value)} 
            placeholder="e.g., &quot;Yes, I&apos;m interested! Let&apos;s schedule a call.&quot;"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              disabled={busy || !reply.trim()}
              onClick={() => void act(`/leads/${data.id}/replies`, { text: reply, channel: data.primaryChannel ?? "email" })}
            >
              🔄 Process Reply
            </Button>
            <div className="flex gap-1 text-xs items-center text-slate-400">
              <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded">Positive → Meeting</span>
              <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Negative → Stop</span>
              <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">Neutral → Review</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

