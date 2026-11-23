-- Database-level double-booking guard (V4 BKG-03 / R4).
-- Two live bookings on the same resource can never overlap in time, even via
-- direct SQL or a future code path. The application lock stays as the first
-- line of defence; this constraint is the last one.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "Booking"
  ADD CONSTRAINT booking_no_overlap
  EXCLUDE USING gist (
    "resource" WITH =,
    tsrange("start", "end", '[)') WITH &&
  ) WHERE ("status" IN ('confirmed', 'checked_in', 'in_progress', 'completed'));
