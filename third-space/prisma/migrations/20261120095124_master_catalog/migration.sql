-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "couponCode" TEXT,
ADD COLUMN     "customerId" TEXT,
ADD COLUMN     "discount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "holdId" TEXT,
ADD COLUMN     "packageName" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "rescheduledFrom" TIMESTAMP(3),
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'web',
ADD COLUMN     "specialRequests" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "subtotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "tax" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "error" TEXT,
ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'booking_confirmed',
ADD COLUMN     "sendAfter" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "SlotBlock" ADD COLUMN     "kind" TEXT NOT NULL DEFAULT 'maintenance';

-- CreateTable
CREATE TABLE "Resource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "openTime" TEXT NOT NULL DEFAULT '10:00',
    "closeTime" TEXT NOT NULL DEFAULT '22:00',
    "slotStepMinutes" INTEGER NOT NULL DEFAULT 30,
    "bufferMinutes" INTEGER NOT NULL DEFAULT 30,
    "bookingWindowDays" INTEGER NOT NULL DEFAULT 60,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Package" (
    "id" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "summaryEn" TEXT NOT NULL DEFAULT '',
    "summaryHi" TEXT NOT NULL DEFAULT '',
    "pricingKind" TEXT NOT NULL,
    "startingPrice" INTEGER NOT NULL,
    "ratePerHour" INTEGER NOT NULL DEFAULT 0,
    "durationMinutes" INTEGER NOT NULL,
    "setupMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxGuests" INTEGER NOT NULL,
    "inclusions" JSONB NOT NULL DEFAULT '[]',
    "priceListLabelEn" TEXT NOT NULL DEFAULT '',
    "priceListLabelHi" TEXT NOT NULL DEFAULT '',
    "priceListNoteEn" TEXT NOT NULL DEFAULT '',
    "priceListNoteHi" TEXT NOT NULL DEFAULT '',
    "pricePlus" BOOLEAN NOT NULL DEFAULT false,
    "showInPriceList" BOOLEAN NOT NULL DEFAULT true,
    "requiresLegalGate" BOOLEAN NOT NULL DEFAULT false,
    "advancePercent" INTEGER,
    "refundTiers" JSONB,
    "planHours" INTEGER,
    "planValidityDays" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Package_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameHi" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "modes" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Coupon" (
    "code" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "minSubtotal" INTEGER NOT NULL DEFAULT 0,
    "maxUses" INTEGER,
    "usedCount" INTEGER NOT NULL DEFAULT 0,
    "packageIds" TEXT[],
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Coupon_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "SharedAsset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SharedAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackageAsset" (
    "packageId" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,

    CONSTRAINT "PackageAsset_pkey" PRIMARY KEY ("packageId","assetId")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT NOT NULL DEFAULT 'system',

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "marketingConsent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT NOT NULL DEFAULT '',
    "deletionRequested" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorMembership" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "packageId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "hoursTotal" INTEGER NOT NULL,
    "minutesUsed" INTEGER NOT NULL DEFAULT 0,
    "validUntil" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreatorMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipUsage" (
    "id" TEXT NOT NULL,
    "membershipId" TEXT NOT NULL,
    "bookingId" TEXT,
    "minutes" INTEGER NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "recordedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,
    "refundId" TEXT,
    "amount" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecordingFile" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "deliveredAt" TIMESTAMP(3),
    "downloads" INTEGER NOT NULL DEFAULT 0,
    "deleteAfter" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecordingFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "rating" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'studio',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StaffUser" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorMembership_bookingId_key" ON "CreatorMembership"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_orderId_key" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_paymentId_key" ON "Payment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_refundId_key" ON "Payment"("refundId");

-- CreateIndex
CREATE UNIQUE INDEX "RecordingFile_token_key" ON "RecordingFile"("token");

-- CreateIndex
CREATE UNIQUE INDEX "StaffUser_email_key" ON "StaffUser"("email");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAsset" ADD CONSTRAINT "PackageAsset_packageId_fkey" FOREIGN KEY ("packageId") REFERENCES "Package"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackageAsset" ADD CONSTRAINT "PackageAsset_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "SharedAsset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorMembership" ADD CONSTRAINT "CreatorMembership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUsage" ADD CONSTRAINT "MembershipUsage_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "CreatorMembership"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUsage" ADD CONSTRAINT "MembershipUsage_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordingFile" ADD CONSTRAINT "RecordingFile_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed: resources (ids match existing booking rows)
INSERT INTO "Resource" ("id","name","sortOrder") VALUES ('room','Private Theatre',1),('studio','Podcast & Creator Studio',2) ON CONFLICT DO NOTHING;
-- Seed: launch package catalogue (owner table, 19 Nov 2026). Starting prices are editable in admin.
INSERT INTO "Package" ("id","resourceId","category","mode","service","nameEn","nameHi","summaryEn","summaryHi","pricingKind","startingPrice","ratePerHour","durationMinutes","setupMinutes","maxGuests","inclusions","priceListLabelEn","priceListLabelHi","priceListNoteEn","priceListNoteHi","pricePlus","showInPriceList","requiresLegalGate","planHours","planValidityDays","sortOrder","updatedAt") VALUES ('theatre-classic','room','theatre','watch','theatre','Private Cinema','Private Cinema','The private room for your group. Starts at 2 hours; a longer title runs longer.','Aapke group ke liye private room. 2 ghante se shuru; lamba title ho to time badhega.','title',1699,850,120,30,5,'[{"en": "Private room booking", "hi": "Private room booking"}]'::jsonb,'Private Cinema – 2 hours (max 5 people)','Private Cinema – 2 ghante (max 5 log)','Private room booking','Private room booking',false,true,true,NULL,NULL,1,now()) ON CONFLICT DO NOTHING;
INSERT INTO "Package" ("id","resourceId","category","mode","service","nameEn","nameHi","summaryEn","summaryHi","pricingKind","startingPrice","ratePerHour","durationMinutes","setupMinutes","maxGuests","inclusions","priceListLabelEn","priceListLabelHi","priceListNoteEn","priceListNoteHi","pricePlus","showInPriceList","requiresLegalGate","planHours","planValidityDays","sortOrder","updatedAt") VALUES ('theatre-premium','room','theatre','watch','theatre','Premium Experience','Premium Experience','The private room with unlimited popcorn and cold drinks.','Private room, saath me unlimited popcorn aur cold drink.','title',2699,1350,120,30,4,'[{"en": "Unlimited popcorn and cold drink", "hi": "Unlimited popcorn aur cold drink"}]'::jsonb,'Premium Experience – 2 hours (max 4 people)','Premium Experience – 2 ghante (max 4 log)','Unlimited popcorn and cold drink','Unlimited popcorn aur cold drink',false,true,true,NULL,NULL,2,now()) ON CONFLICT DO NOTHING;
INSERT INTO "Package" ("id","resourceId","category","mode","service","nameEn","nameHi","summaryEn","summaryHi","pricingKind","startingPrice","ratePerHour","durationMinutes","setupMinutes","maxGuests","inclusions","priceListLabelEn","priceListLabelHi","priceListNoteEn","priceListNoteHi","pricePlus","showInPriceList","requiresLegalGate","planHours","planValidityDays","sortOrder","updatedAt") VALUES ('podcast','studio','podcast','create','podcast','Podcast Studio','Podcast Studio','Tell us how many episodes and how long each one is. We add 30 minutes setup and show the price.','Bataiye kitne episode aur har ek kitna lamba. Hum 30 minute setup jod kar price dikhate hain.','podcast',1899,950,120,30,4,'[{"en": "Recording + agreed raw-file delivery", "hi": "Recording + tay raw-file delivery"}]'::jsonb,'Podcast Studio / Content Creation – 2 hours','Podcast Studio / Content Creation – 2 ghante','Recording + agreed raw-file delivery','Recording + tay raw-file delivery',false,true,false,NULL,NULL,3,now()) ON CONFLICT DO NOTHING;
INSERT INTO "Package" ("id","resourceId","category","mode","service","nameEn","nameHi","summaryEn","summaryHi","pricingKind","startingPrice","ratePerHour","durationMinutes","setupMinutes","maxGuests","inclusions","priceListLabelEn","priceListLabelHi","priceListNoteEn","priceListNoteHi","pricePlus","showInPriceList","requiresLegalGate","planHours","planValidityDays","sortOrder","updatedAt") VALUES ('creator-shoot','studio','podcast','create','creator','Content Creation','Content Creation','Tell us how many reels and longer videos you will shoot. We add 30 minutes setup and show the price.','Bataiye kitni reels aur lambi videos shoot karni hain. Hum 30 minute setup jod kar price dikhate hain.','creator',1899,950,120,30,4,'[{"en": "Recording + agreed raw-file delivery", "hi": "Recording + tay raw-file delivery"}]'::jsonb,'','','','',false,false,false,NULL,NULL,4,now()) ON CONFLICT DO NOTHING;
INSERT INTO "Package" ("id","resourceId","category","mode","service","nameEn","nameHi","summaryEn","summaryHi","pricingKind","startingPrice","ratePerHour","durationMinutes","setupMinutes","maxGuests","inclusions","priceListLabelEn","priceListLabelHi","priceListNoteEn","priceListNoteHi","pricePlus","showInPriceList","requiresLegalGate","planHours","planValidityDays","sortOrder","updatedAt") VALUES ('celebration','room','celebration','celebrate','celebration','Birthday / Anniversary Experience','Birthday / Anniversary Experience','Two hours in the private room, set up for your occasion. Decoration and refreshments as quoted.','Private room me do ghante, aapke mauke ke liye. Decoration aur refreshments quote ke hisaab se.','fixed',2499,0,120,0,5,'[{"en": "Decoration / refreshments as quoted", "hi": "Decoration / refreshments quote ke hisaab se"}]'::jsonb,'Birthday / Anniversary Experience – 2 hours','Birthday / Anniversary Experience – 2 ghante','Decoration / refreshments as quoted','Decoration / refreshments quote ke hisaab se',true,true,false,NULL,NULL,5,now()) ON CONFLICT DO NOTHING;
INSERT INTO "Package" ("id","resourceId","category","mode","service","nameEn","nameHi","summaryEn","summaryHi","pricingKind","startingPrice","ratePerHour","durationMinutes","setupMinutes","maxGuests","inclusions","priceListLabelEn","priceListLabelHi","priceListNoteEn","priceListNoteHi","pricePlus","showInPriceList","requiresLegalGate","planHours","planValidityDays","sortOrder","updatedAt") VALUES ('family','room','theatre','watch','theatre','Family Package','Family Package','Three hours in the private room with unlimited food, popcorn and cold drinks.','Private room me teen ghante, unlimited khana, popcorn aur cold drink ke saath.','title',6999,2333,180,30,5,'[{"en": "Theatre + unlimited food + popcorn and cold drink", "hi": "Theatre + unlimited khana + popcorn aur cold drink"}]'::jsonb,'Family Package – 3 hours (max 5 people)','Family Package – 3 ghante (max 5 log)','Private room + unlimited food + popcorn and cold drink','Private room + unlimited khana + popcorn aur cold drink',false,true,true,NULL,NULL,6,now()) ON CONFLICT DO NOTHING;
INSERT INTO "Package" ("id","resourceId","category","mode","service","nameEn","nameHi","summaryEn","summaryHi","pricingKind","startingPrice","ratePerHour","durationMinutes","setupMinutes","maxGuests","inclusions","priceListLabelEn","priceListLabelHi","priceListNoteEn","priceListNoteHi","pricePlus","showInPriceList","requiresLegalGate","planHours","planValidityDays","sortOrder","updatedAt") VALUES ('small-celebration','room','celebration','celebrate','celebration','Small Private Celebration','Small Private Celebration','Just the private room, by the hour, for a small get-together.','Sirf private room, ghante ke hisaab se, chhote get-together ke liye.','hourly',799,799,60,0,5,'[{"en": "Only space", "hi": "Sirf space"}]'::jsonb,'Small Private Celebration – 1 hour','Small Private Celebration – 1 ghanta','Only space','Sirf space',false,true,false,NULL,NULL,7,now()) ON CONFLICT DO NOTHING;
INSERT INTO "Package" ("id","resourceId","category","mode","service","nameEn","nameHi","summaryEn","summaryHi","pricingKind","startingPrice","ratePerHour","durationMinutes","setupMinutes","maxGuests","inclusions","priceListLabelEn","priceListLabelHi","priceListNoteEn","priceListNoteHi","pricePlus","showInPriceList","requiresLegalGate","planHours","planValidityDays","sortOrder","updatedAt") VALUES ('creator-plan','studio','creator','create','podcast','Monthly Creator Plan','Monthly Creator Plan','8 fixed studio hours a month with agreed outputs. Book your first session now.','Mahine ke 8 fixed studio ghante, tay outputs ke saath. Pehla session abhi book karein.','fixed',4999,0,120,0,4,'[{"en": "Fixed monthly hours (8 hrs) and outputs", "hi": "Fixed monthly ghante (8) aur outputs"}]'::jsonb,'Monthly Creator Plan','Monthly Creator Plan','Fixed monthly hours (8 hrs) and outputs','Fixed monthly ghante (8) aur outputs',false,true,false,8,30,8,now()) ON CONFLICT DO NOTHING;
INSERT INTO "Package" ("id","resourceId","category","mode","service","nameEn","nameHi","summaryEn","summaryHi","pricingKind","startingPrice","ratePerHour","durationMinutes","setupMinutes","maxGuests","inclusions","priceListLabelEn","priceListLabelHi","priceListNoteEn","priceListNoteHi","pricePlus","showInPriceList","requiresLegalGate","planHours","planValidityDays","sortOrder","updatedAt") VALUES ('visit-tour','studio','visit','visit','visit','Visit the room','Room dekhne aaiye','A free 10-minute walk-through of the studio and the room.','Studio aur room ka free 10 minute ka tour.','fixed',0,0,10,0,4,'[{"en": "Free, no payment needed", "hi": "Free, koi payment nahi"}]'::jsonb,'','','','',false,false,false,NULL,NULL,9,now()) ON CONFLICT DO NOTHING;
-- Seed: add-ons (prices are assumptions until the owner confirms them)
INSERT INTO "AddOn" ("id","nameEn","nameHi","price","modes","sortOrder") VALUES ('decor','Theme decor setup','Theme decor setup',699,ARRAY['watch','celebrate']::text[],0) ON CONFLICT DO NOTHING;
INSERT INTO "AddOn" ("id","nameEn","nameHi","price","modes","sortOrder") VALUES ('cake','Cake (500 g)','Cake (500 g)',599,ARRAY['watch','celebrate']::text[],1) ON CONFLICT DO NOTHING;
INSERT INTO "AddOn" ("id","nameEn","nameHi","price","modes","sortOrder") VALUES ('fog-entry','Fog entry','Fog entry',499,ARRAY['celebrate']::text[],2) ON CONFLICT DO NOTHING;
INSERT INTO "AddOn" ("id","nameEn","nameHi","price","modes","sortOrder") VALUES ('photos','20-minute photo shoot','20 minute photo shoot',799,ARRAY['watch','celebrate']::text[],3) ON CONFLICT DO NOTHING;
INSERT INTO "AddOn" ("id","nameEn","nameHi","price","modes","sortOrder") VALUES ('extra-camera','Extra camera angle','Extra camera angle',499,ARRAY['create']::text[],4) ON CONFLICT DO NOTHING;
INSERT INTO "AddOn" ("id","nameEn","nameHi","price","modes","sortOrder") VALUES ('basic-edit','Basic edit of the full episode','Poore episode ka basic edit',1499,ARRAY['create']::text[],5) ON CONFLICT DO NOTHING;
INSERT INTO "AddOn" ("id","nameEn","nameHi","price","modes","sortOrder") VALUES ('reels','3 short reels cut from your session','Aapke session se 3 short reels',999,ARRAY['create']::text[],6) ON CONFLICT DO NOTHING;
INSERT INTO "Setting" ("key","value","updatedAt") VALUES ('business','{"taxPercent": 18, "taxLabel": "GST", "advancePercent": 50, "holdMinutes": 15, "minimumCharge": 799, "refundTiers": [{"minHoursBefore": 72, "refundPercentOfAdvance": 90}, {"minHoursBefore": 24, "refundPercentOfAdvance": 50}, {"minHoursBefore": 0, "refundPercentOfAdvance": 0}]}'::jsonb,now()),('notifications','{"reminder24h": true, "reminder2h": true, "feedbackAfterHours": 3}'::jsonb,now()) ON CONFLICT DO NOTHING;
-- Backfill package names on existing bookings
UPDATE "Booking" b SET "packageName" = p."nameEn" FROM "Package" p WHERE b."packageId" = p."id" AND b."packageName" = '';
-- Row Level Security: deny-by-default for every role except the table owner (the app role).
ALTER TABLE "Booking" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Hold" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SlotBlock" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PendingOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PolicyAcceptance" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Lead" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OtpCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Incident" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Notification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EventCount" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Title" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Resource" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Package" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AddOn" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Coupon" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SharedAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PackageAsset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Setting" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CreatorMembership" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MembershipUsage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Payment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecordingFile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Testimonial" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "GalleryImage" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StaffUser" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RateLimit" ENABLE ROW LEVEL SECURITY;
