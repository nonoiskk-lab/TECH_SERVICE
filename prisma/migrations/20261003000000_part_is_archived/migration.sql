-- Soft-delete support for parts: Admin can archive a part instead of hard
-- deleting it, so existing job/purchase/stock history stays intact.
ALTER TABLE "Part" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
