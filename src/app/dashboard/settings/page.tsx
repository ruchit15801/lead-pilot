"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { Attachment } from "@/lib/types";
import type { ReactNode } from "react";

type Settings = {
  gmailConnected: boolean;
  calendarConnected: boolean;
  sandboxMode: boolean;
  googleOAuthConfigured: boolean;
  aiKeysConfigured: { groq: boolean; gemini: boolean; openrouter: boolean };
  whatsapp: { sessionId: string; status: string; sentToday: number };
  attachments: Attachment[];
  agencyProfile?: {
    url: string;
    name: string;
    description: string;
    services: string[];
    searchQueries: Array<{ service: string; query: string }>;
  };
};

function Row({
  name,
  ok,
  action,
}: {
  name: string;
  ok: boolean;
  action: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div>
        <div className="font-medium">{name}</div>
        <div className="text-sm text-slate-500">{ok ? "Connected" : "Not connected"}</div>
      </div>
      {action}
    </div>
  );
}

export default function SettingsPage() {
  const { data, refetch, error } = useApi<Settings>("/settings");
  const [busy, setBusy] = useState(false);
  const [agencyUrl, setAgencyUrl] = useState("");

  async function configureAgency() {
    if (!agencyUrl || !agencyUrl.startsWith("http")) return toast.error("Enter a valid URL starting with http");
    setBusy(true);
    toast.info("Scraping website and analyzing services via AI...", { duration: 6000 });
    try {
      await api("/settings/agency-profile", { method: "POST", body: { url: agencyUrl } });
      toast.success("Agency profile configured successfully!");
      setAgencyUrl("");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to configure agency");
    } finally {
      setBusy(false);
    }
  }

  async function reconnect(kind: "gmailConnected" | "calendarConnected") {
    setBusy(true);
    try {
      const auth = await api<{ url: string | null; configured: boolean }>("/settings/google-auth-url");
      if (auth.url) {
        window.location.href = auth.url;
        return;
      }
      await api("/settings", { method: "PATCH", body: { [kind]: true } });
      toast.success("Sandbox connection saved");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update integration");
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    const body = new FormData();
    body.append("file", file);
    try {
      await api("/settings/attachments", { method: "POST", body });
      toast.success("Uploaded");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-slate-500">Integrations, AI keys, and attachments for outreach.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Agency Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2 items-center">
            <input
              type="url"
              placeholder="https://youragency.com"
              className="flex-1 rounded-md border border-slate-200 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950"
              value={agencyUrl}
              onChange={(e) => setAgencyUrl(e.target.value)}
              disabled={busy}
            />
            <Button onClick={() => void configureAgency()} disabled={busy}>
              {busy ? "Analyzing..." : "Configure"}
            </Button>
          </div>
          {data?.agencyProfile && (
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-900/50">
              <h3 className="font-semibold text-lg">{data.agencyProfile.name}</h3>
              <p className="text-sm text-slate-500 mt-1">{data.agencyProfile.description}</p>
              <div className="mt-4">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Core Services Detected</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.agencyProfile.services.map((svc) => (
                    <span key={svc} className="rounded bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                      {svc}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
        </CardHeader>
        <CardContent>
          <Row
            name="Gmail"
            ok={Boolean(data?.gmailConnected)}
            action={
              <Button variant="secondary" disabled={busy} onClick={() => void reconnect("gmailConnected")}>
                Reconnect
              </Button>
            }
          />
          <Row
            name="Calendar"
            ok={Boolean(data?.calendarConnected)}
            action={
              <Button variant="secondary" disabled={busy} onClick={() => void reconnect("calendarConnected")}>
                Reconnect
              </Button>
            }
          />
          <Row
            name="WhatsApp"
            ok={data?.whatsapp.status === "connected"}
            action={
              <Button asChild variant="secondary">
                <Link href="/dashboard/whatsapp">Go to WhatsApp page</Link>
              </Button>
            }
          />
          <div className="pt-3 text-sm">
            AI providers: Groq {data?.aiKeysConfigured.groq ? "✓" : "○"} · Gemini {data?.aiKeysConfigured.gemini ? "✓" : "○"} ·
            OpenRouter {data?.aiKeysConfigured.openrouter ? "✓" : "○"}
            <p className="mt-1 text-xs text-slate-500">
              Edit keys in <code className="font-mono">.env</code>. Template fallback stays on if none are set.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Attachments (CV / resume / portfolio)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {(data?.attachments ?? []).map((file) => (
              <span key={file.id} className="rounded-full bg-slate-100 px-3 py-1 text-xs dark:bg-slate-800">
                {file.name}
              </span>
            ))}
            {!data?.attachments.length && <span className="text-sm text-slate-500">None uploaded yet.</span>}
          </div>
          <label className="inline-flex">
            <input
              id="attachment"
              name="attachment"
              type="file"
              className="sr-only"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void upload(file);
              }}
            />
            <span className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-slate-200 px-4 text-sm dark:border-slate-700">
              Upload
            </span>
          </label>
        </CardContent>
      </Card>
    </div>
  );
}
