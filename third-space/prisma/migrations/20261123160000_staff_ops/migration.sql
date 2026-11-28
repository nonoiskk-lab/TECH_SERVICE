-- Staff portal: assignment, room preparation, internal notes.
ALTER TABLE "Booking"
  ADD COLUMN "assignedStaffId" TEXT,
  ADD COLUMN "roomReadyAt" TIMESTAMP(3),
  ADD COLUMN "roomReadyBy" TEXT,
  ADD COLUMN "staffNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "StaffUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Booking_assignedStaffId_start_idx" ON "Booking"("assignedStaffId", "start");
