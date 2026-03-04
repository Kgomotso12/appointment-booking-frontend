import { ref } from 'vue';
import type FullCalendar from '@fullcalendar/vue3';

export function useCalendarTitle(fcRef: { value: InstanceType<typeof FullCalendar> | null }) {
  const calendarTitle = ref('');

  function syncTitle() {
    const api = fcRef.value?.getApi();
    calendarTitle.value = api?.view?.title ?? '';
  }

  return { calendarTitle, syncTitle };
}
