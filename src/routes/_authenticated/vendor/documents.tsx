import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSession } from "@/lib/session";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Upload, Loader2, ExternalLink, Trash2 } from "lucide-react";
import { fetchMyVendor, uploadVendorFile } from "@/lib/vendor";

export const Route = createFileRoute("/_authenticated/vendor/documents")({
  head: () => ({ meta: [{ title: "Documents — EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: DocumentsPage,
});

const MAX_MB = 10;

function DocumentsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const [error, setError] = useState<string | null>(null);
  const { data: vendor, isLoading } = useQuery({ queryKey: ["me-vendor", user?.id], queryFn: () => fetchMyVendor(user!.id), enabled: !!user?.id });
  const docs: string[] = Array.isArray(vendor?.documents) ? (vendor!.documents as string[]) : [];

  const saveDocs = useMutation({
    mutationFn: async (next: string[]) => {
      if (!vendor?.id) throw new Error("Vendor profile not found.");
      const { data, error: err } = await supabase.from("vendors").update({ documents: next } as never).eq("id", vendor.id).select().maybeSingle();
      if (err) throw err;
      if (!data) throw new Error("Update was blocked — please refresh and try again.");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me-vendor", user?.id] }),
  });

  const [uploading, setUploading] = useState(false);
  async function onUpload(file: File) {
    setError(null);
    if (file.size > MAX_MB * 1024 * 1024) { setError(`Files must be under ${MAX_MB} MB.`); return; }
    setUploading(true);
    try {
      const url = await uploadVendorFile(user!.id, "documents", file);
      if (!url) throw new Error("Upload failed. Please try again.");
      await saveDocs.mutateAsync([...docs, url]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-brand-violet" /></div>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">Business registration, GST certificate, PAN, insurance and any client-facing catalogues. Visible only to you and platform admins.</p>
      </div>

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-card p-10 text-center hover:border-brand-violet/50">
        {uploading ? <Loader2 className="h-6 w-6 animate-spin text-brand-violet" /> : <Upload className="h-6 w-6 text-muted-foreground" />}
        <span className="text-sm font-semibold">{uploading ? "Uploading…" : "Upload a document"}</span>
        <span className="text-xs text-muted-foreground">PDF, JPG or PNG · up to {MAX_MB} MB</span>
        <input type="file" accept=".pdf,image/*" className="hidden" disabled={uploading}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) void onUpload(f); e.target.value = ""; }} />
      </label>

      {error && <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

      {docs.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No documents uploaded yet.</div>
      ) : (
        <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
          {docs.map((url, i) => (
            <li key={url} className="flex items-center justify-between gap-3 px-5 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate text-sm">Document {i + 1}</span>
              </span>
              <span className="flex items-center gap-2">
                <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 text-[11px] font-semibold hover:bg-accent">
                  <ExternalLink className="h-3.5 w-3.5" /> View
                </a>
                <button onClick={() => saveDocs.mutate(docs.filter((d) => d !== url))} disabled={saveDocs.isPending}
                  className="inline-flex items-center gap-1 rounded-full border border-input px-3 py-1.5 text-[11px] font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-60">
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
