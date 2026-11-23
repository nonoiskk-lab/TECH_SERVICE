-- All money moves from whole rupees to integer PAISE (V4 NFR-08, R3).
-- One-way data migration: every stored amount is multiplied by 100. Column names and
-- types are unchanged (Int holds up to about Rs 21 million in paise). Percent values
-- (advancePercent, percent coupons, tax) are not money and are untouched.
-- Runs once (Prisma records it). Do not re-run by hand.

UPDATE "Booking" SET
  "subtotal" = "subtotal" * 100,
  "discount" = "discount" * 100,
  "tax" = "tax" * 100,
  "total" = "total" * 100,
  "advancePaid" = "advancePaid" * 100,
  "balanceDue" = "balanceDue" * 100,
  "refundAmount" = "refundAmount" * 100;

UPDATE "PendingOrder" SET "amount" = "amount" * 100;
UPDATE "Payment" SET "amount" = "amount" * 100;

UPDATE "Package" SET
  "startingPrice" = "startingPrice" * 100,
  "ratePerHour" = "ratePerHour" * 100;

UPDATE "AddOn" SET "price" = "price" * 100;

UPDATE "Coupon" SET "value" = "value" * 100 WHERE "kind" = 'flat';
UPDATE "Coupon" SET "minSubtotal" = "minSubtotal" * 100;

UPDATE "Setting"
SET "value" = jsonb_set("value", '{minimumCharge}', to_jsonb((("value"->>'minimumCharge')::numeric * 100)::bigint))
WHERE "key" = 'business' AND "value" ? 'minimumCharge';
