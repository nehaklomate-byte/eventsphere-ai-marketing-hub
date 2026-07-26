import { supabase } from "@/integrations/supabase/client";

/**
 * Organization dashboard — data access layer.
 * Tables: public.organizations (owner_id = auth.uid()), org_departments,
 * org_members, org_events, org_roles, org_event_forms, org_event_form_fields
 * — all scoped via is_org_manager/is_org_member RLS helper functions from
 * 20260725100000_organization_module_phase1.sql,
 * 20260726090000_organization_role_permission_engine.sql, and
 * 20260727090000_organization_form_builder.sql.
 */

export type Organization = {
  id: string;
  owner_id: string;
  name: string;
  org_type: string | null;
  industry: string | null;
  owner_full_name: string | null;
  email: string | null;
  phone: string | null;
  alt_phone: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  pincode: string | null;
  website: string | null;
  gst_number: string | null;
  business_reg_number: string | null;
  verification_status: "pending" | "approved" | "rejected" | "suspended" | "blacklisted";
  rejection_reason: string | null;
  additional_info: Record<string, unknown>;
  created_at: string;
};

export type OrgDepartment = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  created_at: string;
};

export type OrgMember = {
  id: string;
  org_id: string;
  user_id: string | null;
  invited_email: string;
  full_name: string | null;
  role_label: string;
  role_id: string | null;
  invite_token: string | null;
  is_admin_role: boolean;
  department_id: string | null;
  status: "invited" | "active" | "removed";
  invited_by: string | null;
  created_at: string;
};

export type OrgEvent = {
  id: string;
  org_id: string;
  title: string;
  event_type: string;
  description: string | null;
  mode: "online" | "offline" | "hybrid";
  venue_hall_id: string | null;
  custom_location: string | null;
  start_at: string | null;
  end_at: string | null;
  registration_deadline: string | null;
  max_participants: number | null;
  status: "draft" | "published" | "ongoing" | "completed" | "cancelled";
  created_by: string | null;
  created_at: string;
};

/**
 * The fixed platform permission list — this is the full menu of things a
 * role COULD be given. Which permissions any given role actually HAS is
 * fully configurable per organization (org_roles.permissions). Add to this
 * list over time as new modules ship; nothing here is org-specific.
 */
export const PERMISSIONS = [
  { key: "create_event", label: "Create Event" },
  { key: "edit_event", label: "Edit Event" },
  { key: "publish_event", label: "Publish Event" },
  { key: "view_participants", label: "View Participants" },
  { key: "manage_certificates", label: "Manage Certificates" },
  { key: "manage_volunteers", label: "Create/Manage Volunteers" },
  { key: "manage_sponsors", label: "Manage Sponsors" },
  { key: "manage_payments", label: "Manage Payments" },
  { key: "view_reports", label: "View Reports" },
  { key: "scan_qr", label: "Scan QR / Attendance" },
  { key: "approve_registrations", label: "Approve Registrations" },
  { key: "manage_departments", label: "Manage Departments" },
  { key: "invite_members", label: "Invite Team Members" },
] as const;

export type PermissionKey = (typeof PERMISSIONS)[number]["key"];

export type OrgRole = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  permissions: PermissionKey[];
  is_admin_role: boolean;
  is_default: boolean;
  created_at: string;
};

export async function fetchMyOrganization(): Promise<Organization | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("owner_id", userData.user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as Organization) ?? null;
}

// ---- Departments ----

export async function fetchDepartments(orgId: string): Promise<OrgDepartment[]> {
  const { data, error } = await supabase
    .from("org_departments")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as OrgDepartment[]) ?? [];
}

export async function createDepartment(orgId: string, name: string, description?: string): Promise<void> {
  const { error } = await supabase.from("org_departments").insert({ org_id: orgId, name, description: description ?? null } as never);
  if (error) throw error;
}

export async function deleteDepartment(id: string): Promise<void> {
  const { error } = await supabase.from("org_departments").delete().eq("id", id);
  if (error) throw error;
}

// ---- Members ----

export async function fetchMembers(orgId: string): Promise<OrgMember[]> {
  const { data, error } = await supabase
    .from("org_members")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as OrgMember[]) ?? [];
}

// ============================================================
// UPDATE this function in src/lib/organization.ts — REPLACE the existing
// inviteMember function with this version (adds the auto-email call at
// the end; everything else about it is unchanged).
// ============================================================

export async function inviteMember(
  orgId: string,
  invitedEmail: string,
  roleId: string,
  opts?: { fullName?: string; isAdminRole?: boolean; departmentId?: string | null; orgName?: string; roleName?: string }
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { data: inserted, error } = await supabase
    .from("org_members")
    .insert({
      org_id: orgId,
      invited_email: invitedEmail,
      full_name: opts?.fullName ?? null,
      role_id: roleId,
      is_admin_role: opts?.isAdminRole ?? false,
      department_id: opts?.departmentId ?? null,
      status: "invited",
      invited_by: userData.user?.id ?? null,
    } as never)
    .select("id, invite_token")
    .single();
  if (error) throw error;

  // Fire-and-forget the invite email. If it fails, the member row still
  // exists and the "Copy invite link" button still works as a fallback.
  const row = inserted as unknown as { id: string; invite_token: string };
  try {
    await supabase.functions.invoke("send-org-invite", {
      body: {
        email: invitedEmail,
        orgName: opts?.orgName ?? "your organization",
        roleName: opts?.roleName ?? "a team member",
        token: row.invite_token,
      },
    });
  } catch {
    // Swallow — email sending failure shouldn't block the invite itself.
  }
}

export async function updateMemberRole(id: string, roleLabel: string, isAdminRole: boolean): Promise<void> {
  const { error } = await supabase.from("org_members").update({ role_label: roleLabel, is_admin_role: isAdminRole } as never).eq("id", id);
  if (error) throw error;
}

export async function removeMember(id: string): Promise<void> {
  const { error } = await supabase.from("org_members").update({ status: "removed" } as never).eq("id", id);
  if (error) throw error;
}

// ---- Events ----

export async function fetchOrgEvents(orgId: string): Promise<OrgEvent[]> {
  const { data, error } = await supabase
    .from("org_events")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as unknown as OrgEvent[]) ?? [];
}

export async function createOrgEvent(orgId: string, patch: Partial<OrgEvent> & { title: string }): Promise<OrgEvent> {
  const { data: userData } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("org_events")
    .insert({ org_id: orgId, created_by: userData.user?.id ?? null, ...patch } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as OrgEvent;
}

export async function updateOrgEvent(id: string, patch: Partial<OrgEvent>): Promise<void> {
  const { error } = await supabase.from("org_events").update(patch as never).eq("id", id);
  if (error) throw error;
}

// ---- Roles ----

export async function fetchRoles(orgId: string): Promise<OrgRole[]> {
  const { data, error } = await supabase
    .from("org_roles")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as unknown as OrgRole[]) ?? [];
}

export async function createRole(
  orgId: string,
  name: string,
  permissions: PermissionKey[],
  opts?: { description?: string; isAdminRole?: boolean }
): Promise<OrgRole> {
  const { data, error } = await supabase
    .from("org_roles")
    .insert({
      org_id: orgId,
      name,
      description: opts?.description ?? null,
      permissions,
      is_admin_role: opts?.isAdminRole ?? false,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as OrgRole;
}

export async function updateRole(id: string, patch: Partial<Pick<OrgRole, "name" | "description" | "permissions" | "is_admin_role">>): Promise<void> {
  const { error } = await supabase.from("org_roles").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteRole(id: string): Promise<void> {
  const { error } = await supabase.from("org_roles").delete().eq("id", id);
  if (error) throw error;
}

/** Client-side permission check for conditionally showing/hiding UI.
 *  The real enforcement is server-side via org_member_has_permission() +
 *  RLS — this is just for hiding buttons the user can't use anyway. */
export function memberHasPermission(role: OrgRole | null | undefined, permission: PermissionKey): boolean {
  if (!role) return false;
  if (role.is_admin_role) return true;
  return role.permissions.includes(permission);
}

// ---- Invite-by-link join flow ----

export type InviteLookup = {
  id: string;
  org_id: string;
  org_name: string;
  invited_email: string;
  full_name: string | null;
  role_name: string;
  status: OrgMember["status"];
  invite_expires_at: string | null;
};

/** Looked up publicly (by an authenticated-but-not-yet-a-member user) using
 * the random invite_token from the link — see RLS policy in
 * 20260726090000_organization_role_permission_engine.sql. */
export async function lookupInvite(token: string): Promise<InviteLookup | null> {
  const { data, error } = await supabase
    .from("org_members")
    .select("id, org_id, invited_email, full_name, status, invite_expires_at, org:organizations(name), role:org_roles(name)")
    .eq("invite_token", token)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const d = data as unknown as {
    id: string; org_id: string; invited_email: string; full_name: string | null;
    status: OrgMember["status"]; invite_expires_at: string | null;
    org: { name: string } | null; role: { name: string } | null;
  };
  return {
    id: d.id, org_id: d.org_id, invited_email: d.invited_email, full_name: d.full_name,
    status: d.status, invite_expires_at: d.invite_expires_at,
    org_name: d.org?.name ?? "Organization", role_name: d.role?.name ?? "Member",
  };
}

/** Call after the invited person has signed up / logged in with the SAME
 * email the invite was sent to. Flips invited -> active and attaches
 * their auth user_id, per the "Invited user claims own membership" policy. */
export async function acceptInvite(memberId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) throw new Error("You must be logged in to accept an invite.");
  const { error } = await supabase
    .from("org_members")
    .update({ status: "active", user_id: userData.user.id } as never)
    .eq("id", memberId);
  if (error) throw error;
}

/** Fetch the caller's own active membership + role in a given org, so the
 * dashboard can decide what to show them. Returns null if not a member. */
export async function fetchMyMembership(orgId: string): Promise<(OrgMember & { role: OrgRole | null }) | null> {
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;
  const { data, error } = await supabase
    .from("org_members")
    .select("*, role:org_roles(*)")
    .eq("org_id", orgId)
    .eq("user_id", userData.user.id)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return (data as unknown as (OrgMember & { role: OrgRole | null })) ?? null;
}

// ---- Registration Form Builder ----

export const FIELD_TYPES = [
  { key: "text", label: "Short Text" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "textarea", label: "Paragraph" },
  { key: "number", label: "Number" },
  { key: "date", label: "Date" },
  { key: "dropdown", label: "Dropdown" },
  { key: "checkbox", label: "Checkboxes (multi-select)" },
  { key: "radio", label: "Radio (single choice)" },
  { key: "upload", label: "File Upload" },
  { key: "url", label: "URL (GitHub / LinkedIn / Portfolio)" },
  { key: "rating", label: "Rating (1-5)" },
] as const;

export type FieldType = (typeof FIELD_TYPES)[number]["key"];

export type EventForm = {
  id: string;
  event_id: string;
  org_id: string;
  team_mode: "solo" | "team" | "both";
  min_team_size: number;
  max_team_size: number;
  is_published: boolean;
  created_at: string;
};

export type EventFormField = {
  id: string;
  form_id: string;
  label: string;
  field_type: FieldType;
  placeholder: string | null;
  options: string[];
  is_required: boolean;
  order_index: number;
  created_at: string;
};

/** Gets the form for an event, creating an empty draft one if it doesn't
 * exist yet — so the builder UI always has something to render into. */
export async function ensureEventForm(eventId: string, orgId: string): Promise<EventForm> {
  const { data: existing, error: findErr } = await supabase
    .from("org_event_forms")
    .select("*")
    .eq("event_id", eventId)
    .maybeSingle();
  if (findErr) throw findErr;
  if (existing) return existing as unknown as EventForm;

  const { data, error } = await supabase
    .from("org_event_forms")
    .insert({ event_id: eventId, org_id: orgId } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as EventForm;
}

export async function updateEventForm(id: string, patch: Partial<Pick<EventForm, "team_mode" | "min_team_size" | "max_team_size" | "is_published">>): Promise<void> {
  const { error } = await supabase.from("org_event_forms").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function fetchFormFields(formId: string): Promise<EventFormField[]> {
  const { data, error } = await supabase
    .from("org_event_form_fields")
    .select("*")
    .eq("form_id", formId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data as unknown as EventFormField[]) ?? [];
}

export async function createFormField(
  formId: string,
  field: { label: string; field_type: FieldType; placeholder?: string; options?: string[]; is_required?: boolean; order_index: number }
): Promise<EventFormField> {
  const { data, error } = await supabase
    .from("org_event_form_fields")
    .insert({
      form_id: formId,
      label: field.label,
      field_type: field.field_type,
      placeholder: field.placeholder ?? null,
      options: field.options ?? [],
      is_required: field.is_required ?? false,
      order_index: field.order_index,
    } as never)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as EventFormField;
}

export async function updateFormField(id: string, patch: Partial<Omit<EventFormField, "id" | "form_id" | "created_at">>): Promise<void> {
  const { error } = await supabase.from("org_event_form_fields").update(patch as never).eq("id", id);
  if (error) throw error;
}

export async function deleteFormField(id: string): Promise<void> {
  const { error } = await supabase.from("org_event_form_fields").delete().eq("id", id);
  if (error) throw error;
}

/** Persists a full reorder in one go — call after a drag-and-drop reorder
 * or after moving a field up/down in the list. */
export async function reorderFormFields(fields: { id: string; order_index: number }[]): Promise<void> {
  await Promise.all(fields.map((f) => supabase.from("org_event_form_fields").update({ order_index: f.order_index } as never).eq("id", f.id)));
}

/** Public-facing: fetch a published form + its fields by event id, for the
 * future public registration page. Returns null if the event has no
 * published form yet. */
export async function fetchPublishedForm(eventId: string): Promise<{ form: EventForm; fields: EventFormField[] } | null> {
  const { data: form, error } = await supabase
    .from("org_event_forms")
    .select("*")
    .eq("event_id", eventId)
    .eq("is_published", true)
    .maybeSingle();
  if (error) throw error;
  if (!form) return null;
  const fields = await fetchFormFields((form as unknown as EventForm).id);
  return { form: form as unknown as EventForm, fields };
}
