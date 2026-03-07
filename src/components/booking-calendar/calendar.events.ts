import { DateTime } from 'luxon';
import type { EventInput, EventContentArg } from '@fullcalendar/core';
import type { Appointment, AppointmentStatus } from 'src/types/domain';

export function statusClass(status: AppointmentStatus) {
  if (status === 'CONFIRMED') return 'evt-confirmed';
  if (status === 'PENDING_CONFIRMATION') return 'evt-pending';
  return 'evt-cancelled';
}

export function isPastAppointment(a: Pick<Appointment, 'endTime'>, tz: string) {
  const end = DateTime.fromISO(a.endTime, { setZone: true }).setZone(tz);
  return end.isValid && end < DateTime.now().setZone(tz);
}

export function toCalendarEvents(items: Appointment[], tz: string) {
  return items.map((a): EventInput => {
    const past = isPastAppointment(a, tz);

    return {
      id: String(a.id),
      start: a.startTime,
      end: a.endTime,
      title: '',
      editable: a.status !== 'CANCELLED' && !past,
      classNames: [
        statusClass(a.status),
        ...(past ? ['evt-past'] : []),
        ...(a.status === 'CANCELLED' ? ['evt-greyed'] : []),
      ],
      extendedProps: { status: a.status, isPast: past },
    };
  });
}

export function buildAppointmentMap(items: Appointment[]) {
  const map = new Map<string, Appointment>();
  for (const a of items) map.set(String(a.id), a);
  return map;
}

export function eventTimeOnlyContent(tz: string) {
  return (arg: EventContentArg) => {
    const start = arg.event.start;
    const end = arg.event.end;
    const startTxt = start ? DateTime.fromJSDate(start).setZone(tz).toFormat('HH:mm') : '';
    const endTxt = end ? DateTime.fromJSDate(end).setZone(tz).toFormat('HH:mm') : '';
    const txt = endTxt ? `${startTxt}–${endTxt}` : startTxt;
    return { html: `<div class="evt-time fc-time-only">${txt}</div>` };
  };
}

export function isPastSlot(start: Date, tz: string) {
  return DateTime.fromJSDate(start).setZone(tz) < DateTime.now().setZone(tz);
}
