import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown, Eye, EyeOff, GripVertical } from "lucide-react";
import {
  fetchMyOrganization, fetchOrgEvents, ensureEventForm, updateEventForm,
  fetchFormFields, createFormField, updateFormField, deleteFormField, reorderFormFields,
  FIELD_TYPES,
} from "@/lib/organization";
import type { FieldType, EventFormField } from "@/lib/organization";

export const Route = createFileRoute("/_authenticated/organization/events/$eventId/form")({
  head: () => ({ meta: [{ title: "Registration Form - EventOrbit Nova" }, { name: "robots", content: "noindex" }] }),
  component: FormBuilderPage,
});

function FormBuilderPage() {
  const { eventId } = Route.useParams();
  const qc = useQueryClient();
  const { data: org } = useQuery({ queryKey: ["organization-mine"], queryFn: fetchMyOrganization });
  const { data: events } = useQuery({
    queryKey: ["organization-events", org?.id],
    queryFn: () => fetchOrgEvents(org!.id),
    enabled: !!org?.id,
  });
  const event = (events ?? []).find((e) => e.id === eventId);

  const { data: form } = useQuery({
    queryKey: ["event-form", eventId],
    queryFn: () => ensureEventForm(eventId, org!.id),
    enabled: !!org?.id,
  });

  const { data: fields, isLoading: fieldsLoading } = useQuery({
    queryKey: ["event-form-fields", form?.id],
    queryFn: () => fetchFormFields(form!.id),
    enabled: !!form?.id,
  });

  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<FieldType>("text");
  const [newOptions, setNewOptions] = useState("");
  const [newRequired, setNewRequired] = useState(false);

  async function invalidateFields() {
    if (form?.id) await qc.invalidateQueries({ queryKey: ["event-form-fields", form.id] });
  }

  async function handleAddField(e: React.FormEvent) {
    e.preventDefault();
    if (!form?.id || !newLabel.trim()) return;
    const needsOptions = newType === "dropdown" || newType === "checkbox" || newType === "radio";
    await createFormField(form.id, {
      label: newLabel.trim(),
      field_type: newType,
      is_required: newRequired,
      options: needsOptions ? newOptions.split(",").map((o) => o.trim()).filter(Boolean) : [],
      order_index: (fields?.length ?? 0),
    });
    setNewLabel(""); setNewType("text"); setNewOptions(""); setNewRequired(false);
    await invalidateFields();
  }

  async function handleDeleteField(id: string) {
    if (!window.confirm("Delete this field?")) return;
    await deleteFormField(id);
    await invalidateFields();
  }

  async function handleMove(field: EventFormField, direction: -1 | 1) {
    if (!fields) return;
    const sorted = [...fields].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((f) => f.id === field.id);
    const swapIdx = idx + direction;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx];
    const b = sorted[swapIdx];
    await reorderFormFields([
      { id: a.id, order_index: b.order_index },
      { id: b.id, order_index: a.order_index },
    ]);
    await invalidateFields();
  }

  async function handleTogglePublish() {
    if (!form) return;
    await updateEventForm(form.id, { is_published: !form.is_published });
    await qc.invalidateQueries({ queryKey: ["event-form", eventId] });
  }

  async function handleTeamModeChange(team_mode: "solo" | "team" | "both") {
    if (!form) return;
    await updateEventForm(form.id, { team_mode });
    await qc.invalidateQueries({ queryKey: ["event-form", eventId] });
  }

  const needsOptions = newType === "dropdown" || newType === "checkbox" || newType === "radio";
  const sortedFields = [...(fields ?? [])].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-8 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link to="/organization/events" className="text-sm text-muted-foreground hover:underline">&larr; Back to Events</Link>
          <h1 className="mt-2 font-display text-2xl font-semibold">Registration Form{event ? ` — ${event.title}` : ""}</h1>
          <p className="mt-1 text-sm text-muted-foreground">Build the exact fields participants will fill in to register.</p>
        </div>
        {form && (
          <button
            onClick={handleTogglePublish}
            className={`flex items-center gap-2 shrink-0 rounded-full px-4 py-2 text-sm font-semibold ${
              form.is_published ? "bg-emerald-600 text-white hover:bg-emerald-700" : "border border-input hover:bg-accent"
            }`}
          >
            {form.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {form.is_published ? "Published" : "Draft — Publish"}
          </button>
        )}
      </div>

      {form && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-medium mb-3">Registration mode</p>
          <div className="flex flex-wrap gap-2">
            {(["solo", "team", "both"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleTeamModeChange(mode)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold capitalize ${
                  form.team_mode === mode ? "bg-brand-violet text-white" : "border border-input hover:bg-accent"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleAddField} className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <p className="text-sm font-medium">Add a field</p>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Label *</label>
            <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} required
              placeholder="e.g. GitHub Profile URL" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
          </div>
          <div>
            <label className="text-sm font-medium">Field type</label>
            <select value={newType} onChange={(e) => setNewType(e.target.value as FieldType)}
              className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm">
              {FIELD_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div>
          {needsOptions && (
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Options (comma-separated)</label>
              <input value={newOptions} onChange={(e) => setNewOptions(e.target.value)}
                placeholder="e.g. Beginner, Intermediate, Advanced" className="mt-1.5 w-full rounded-xl border border-input bg-background px-3.5 py-2.5 text-sm" />
            </div>
          )}
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={newRequired} onChange={(e) => setNewRequired(e.target.checked)} className="h-4 w-4 rounded border-input" />
          Required field
        </label>
        <button type="submit" disabled={!form?.id}
          className="flex items-center gap-2 rounded-full bg-brand-violet px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-violet/90 disabled:opacity-50">
          <Plus className="h-4 w-4" /> Add field
        </button>
      </form>

      <div className="space-y-3">
        <p className="text-sm font-medium">Form fields ({sortedFields.length})</p>
        {fieldsLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {!fieldsLoading && sortedFields.length === 0 && (
          <p className="text-sm text-muted-foreground">No fields yet — add your first one above.</p>
        )}
        {sortedFields.map((f, i) => (
          <div key={f.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-3 min-w-0">
              <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="font-medium truncate">{f.label} {f.is_required && <span className="text-rose-500">*</span>}</p>
                <p className="text-xs text-muted-foreground">
                  {FIELD_TYPES.find((t) => t.key === f.field_type)?.label}
                  {f.options.length > 0 && ` · ${f.options.join(", ")}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button disabled={i === 0} onClick={() => handleMove(f, -1)} className="rounded-lg p-1.5 hover:bg-accent disabled:opacity-30" aria-label="Move up">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button disabled={i === sortedFields.length - 1} onClick={() => handleMove(f, 1)} className="rounded-lg p-1.5 hover:bg-accent disabled:opacity-30" aria-label="Move down">
                <ArrowDown className="h-4 w-4" />
              </button>
              <button onClick={() => updateFormField(f.id, { is_required: !f.is_required }).then(invalidateFields)} className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-accent">
                {f.is_required ? "Make optional" : "Make required"}
              </button>
              <button onClick={() => handleDeleteField(f.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" aria-label="Delete field">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
