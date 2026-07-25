import { supabase } from "@/integrations/supabase/client";
// ============================================================
// ADD this block to the TOP of src/lib/organization.ts (after the imports),
// and ADD the functions below to the BOTTOM of the same file.
// Everything else already in organization.ts stays unchanged.
// ============================================================

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
/**
 * Organization dashboard — data access layer.
 * Tables: public.organizations (owner_id = auth.uid()), org_departments,
 * org_members, org_events — all scoped via is_org_manager/is_org_member
 * RLS helper functions from 20260725100000_organization_module_phase1.sql.
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

export async function inviteMember(
  orgId: string,
  invitedEmail: string,
  roleId: string,
  opts?: { fullName?: string; isAdminRole?: boolean; departmentId?: string | null }
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("org_members").insert({
    org_id: orgId,
    invited_email: invitedEmail,
    full_name: opts?.fullName ?? null,
    role_id: roleId,
    is_admin_role: opts?.isAdminRole ?? false,
    department_id: opts?.departmentId ?? null,
    status: "invited",
    invited_by: userData.user?.id ?? null,
  } as never);
  if (error) throw error;
}
  // Note: this creates the DB row only. Actually sending the invite email
  // (magic link / signup link tied to this org_id) is a Phase 2 item —
  // wire it to a Supabase Edge Function or supabase.auth.admin.inviteUserByEmail.


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
