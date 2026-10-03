-- Soft-delete support for customers: Admin can archive a customer instead
-- of hard deleting it, so their existing job/payment/device history stays
-- intact and the record can be restored.
ALTER TABLE "Customer" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
