-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "durationMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sessionInput" JSONB,
ADD COLUMN     "titleId" TEXT,
ADD COLUMN     "titleName" TEXT;

-- CreateTable
CREATE TABLE "Title" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "runtimeMinutes" INTEGER NOT NULL,
    "language" TEXT NOT NULL DEFAULT '',
    "certification" TEXT NOT NULL DEFAULT '',
    "licenceRef" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);
