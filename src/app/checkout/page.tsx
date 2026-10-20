import { Suspense } from "react";
import type { Metadata } from "next";
import CheckoutClient from "./CheckoutClient";

export const metadata: Metadata = {
  title: "Checkout — WorldEye Pro",
  description: "Secure on-site checkout for WorldEye Pro.",
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <Suspense>
      <CheckoutClient />
    </Suspense>
  );
}
