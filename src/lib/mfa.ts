import { supabase } from "@/integrations/supabase/client";

export type MfaFactor = {
  id: string;
  friendlyName?: string | null;
  factorType: string;
  status: string;
  createdAt: string;
};

export async function listFactors() {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error) throw error;
  const totp = (data?.totp ?? []).map((f) => ({
    id: f["id"],
    friendlyName: f["friendly_name"],
    factorType: f["factor_type"],
    status: f["status"],
    createdAt: f["created_at"],
  })) as MfaFactor[];
  return totp;
}

export async function enrollTotp(friendlyName = "Authenticator app") {
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName });
  if (error) throw error;
  return {
    factorId: data["id"],
    qrCode: data["totp"]["qr_code"],
    secret: data["totp"]["secret"],
    uri: data["totp"]["uri"],
  };
}

export async function verifyEnrollment(factorId: string, code: string) {
  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError) throw challengeError;
  const { data, error } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge["id"], code });
  if (error) throw error;
  return data;
}

export async function unenroll(factorId: string) {
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  if (error) throw error;
}

export async function getAssuranceLevel() {
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) throw error;
  return data;
}

export async function challengeAndVerifyFactor(factorId: string, code: string) {
  const { data, error } = await supabase.auth.mfa.challengeAndVerify({ factorId, code });
  if (error) throw error;
  return data;
}
