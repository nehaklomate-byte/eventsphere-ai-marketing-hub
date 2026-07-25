import { supabase } from "@/integrations/supabase/client";

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
  roleLabel: string,
  opts?: { fullName?: string; isAdminRole?: boolean; departmentId?: string | null }
): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const { error } = await supabase.from("org_members").insert({
    org_id: orgId,
    invited_email: invitedEmail,
    full_name: opts?.fullName ?? null,
    role_label: roleLabel,
    is_admin_role: opts?.isAdminRole ?? false,
    department_id: opts?.departmentId ?? null,
    status: "invited",
    invited_by: userData.user?.id ?? null,
  } as never);
  if (error) throw error;
  // Note: this creates the DB row only. Actually sending the invite email
  // (magic link / signup link tied to this org_id) is a Phase 2 item —
  // wire it to a Supabase Edge Function or supabase.auth.admin.inviteUserByEmail.
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
