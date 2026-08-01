// Path: src/lib/razorpay.ts
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window { Razorpay?: new (options: Record<string, unknown>) => { open: () => void }; }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay checkout — check your internet connection."));
    document.body.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Pays for a worker_tasks row that's already been accepted by the worker.
 * Order is created + verified server-side (Edge Functions); this only
 * drives the Razorpay Checkout popup and reports success/failure.
 */
export async function payForWorkerTask(opts: {
  workerTaskId: string;
  payerName?: string;
  payerEmail?: string;
  payerPhone?: string;
}): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  const accessToken = sessionData.session?.access_token;
  if (!accessToken) throw new Error("You need to be logged in to pay.");

  const { data: fnResp, error: fnErr } = await supabase.functions.invoke("supabase-functions-deploy-razorpay-create-order", {
    body: { worker_task_id: opts.workerTaskId },
  });
  if (fnErr) throw new Error(fnErr.message || "Could not start the payment.");
  if (fnResp?.error) throw new Error(fnResp.error);

  const { order_id, amount, currency, key_id } = fnResp as {
    order_id: string; amount: number; currency: string; key_id: string;
  };

  await loadRazorpayScript();

  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: key_id,
      amount,
      currency,
      order_id,
      name: "EventOrbit AI",
      description: "Worker payment",
      prefill: { name: opts.payerName, email: opts.payerEmail, contact: opts.payerPhone },
      theme: { color: "#7c3aed" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const { data: verifyResp, error: verifyErr } = await supabase.functions.invoke("supabase-functions-deploy-razorpay-verify-payment", {
          body: {
            worker_task_id: opts.workerTaskId,
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          },
        });
        if (verifyErr || verifyResp?.error) {
          reject(new Error(verifyResp?.error || verifyErr?.message || "Payment could not be verified."));
          return;
        }
        resolve();
      },
      modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
    });
    rzp.open();
  });
}
