"use client";

import { useState } from "react";

export default function PricingCheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (res.status === 401) {
        // Not signed in yet — send them through Auth.js, then back here.
        window.location.href = `/api/auth/signin?callbackUrl=${encodeURIComponent("/pricing")}`;
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error || "Checkout failed");
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Checkout failed");
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={startCheckout}
        disabled={loading}
        className="mt-8 w-full bg-[#D4AF37] text-black font-bold rounded-xl py-3 hover:bg-[#e5c04b] disabled:opacity-60 transition"
      >
        {loading ? "Opening secure checkout…" : "Get Weekly Access"}
      </button>
      {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
    </>
  );
}
