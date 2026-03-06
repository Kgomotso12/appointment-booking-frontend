import { ref } from 'vue';
import { DateTime } from 'luxon';
import type { EventInput } from '@fullcalendar/core';
import type FullCalendar from '@fullcalendar/vue3';
import type { Appointment } from 'src/types/domain';
import {
  buildAppointmentMap,
  toCalendarEvents,
} from 'src/components/booking-calendar/calendar.events';
import { getAppointmentsRange, getAppointmentsViewRange } from 'src/services/appointment.api';

export type CalendarDataMode = 'public' | 'admin';

export function useCalendarRange(args: {
  tz: string;
  branchId: () => string | null;
  mode: () => CalendarDataMode;
  fcRef: { value: InstanceType<typeof FullCalendar> | null };
}) {
  const events = ref<EventInput[]>([]);
  const eventsLoading = ref(false);
  const visibleRange = ref<{ from: string; to: string } | null>(null);
  const appointmentById = ref(new Map<string, Appointment>());

  let fetchSeq = 0;

  async function fetchAppointmentsRange(from: string, to: string) {
    const seq = ++fetchSeq;

    const branchId = args.branchId();
    if (!branchId) {
      events.value = [];
      appointmentById.value = new Map();
      return;
    }

    eventsLoading.value = true;
    try {
      const mode = args.mode();

      const items =
        mode === 'admin'
          ? await getAppointmentsRange({ branchId, from, to })
          : await getAppointmentsViewRange({ branchId, from, to });

      if (seq !== fetchSeq) return;

      appointmentById.value = buildAppointmentMap(items);
      events.value = toCalendarEvents(items, args.tz);
    } finally {
      if (seq === fetchSeq) eventsLoading.value = false;
    }
  }

  async function fetchAppointments() {
    const branchId = args.branchId();
    if (!branchId) {
      events.value = [];
      appointmentById.value = new Map();
      return;
    }

    if (visibleRange.value) {
      const { from, to } = visibleRange.value;
      await fetchAppointmentsRange(from, to);
      return;
    }

    const api = args.fcRef.value?.getApi();
    const start = api?.view?.activeStart;
    const end = api?.view?.activeEnd;
    if (!start || !end) return;

    const from = DateTime.fromJSDate(start).setZone(args.tz).toFormat('yyyy-LL-dd');
    const to = DateTime.fromJSDate(end).setZone(args.tz).toFormat('yyyy-LL-dd');

    visibleRange.value = { from, to };
    await fetchAppointmentsRange(from, to);
  }

  function onDatesSet(start: Date, end: Date) {
    const from = DateTime.fromJSDate(start).setZone(args.tz).toFormat('yyyy-LL-dd');
    const to = DateTime.fromJSDate(end).setZone(args.tz).toFormat('yyyy-LL-dd');
    visibleRange.value = { from, to };
    void fetchAppointmentsRange(from, to);
  }

  return {
    events,
    eventsLoading,
    appointmentById,
    visibleRange,
    fetchAppointments,
    fetchAppointmentsRange,
    onDatesSet,
  };
}
