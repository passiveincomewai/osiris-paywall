import { Suspense } from "react";
import type { Metadata } from "next";
import CheckoutReturnClient from "./ReturnClient";

export const metadata: Metadata = {
  title: "Checkout — WorldEye Pro",
  description: "Confirming your WorldEye checkout.",
  robots: { index: false, follow: false },
};

export default function CheckoutReturnPage() {
  return (
    <Suspense>
      <CheckoutReturnClient />
    </Suspense>
  );
}
