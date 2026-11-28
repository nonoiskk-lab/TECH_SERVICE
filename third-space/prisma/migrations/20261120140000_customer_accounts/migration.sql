-- Customer accounts and self-service rescheduling
ALTER TABLE "Customer" ADD COLUMN "passwordHash" TEXT,
ADD COLUMN "lastLoginAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "rescheduleCount" INTEGER NOT NULL DEFAULT 0;
