import { redirect } from "next/navigation";

// Single sales page lives at /pricing.
export default function PremiumRedirect() {
  redirect("/pricing");
}
