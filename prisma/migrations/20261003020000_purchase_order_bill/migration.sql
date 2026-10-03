-- Distributor bill photo/scan for a purchase order, stored as a data URL
-- (base64) so no separate file-storage service is required.
ALTER TABLE "PurchaseOrder"
  ADD COLUMN "billFileUrl" TEXT,
  ADD COLUMN "billFileName" TEXT,
  ADD COLUMN "billUploadedById" TEXT,
  ADD COLUMN "billUploadedAt" TIMESTAMP(3);

ALTER TABLE "PurchaseOrder"
  ADD CONSTRAINT "PurchaseOrder_billUploadedById_fkey"
  FOREIGN KEY ("billUploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
