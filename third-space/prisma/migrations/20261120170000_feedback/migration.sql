-- Guest feedback after a session
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT NOT NULL DEFAULT '',
    "allowPublish" BOOLEAN NOT NULL DEFAULT false,
    "displayName" TEXT NOT NULL DEFAULT '',
    "publishedAt" TIMESTAMP(3),
    "testimonialId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Feedback_bookingId_key" ON "Feedback"("bookingId");
ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- Same protection as every other table: no access through Supabase's public API roles.
ALTER TABLE "Feedback" ENABLE ROW LEVEL SECURITY;
