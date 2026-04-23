import { createClient } from "@supabase/supabase-js";
import { env } from "../config/env";

export const supabaseAdmin = createClient(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
);

export async function markOrderPaid(paymentProviderId: string) {
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from("payments")
    .update({
      status: "PAID",
      paid_at: new Date().toISOString(),
    })
    .eq("provider_reference", paymentProviderId)
    .select("order_id")
    .single();

  if (paymentError) {
    throw paymentError;
  }

  const { error: orderError } = await supabaseAdmin.rpc("admin_update_order_status", {
    p_order_id: payment.order_id,
    p_status: "PROCESSING",
  });

  if (orderError) {
    throw orderError;
  }

  return payment.order_id;
}

export async function registerStockIssue(orderId: string, reason: string) {
  const { error } = await supabaseAdmin.rpc("flag_stock_issue", {
    p_order_id: orderId,
    p_reason: reason,
  });

  if (error) {
    throw error;
  }
}
