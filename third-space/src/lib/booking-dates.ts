import "server-only";
import { booking, firstBookableDate } from "@/config/site";
import { addDays, istToday } from "@/server/slots/time";

export function bookingDates(now = new Date()) {
  const today = istToday(now);
  const first = firstBookableDate();
  const minDate = today > first ? today : first;
  return { minDate, maxDate: addDays(minDate, booking.bookingWindowDays), defaultDate: minDate };
}
