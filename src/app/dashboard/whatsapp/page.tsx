"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApi } from "@/hooks/use-api";
import { api } from "@/lib/api";
import type { WhatsAppSession } from "@/lib/types";

type Status = {
  session: WhatsAppSession;
  limits: { perMinute: number; perHour: number; perDay: number };
  sentToday: number;
};

export default function WhatsAppPage() {
  const { data, refetch, error } = useApi<Status>("/whatsapp/status", 5000);
  const [qr, setQr] = useState<string | null>(null);

  async function refreshQr() {
    if (!data?.session.id) return;
    try {
      const result = await api<{ qrImage: string | null; status: string }>(`/whatsapp/sessions/${data.session.id}/qr`);
      setQr(result.qrImage);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not load QR");
    }
  }

  useEffect(() => {
    if (data?.session.status !== "connected") void refreshQr();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.session.id, data?.session.status]);

  async function connectSandbox() {
    if (!data?.session.id) return;
    try {
      await api(`/whatsapp/sessions/${data.session.id}/sandbox-connect`, { method: "POST" });
      toast.success("WhatsApp marked connected (sandbox)");
      await refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Connect failed");
    }
  }

  const connected = data?.session.status === "connected";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">WhatsApp connection</h1>
        <p className="text-sm text-slate-500">Use a dedicated number. Do not scan with your primary business phone.</p>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className={`h-2.5 w-2.5 rounded-full ${connected ? "bg-emerald-500" : "bg-amber-500"}`} />
            {connected ? "Connected" : "Not connected"}
          </div>
          {!connected && qr && (
            <img src={qr} alt="WhatsApp QR code" className="mx-auto rounded-xl border border-slate-200 dark:border-slate-800" width={280} height={280} />
          )}
          <p className="text-sm text-amber-700 dark:text-amber-300">
            Scan with WhatsApp on your dedicated number. Do not use your primary business number.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => void refreshQr()}>
              Refresh QR
            </Button>
            <Button onClick={() => void connectSandbox()}>Mark connected (sandbox)</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-5 text-sm">
          Rate limit: {data?.limits.perMinute ?? 3} msgs/min · Sent today:{" "}
          <span className="font-mono tabular-nums">
            {data?.sentToday ?? 0}/{data?.limits.perDay ?? 200}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
