import { Suspense } from "react";
import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";
import StripeResourceHints from "@/components/StripeResourceHints";

export const metadata: Metadata = {
  title: "Checkout — WorldEye Pro",
  description: "Secure on-site checkout for WorldEye Pro.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <>
      <StripeResourceHints />
      <Suspense>
        <CheckoutClient />
      </Suspense>
    </>
  );
}
