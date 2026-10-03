-- Soft-delete support for ServiceJob, mirroring Part/Customer.
ALTER TABLE "ServiceJob" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
