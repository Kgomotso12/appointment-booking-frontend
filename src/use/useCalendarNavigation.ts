import type FullCalendar from '@fullcalendar/vue3';

export function useCalendarNavigation(
  fcRef: { value: InstanceType<typeof FullCalendar> | null },
  syncTitle: () => void,
) {
  function goPrev() {
    const api = fcRef.value?.getApi();
    api?.prev();
    syncTitle();
  }

  function goNext() {
    const api = fcRef.value?.getApi();
    api?.next();
    syncTitle();
  }

  function goToday() {
    const api = fcRef.value?.getApi();
    api?.today();
    syncTitle();
  }

  function clearSelection() {
    const api = fcRef.value?.getApi();
    api?.unselect();
  }

  return { goPrev, goNext, goToday, clearSelection };
}
