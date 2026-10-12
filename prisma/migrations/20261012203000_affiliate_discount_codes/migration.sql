-- Tiered affiliate discount codes: per-affiliate Stripe promotion code
-- whose % off the buyer's first payment follows the affiliate's rank
-- (approved creators get a 20% floor). Code/pct are stored on the profile
-- even before Stripe sync; stripePromotionCodeId is set once Stripe
-- confirms the promotion code exists. One shared coupon per percent is
-- cached in AffiliateDiscountCoupon (see src/lib/affiliate/discount.ts).
ALTER TABLE "AffiliateProfile" ADD COLUMN "discountCode" TEXT;
ALTER TABLE "AffiliateProfile" ADD COLUMN "discountPct" INTEGER;
ALTER TABLE "AffiliateProfile" ADD COLUMN "stripePromotionCodeId" TEXT;
ALTER TABLE "AffiliateProfile" ADD COLUMN "discountSyncedAt" TIMESTAMP(3);
CREATE UNIQUE INDEX "AffiliateProfile_discountCode_key" ON "AffiliateProfile"("discountCode");

CREATE TABLE "AffiliateDiscountCoupon" (
    "pct" INTEGER NOT NULL,
    "stripeCouponId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffiliateDiscountCoupon_pkey" PRIMARY KEY ("pct")
);
CREATE UNIQUE INDEX "AffiliateDiscountCoupon_stripeCouponId_key" ON "AffiliateDiscountCoupon"("stripeCouponId");
