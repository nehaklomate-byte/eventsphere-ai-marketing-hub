import { useRef, useState } from "react";
import { Paperclip, X, FileText, Loader2, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Attachment = { url: string; name: string; type: string; size: number };

const MAX_FILE_MB = 10;
const IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif";
const DOC_TYPES = ".pdf,.doc,.docx,.xls,.xlsx";

function isImage(type: string) { return type.startsWith("image/"); }
function humanSize(bytes: number) { return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }

/**
 * Photo/file attachment picker. Uploads to the shared public
 * `attachments` bucket (migration 20260823110000_attachments_support.sql)
 * under `${pathPrefix}/...`, and reports the running list back via
 * onChange — the caller just stores that list on the row (messages/
 * complaints/customer_reviews/worker_job_postings.attachments jsonb).
 *
 * `photosOnly` restricts the file picker to images (reviews, chat
 * photos) — leave false to also allow PDFs/docs (complaints, job
 * posts, where someone might attach a document or floor plan).
 */
export function AttachmentUpload({
  pathPrefix, value, onChange, photosOnly = false, maxFiles = 6, compact = false,
}: {
  pathPrefix: string; value: Attachment[]; onChange: (next: Attachment[]) => void;
  photosOnly?: boolean; maxFiles?: number; compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = maxFiles - value.length;
    if (remaining <= 0) { toast.error(`You can attach up to ${maxFiles} files.`); return; }
    const picked = Array.from(files).slice(0, remaining);

    setUploading(true);
    const uploaded: Attachment[] = [];
    try {
      for (const file of picked) {
        if (file.size > MAX_FILE_MB * 1024 * 1024) { toast.error(`${file.name} is over ${MAX_FILE_MB}MB — skipped.`); continue; }
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
        const path = `${pathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
        const { error } = await supabase.storage.from("attachments").upload(path, file);
        if (error) { toast.error(`${file.name} failed to upload: ${error.message}`); continue; }
        const { data } = supabase.storage.from("attachments").getPublicUrl(path);
        uploaded.push({ url: data.publicUrl, name: file.name, type: file.type, size: file.size });
      }
      if (uploaded.length) onChange([...value, ...uploaded]);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove(i: number) { onChange(value.filter((_, idx) => idx !== i)); }

  return (
    <div>
      <input ref={inputRef} type="file" multiple accept={photosOnly ? IMAGE_TYPES : `${IMAGE_TYPES},${DOC_TYPES}`}
        className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {value.length === 0 && !uploading ? (
        <button type="button" onClick={() => inputRef.current?.click()}
          className={compact ? "grid h-9 w-9 shrink-0 place-items-center rounded-full border border-input text-muted-foreground hover:bg-accent" : "inline-flex items-center gap-1.5 rounded-full border border-input px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent"}>
          <Paperclip className="h-4 w-4" /> {!compact && (photosOnly ? "Add photos" : "Attach files")}
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          {value.map((a, i) => (
            <div key={a.url} className="group relative">
              {isImage(a.type) ? (
                <img src={a.url} alt={a.name} className="h-16 w-16 rounded-lg border border-border object-cover" />
              ) : (
                <div className="flex h-16 w-16 flex-col items-center justify-center gap-1 rounded-lg border border-border bg-accent/50 p-1 text-center">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span className="w-full truncate text-[9px] text-muted-foreground">{a.name}</span>
                </div>
              )}
              <button type="button" onClick={() => remove(i)} aria-label="Remove attachment"
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background opacity-0 shadow group-hover:opacity-100">
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {value.length < maxFiles && (
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}
              className="grid h-16 w-16 place-items-center rounded-lg border border-dashed border-input text-muted-foreground hover:bg-accent disabled:opacity-60">
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : photosOnly ? <ImageIcon className="h-4 w-4" /> : <Paperclip className="h-4 w-4" />}
            </button>
          )}
        </div>
      )}
      {uploading && value.length === 0 && <p className="mt-1.5 text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Uploading…</p>}
    </div>
  );
}

/** Read-only render of an attachment list — for message bubbles, complaint
 * detail views, review cards, job posting detail. Images show as a
 * thumbnail grid that opens full-size in a new tab; other files show as a
 * clickable filename chip. */
export function AttachmentGallery({ attachments }: { attachments: Attachment[] }) {
  if (!attachments || attachments.length === 0) return null;
  const images = attachments.filter((a) => isImage(a.type));
  const files = attachments.filter((a) => !isImage(a.type));
  return (
    <div className="mt-2 space-y-1.5">
      {images.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {images.map((a) => (
            <a key={a.url} href={a.url} target="_blank" rel="noreferrer">
              <img src={a.url} alt={a.name} className="h-20 w-20 rounded-lg border border-border object-cover hover:opacity-90" />
            </a>
          ))}
        </div>
      )}
      {files.map((a) => (
        <a key={a.url} href={a.url} target="_blank" rel="noreferrer"
          className="flex w-fit items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs hover:bg-accent">
          <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <span className="max-w-[160px] truncate">{a.name}</span>
          <span className="text-muted-foreground shrink-0">{humanSize(a.size)}</span>
        </a>
      ))}
    </div>
  );
}
