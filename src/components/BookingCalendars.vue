<template>
  <div class="calendar-shell">
    <div class="row items-center justify-between q-mb-md" style="gap: 12px">
      <div class="column">
        <div class="text-h6 text-weight-semibold">Calendar</div>
        <div class="text-caption text-grey-7">
          {{ branchLabel }}
        </div>
      </div>

      <div class="row items-center no-wrap" style="gap: 8px">
        <div class="row items-center no-wrap" style="gap: 6px">
          <q-btn dense flat round icon="chevron_left" @click="goPrev" />
          <q-btn dense flat round icon="chevron_right" @click="goNext" />
          <q-btn dense unelevated color="primary" icon="today" label="Today" @click="goToday" />
        </div>

        <q-separator vertical inset class="q-mx-sm" />

        <div class="text-body2 text-weight-medium q-mr-sm calendar-title">
          {{ calendarTitle }}
        </div>

        <q-btn-toggle
          v-model="viewMode"
          dense
          unelevated
          toggle-color="primary"
          :options="viewOptions"
        />
      </div>
    </div>

    <q-card flat bordered class="calendar-card">
      <q-card-section class="q-pa-none">
        <div v-if="showEmptyState" class="empty-wrap">
          <div class="empty-card">
            <div class="row items-center q-gutter-sm">
              <q-spinner v-if="branchStore.loading" size="20px" />
              <q-icon v-else :name="branchStore.error ? 'error_outline' : 'place'" />
              <div class="text-subtitle1 text-weight-semibold">{{ emptyTitle }}</div>
            </div>
            <div class="text-body2 text-grey-7 q-mt-xs">
              {{ emptyBody }}
            </div>
          </div>
        </div>

        <FullCalendar v-else ref="fcRef" :options="calendarOptions" />
      </q-card-section>
    </q-card>

    <CreateAppointmentDialog
      v-if="props.branchId"
      v-model="upsertOpen"
      :branch-id="props.branchId"
      :tz="TZ"
      :mode="upsertMode"
      :appointment="editingAppointment"
      :preset="createPreset"
      :submitting="submittingUpsert"
      :field-errors="createFieldErrors"
      @clear-field-error="clearCreateFieldError"
      @submit="handleCreate"
    />

    <ViewAppointmentDialog
      v-model="viewOpen"
      :appointment-id="viewAppointmentId"
      :branch-label="branchLabel"
      :tz="TZ"
      @changed="onChanged"
      @close="onViewClosed"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import luxonPlugin from '@fullcalendar/luxon3';
import { DateTime } from 'luxon';
import type {
  CalendarOptions,
  DateSelectArg,
  DatesSetArg,
  EventClickArg,
  EventContentArg,
  EventDropArg,
  EventInput,
} from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';

import { useBranchStore } from 'src/stores/branchStore';
import type { Appointment, AppointmentStatus, CreateAppointmentPayload } from 'src/types/domain';

import CreateAppointmentDialog from './dialog/CreateAppointmentDialog.vue';
import ViewAppointmentDialog from './dialog/ViewAppointmentDialog.vue';
import { getAppointmentsRange } from 'src/services/appointment.api';
import { useAppointments } from 'src/use/useAppointments';

defineOptions({ name: 'BookingCalendar' });

const calendarTitle = ref('');

const props = defineProps<{
  branchId: string | null;
  refreshKey: number;
}>();

const TZ = 'Africa/Johannesburg';

const branchStore = useBranchStore();
const fcRef = ref<InstanceType<typeof FullCalendar> | null>(null);

type ViewMode = 'dayGridMonth' | 'timeGridWeek' | 'timeGridDay';
const viewMode = ref<ViewMode>('timeGridWeek');

const visibleRange = ref<{ from: string; to: string } | null>(null);

const viewOptions: { label: string; value: ViewMode }[] = [
  { label: 'Month', value: 'dayGridMonth' },
  { label: 'Week', value: 'timeGridWeek' },
  { label: 'Day', value: 'timeGridDay' },
];

const hasBranch = computed(() => !!props.branchId);

const branchLabel = computed(() => {
  const b = branchStore.selectedBranch;
  if (!b) return 'Select a branch to view bookings';
  return `${b.name} • ${b.address}`;
});

const showEmptyState = computed(() => {
  if (branchStore.loading) return true;
  if (branchStore.error) return true;
  return !hasBranch.value;
});

const emptyTitle = computed(() => {
  if (branchStore.loading) return 'Loading branches…';
  if (branchStore.error) return 'Could not load branches';
  return 'Select a branch to view the calendar';
});

const emptyBody = computed(() => {
  if (branchStore.loading) return 'Please wait while we fetch your branches.';
  if (branchStore.error) return branchStore.error;
  return 'Choose a branch from the header dropdown to start managing bookings.';
});

function statusClass(status: AppointmentStatus) {
  if (status === 'CONFIRMED') return 'evt-confirmed';
  if (status === 'PENDING_CONFIRMATION') return 'evt-pending';
  return 'evt-cancelled';
}

function isPastAppointment(a: Appointment) {
  const end = DateTime.fromISO(a.endTime, { setZone: true }).setZone(TZ);
  return end.isValid && end < DateTime.now().setZone(TZ);
}

const events = ref<EventInput[]>([]);
const eventsLoading = ref(false);

const appointmentById = ref(new Map<string, Appointment>());

let fetchSeq = 0;

function eventContent(arg: EventContentArg) {
  const start = arg.event.start;
  const end = arg.event.end;
  const startTxt = start ? DateTime.fromJSDate(start).setZone(TZ).toFormat('HH:mm') : '';
  const endTxt = end ? DateTime.fromJSDate(end).setZone(TZ).toFormat('HH:mm') : '';
  const txt = endTxt ? `${startTxt}–${endTxt}` : startTxt;

  return { html: `<div class="evt-time fc-time-only">${txt}</div>` };
}

async function fetchAppointmentsRange(from: string, to: string) {
  const seq = ++fetchSeq;

  if (!props.branchId) {
    events.value = [];
    appointmentById.value = new Map();
    return;
  }

  eventsLoading.value = true;
  try {
    const items = await getAppointmentsRange({
      branchId: props.branchId,
      from,
      to,
    });

    if (seq !== fetchSeq) return;

    const map = new Map<string, Appointment>();
    for (const a of items) map.set(String(a.id), a);
    appointmentById.value = map;

    events.value = items.map((a) => {
      const past = isPastAppointment(a);
      return {
        id: String(a.id),
        start: a.startTime,
        end: a.endTime,
        title: '',
        editable: a.status !== 'CANCELLED' && !past,
        classNames: [statusClass(a.status), ...(past ? ['evt-past'] : [])],
        extendedProps: { status: a.status, isPast: past },
      };
    });
  } catch (e) {
    if (seq === fetchSeq) {
      events.value = [];
      appointmentById.value = new Map();
    }
    throw e;
  } finally {
    if (seq === fetchSeq) eventsLoading.value = false;
  }
}

async function fetchAppointments() {
  if (!props.branchId) {
    events.value = [];
    appointmentById.value = new Map();
    return;
  }

  if (visibleRange.value) {
    const { from, to } = visibleRange.value;
    await fetchAppointmentsRange(from, to);
    return;
  }

  const api = fcRef.value?.getApi();
  const start = api?.view?.activeStart;
  const end = api?.view?.activeEnd;
  if (!start || !end) return;

  const from = DateTime.fromJSDate(start).setZone(TZ).toFormat('yyyy-LL-dd');
  const to = DateTime.fromJSDate(end).setZone(TZ).toFormat('yyyy-LL-dd');

  visibleRange.value = { from, to };
  await fetchAppointmentsRange(from, to);
}

function onDatesSet(arg: DatesSetArg) {
  const from = DateTime.fromJSDate(arg.start).setZone(TZ).toFormat('yyyy-LL-dd');
  const to = DateTime.fromJSDate(arg.end).setZone(TZ).toFormat('yyyy-LL-dd');

  visibleRange.value = { from, to };
  void fetchAppointmentsRange(from, to);
}

function clearCalendarSelection() {
  const api = fcRef.value?.getApi();
  api?.unselect();
}

type UpsertMode = 'create' | 'edit';
const upsertOpen = ref(false);
const upsertMode = ref<UpsertMode>('create');

const createPreset = ref<null | { date: string; startTime: string; endTime: string }>(null);

const editingAppointmentId = ref<string | null>(null);
const editingAppointment = computed<Appointment | null>(() => {
  if (!editingAppointmentId.value) return null;
  return appointmentById.value.get(editingAppointmentId.value) ?? null;
});

watch(upsertOpen, (open) => {
  if (!open) clearCalendarSelection();
});

function openCreate(preset?: { date: string; startTime: string; endTime: string }) {
  upsertMode.value = 'create';
  editingAppointmentId.value = null;
  createPreset.value = preset ?? null;
  upsertOpen.value = true;
}

function openEdit(appointmentId: string) {
  const a = appointmentById.value.get(appointmentId);
  if (!a) return;

  upsertMode.value = 'edit';
  editingAppointmentId.value = appointmentId;

  const start = DateTime.fromISO(a.startTime).setZone(TZ);
  const end = DateTime.fromISO(a.endTime).setZone(TZ);

  createPreset.value = {
    date: start.toFormat('yyyy-LL-dd'),
    startTime: start.toFormat('HH:mm'),
    endTime: end.toFormat('HH:mm'),
  };

  upsertOpen.value = true;
}

type UpsertPayload = CreateAppointmentPayload & {
  status?: Extract<AppointmentStatus, 'CONFIRMED' | 'CANCELLED'>;
};

const { runCreate, runCancel, runReschedule, runConfirm, loading: creating } = useAppointments();
const statusUpdating = ref(false);

const submittingUpsert = computed(() => creating.value || statusUpdating.value);

const createFieldErrors = ref<null | Partial<
  Record<keyof CreateAppointmentPayload | 'general', string>
>>(null);

function clearCreateFieldError() {
  createFieldErrors.value = null;
}

function resetUpsertState() {
  upsertOpen.value = false;
  editingAppointmentId.value = null;
  createPreset.value = null;
  clearCalendarSelection();
}

async function handleCreate(payload: UpsertPayload) {
  createFieldErrors.value = null;

  if (upsertMode.value === 'edit' && editingAppointmentId.value && payload.status) {
    statusUpdating.value = true;
    try {
      const id = editingAppointmentId.value;

      if (payload.status === 'CONFIRMED') {
        await runConfirm(id);
      } else if (payload.status === 'CANCELLED') {
        await runCancel(id);
      }

      await fetchAppointments();
      resetUpsertState();
    } catch (e) {
      createFieldErrors.value = {
        general: e instanceof Error ? e.message : 'Failed to update status',
      };
    } finally {
      statusUpdating.value = false;
    }
    return;
  }

  const created = await runCreate(payload);
  if (created) {
    await fetchAppointments();
    resetUpsertState();
  }
}

const viewOpen = ref(false);
const viewAppointmentId = ref<string | null>(null);

function onChanged() {
  void fetchAppointments();
}

function onViewClosed() {
  viewAppointmentId.value = null;
}

function openView(appointmentId: string) {
  const a = appointmentById.value.get(appointmentId);
  if (!a) return;

  viewAppointmentId.value = appointmentId;
  viewOpen.value = true;
}

function onSelect(info: DateSelectArg) {
  if (!props.branchId) return;

  const start = DateTime.fromJSDate(info.start).setZone(TZ);
  const end = DateTime.fromJSDate(info.end).setZone(TZ);

  openCreate({
    date: start.toFormat('yyyy-LL-dd'),
    startTime: start.toFormat('HH:mm'),
    endTime: end.toFormat('HH:mm'),
  });
}

function onEventClick(arg: EventClickArg) {
  const id = arg.event.id;
  const a = appointmentById.value.get(id);
  if (!a) return;

  const past = isPastAppointment(a);

  if (a.status === 'CANCELLED' || past) {
    openView(id);
    return;
  }

  openEdit(id);
}

function isPastSlot(start: Date) {
  const s = DateTime.fromJSDate(start).setZone(TZ);
  return s < DateTime.now().setZone(TZ);
}

async function handleRescheduleEvent(arg: {
  event: { id: string; start: Date | null; end: Date | null };
}) {
  const id = arg.event.id;
  const start = arg.event.start;
  const end = arg.event.end;
  if (!props.branchId || !start || !end) return;

  const s = DateTime.fromJSDate(start).setZone(TZ);
  const e = DateTime.fromJSDate(end).setZone(TZ);

  await runReschedule(id, {
    newDate: s.toFormat('yyyy-LL-dd'),
    newStartTime: s.toFormat('HH:mm'),
    newEndTime: e.toFormat('HH:mm'),
  });

  await fetchAppointments();
}

async function onEventDrop(arg: EventDropArg) {
  await handleRescheduleEvent(arg);
}

async function onEventResize(arg: EventResizeDoneArg) {
  await handleRescheduleEvent(arg);
}

const calendarOptions = computed<CalendarOptions>(() => ({
  plugins: [dayGridPlugin, timeGridPlugin, interactionPlugin, luxonPlugin],
  timeZone: TZ,

  initialView: viewMode.value,
  headerToolbar: false,

  height: 'auto',
  expandRows: true,
  nowIndicator: true,

  selectable: true,
  selectMirror: true,
  select: onSelect,

  editable: true,
  eventResizableFromStart: true,

  eventClick: onEventClick,
  eventDrop: (arg) => void onEventDrop(arg),
  eventResize: (arg) => void onEventResize(arg),

  selectAllow: (selectInfo) => {
    return !isPastSlot(selectInfo.start);
  },

  datesSet: (arg) => {
    onDatesSet(arg);
    syncTitle();
  },

  allDaySlot: false,
  slotMinTime: '07:00:00',
  slotMaxTime: '18:00:00',
  slotLabelFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },

  eventContent,
  events: events.value,

  dayMaxEvents: true,
}));

watch(viewMode, async (v) => {
  await nextTick();
  const api = fcRef.value?.getApi();
  api?.changeView(v);
  syncTitle();
  void fetchAppointments();
});

void nextTick(() => syncTitle());

watch(
  () => [props.branchId, props.refreshKey],
  async () => {
    await nextTick();
    void fetchAppointments();
  },
  { immediate: true },
);

function syncTitle() {
  const api = fcRef.value?.getApi();
  calendarTitle.value = api?.view?.title ?? '';
}

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
</script>

<style scoped>
.calendar-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.calendar-card {
  border-radius: 16px;
  overflow: hidden;
  background: #fff;
}

:deep(.fc) {
  font-family: inherit;
}

:deep(.fc .fc-scrollgrid) {
  border-left: none;
  border-right: none;
}

:deep(.fc .fc-toolbar-title) {
  font-weight: 600;
}

:deep(.fc .fc-timegrid-slot) {
  height: 42px;
}

:deep(.fc .fc-daygrid-day-frame),
:deep(.fc .fc-timegrid-col-frame) {
  background: #fff;
}

:deep(.fc .fc-event) {
  border-radius: 10px;
  border: none;
  padding: 2px 6px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.06);
}

:deep(.evt-time) {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.2px;
}

:deep(.evt-confirmed) {
  background: #1f9d55 !important;
  color: #fff !important;
}

:deep(.evt-pending) {
  background: #f59e0b !important;
  color: #111827 !important;
}

:deep(.evt-cancelled) {
  background: #ef4444 !important;
  color: #fff !important;
  text-decoration: line-through;
}

:deep(.evt-past) {
  opacity: 0.55;
  filter: grayscale(0.25);
  cursor: not-allowed;
}

:deep(.evt-past .fc-event-main) {
  opacity: 1;
}

.empty-wrap {
  padding: 28px;
}

.empty-card {
  border: 1px dashed rgba(0, 0, 0, 0.18);
  border-radius: 16px;
  padding: 18px 16px;
  background: rgba(0, 0, 0, 0.015);
}

.fc .fc-event-main {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 0 !important;
}
</style>
