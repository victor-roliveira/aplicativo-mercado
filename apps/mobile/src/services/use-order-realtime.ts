import { useEffect } from "react";
import { supabase } from "./supabase";

export function useOrderRealtime(onChange?: () => void) {
  useEffect(() => {
    if (!supabase) {
      return;
    }

    const client = supabase;
    const channel = client
      .channel("orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("order change", payload);
          onChange?.();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        (payload) => {
          console.log("product change", payload);
          onChange?.();
        },
      )
      .subscribe();

    return () => {
      void client.removeChannel(channel);
    };
  }, [onChange]);
}
