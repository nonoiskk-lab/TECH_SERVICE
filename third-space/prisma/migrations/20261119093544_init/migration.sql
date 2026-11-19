-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "addOnIds" TEXT[],
    "themeId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestPhone" TEXT NOT NULL,
    "guestEmail" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "total" INTEGER NOT NULL,
    "advancePaid" INTEGER NOT NULL,
    "balanceDue" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "paymentProvider" TEXT,
    "paymentOrderId" TEXT,
    "paymentId" TEXT,
    "balancePaidAt" TIMESTAMP(3),
    "checkedInAt" TIMESTAMP(3),
    "ageVerifiedCount" INTEGER,
    "ageVerifiedBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "refundAmount" INTEGER,
    "utm" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hold" (
    "id" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Hold_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlotBlock" (
    "id" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SlotBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingOrder" (
    "orderId" TEXT NOT NULL,
    "holdId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "provider" TEXT NOT NULL,
    "draft" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PendingOrder_pkey" PRIMARY KEY ("orderId")
);

-- CreateTable
CREATE TABLE "PolicyAcceptance" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "policyPackVersion" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "declarationVersion" TEXT NOT NULL,
    "declarationText" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "allParticipantsAdult" BOOLEAN NOT NULL,
    "guestsInformed" BOOLEAN NOT NULL,
    "venueRulesAccepted" BOOLEAN NOT NULL,
    "recordingConsent" BOOLEAN,
    "promotionalConsent" BOOLEAN NOT NULL DEFAULT false,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "acceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PolicyAcceptance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "utm" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'new',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpCode" (
    "phone" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "verifiedUntil" TIMESTAMP(3),

    CONSTRAINT "OtpCode_pkey" PRIMARY KEY ("phone")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "witnesses" TEXT NOT NULL DEFAULT '',
    "actionsTaken" TEXT NOT NULL DEFAULT '',
    "sessionStopped" BOOLEAN NOT NULL DEFAULT false,
    "evidencePreserved" BOOLEAN NOT NULL DEFAULT false,
    "authoritiesContacted" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reportedBy" TEXT NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT,
    "details" JSONB,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "channel" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventCount" (
    "event" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EventCount_pkey" PRIMARY KEY ("event")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_accessToken_key" ON "Booking"("accessToken");

-- CreateIndex
CREATE INDEX "Booking_resource_start_idx" ON "Booking"("resource", "start");

-- CreateIndex
CREATE INDEX "Booking_start_idx" ON "Booking"("start");

-- CreateIndex
CREATE INDEX "Hold_resource_start_idx" ON "Hold"("resource", "start");

-- CreateIndex
CREATE INDEX "SlotBlock_resource_start_idx" ON "SlotBlock"("resource", "start");

-- CreateIndex
CREATE UNIQUE INDEX "PolicyAcceptance_bookingId_key" ON "PolicyAcceptance"("bookingId");

-- CreateIndex
CREATE INDEX "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_at_idx" ON "AuditLog"("at");

-- AddForeignKey
ALTER TABLE "PolicyAcceptance" ADD CONSTRAINT "PolicyAcceptance_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;
