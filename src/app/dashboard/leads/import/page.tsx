"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, NativeSelect, Textarea } from "@/components/ui/input";
import { api } from "@/lib/api";
import { useApi } from "@/hooks/use-api";

export default function ImportPage() {
  const { data: settings } = useApi<any>("/settings");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    name: "",
    company: "",
    role: "",
    email: "",
    phone: "",
    service: "web_dev",
    source: "manual",
    notes: "",
  });

  async function uploadCsv() {
    if (!file) return toast.error("Choose a CSV file first");
    setBusy(true);
    try {
      const data = new FormData();
      data.append("file", file);
      const result = await api<{ imported: number; skipped: number }>("/leads/import", { method: "POST", body: data });
      toast.success(`Imported ${result.imported}, skipped ${result.skipped}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setBusy(false);
    }
  }

  async function addLead() {
    if (!form.name || !form.company) return toast.error("Name and company are required");
    setBusy(true);
    try {
      const result = await api<{ leadId: string; score: number }>("/leads", { method: "POST", body: form });
      toast.success(`Lead added · score ${result.score}`);
      setForm({ ...form, name: "", company: "", role: "", email: "", phone: "", notes: "" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add lead");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Import leads</h1>
        <p className="text-sm text-slate-500">CSV columns: name, company, role, email, phone, source, service.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>CSV upload</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950">
            <input
              id="csv-file"
              name="csv"
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            {file ? file.name : "Drag & drop CSV here, or click to upload"}
          </label>
          <Button onClick={() => void uploadCsv()} disabled={busy}>
            Upload CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Manual entry</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="company">Company</Label>
            <Input id="company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role">Role</Label>
            <Input id="role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="service">Service</Label>
            <NativeSelect
              id="service"
              className="w-full"
              value={form.service}
              onChange={(e) => setForm({ ...form, service: e.target.value })}
            >
              {settings?.agencyProfile?.services?.map((item: string) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div>
            <Button onClick={() => void addLead()} disabled={busy}>
              Add lead
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
