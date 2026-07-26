// ============================================================
// Path: supabase/functions/send-org-invite/index.ts
// (create this as a NEW Edge Function — see deployment steps below)
// ============================================================
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://eventsphere-ai-marketing-hub.vercel.app";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, orgName, roleName, token } = await req.json();
    if (!email || !token) {
      return new Response(JSON.stringify({ error: "email and token are required" }), { status: 400, headers: corsHeaders });
    }

    const joinLink = `${SITE_URL}/join-organization/${token}`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "EventOrbit AI <invites@yourdomain.com>", // change once you verify a domain in Resend
        to: [email],
        subject: `You're invited to join ${orgName} on EventOrbit AI`,
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>You're invited to ${orgName}</h2>
            <p>As <strong>${roleName}</strong> on EventOrbit AI.</p>
            <p>
              <a href="${joinLink}" style="display:inline-block;background:#7c3aed;color:#fff;padding:12px 24px;border-radius:999px;text-decoration:none;font-weight:600;">
                Join ${orgName}
              </a>
            </p>
            <p style="color:#666;font-size:13px;">Or paste this link in your browser: ${joinLink}</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      return new Response(JSON.stringify({ error: `Resend error: ${err}` }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), { status: 500, headers: corsHeaders });
  }
});
