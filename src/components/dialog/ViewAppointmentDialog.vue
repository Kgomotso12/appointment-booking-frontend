<template>
  <q-dialog v-model="open" no-backdrop-dismiss>
    <q-card class="dialog-card q-pa-none">
      <q-card-section class="row items-center q-px-lg q-pt-lg q-pb-md">
        <div class="col">
          <div class="text-h6">Appointment</div>
          <div class="text-caption text-grey-7">
            {{ headerSubtitle }}
          </div>
        </div>

        <q-btn
          flat
          round
          icon="close"
          aria-label="Close"
          :disable="loading || !!actionLoading"
          @click="close()"
        />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-px-lg q-py-md">
        <div v-if="loading" class="row items-center justify-center q-py-xl">
          <q-spinner size="32px" />
        </div>

        <template v-else-if="appointment">
          <q-card flat bordered class="q-pa-md" style="border-radius: 12px">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-chip dense :class="statusChipClass(appointment.status)" text-color="white">
                  {{ appointment.status }}
                </q-chip>
              </div>

              <div class="col-12 col-md-6">
                <div class="meta-label">Customer</div>
                <div class="meta-value">{{ appointment.customerName || '—' }}</div>
              </div>

              <div class="col-12 col-md-6">
                <div class="meta-label">Date</div>
                <div class="meta-value">{{ appointmentDate }}</div>
              </div>

              <div class="col-12 col-md-6">
                <div class="meta-label">Email</div>
                <div class="meta-value">{{ appointment.customerEmail }}</div>
              </div>

              <div class="col-12 col-md-6">
                <div class="meta-label">Time</div>
                <div class="meta-value">{{ appointmentTimeRange }}</div>
              </div>

              <div class="col-12">
                <div class="meta-label">Branch</div>
                <div class="meta-value">{{ branchLabel }}</div>
              </div>
            </div>
          </q-card>

          <div class="q-mt-md">
            <div class="row items-center justify-between q-mb-sm">
              <div class="text-subtitle2 text-weight-semibold">Notifications</div>
              <q-btn
                flat
                dense
                icon="refresh"
                label="Reload"
                :loading="notificationsLoading"
                @click="loadNotifications()"
              />
            </div>

            <div v-if="notificationsLoading" class="row items-center q-gutter-sm q-py-sm">
              <q-spinner size="18px" />
              <div class="text-caption text-grey-7">Loading notifications…</div>
            </div>

            <q-list v-else bordered separator class="rounded-borders">
              <q-item v-if="!sentNotifications.length">
                <q-item-section class="text-grey-7"> No sent notifications </q-item-section>
              </q-item>

              <q-item v-for="n in sentNotifications" :key="n.id" class="q-py-sm">
                <q-item-section>
                  <q-item-label class="row items-center no-wrap">
                    <div class="text-body2 text-weight-medium">
                      {{ n.channel }}
                    </div>
                  </q-item-label>

                  <q-item-label class="text-body2 q-mt-xs">
                    <div class="clamp-2-lines">
                      {{ n.message }}
                    </div>
                  </q-item-label>

                  <q-item-label caption class="q-mt-xs">
                    {{ formatDateTime(n.sentAt) }}
                  </q-item-label>
                </q-item-section>
              </q-item>
            </q-list>

            <q-banner v-if="actionError" class="q-mt-md" rounded dense inline-actions>
              <template #avatar>
                <q-icon name="error_outline" />
              </template>
              {{ actionError }}
            </q-banner>
          </div>
        </template>
      </q-card-section>

      <q-separator />

      <q-card-actions align="between" class="q-px-lg q-py-md">
        <!-- <div class="row items-center" style="gap: 8px">
          <q-btn
            v-if="canCancel"
            unelevated
            color="negative"
            label="Cancel"
            :loading="actionLoading === 'cancel'"
            @click="handleCancelAppointment"
          />
        </div> -->

        <q-btn flat label="Close" :disable="!!actionLoading" @click="close()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import type { Appointment, AppointmentNotification, AppointmentStatus } from 'src/types/domain';
import {
  getAppointmentNotifications,
  getAppointment,
  //cancelAppointment as apiCancelAppointment,
} from 'src/services/appointment.api';

defineOptions({ name: 'ViewAppointmentDialog' });

const props = defineProps<{
  modelValue: boolean;
  appointmentId: string | null;
  branchLabel: string;
  tz: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'changed'): void;
  (e: 'close'): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const loading = ref(false);
const appointment = ref<Appointment | null>(null);

const notifications = ref<AppointmentNotification[]>([]);
const notificationsLoading = ref(false);

const actionLoading = ref<null | 'confirm' | 'cancel'>(null);
const actionError = ref<string | null>(null);

function toLocal(dtISO: string) {
  return DateTime.fromISO(dtISO, { setZone: true }).setZone(props.tz);
}

function formatDateTime(dtISO: string) {
  const dt = toLocal(dtISO);
  return dt.isValid ? dt.toFormat('ccc, dd LLL yyyy • HH:mm') : '—';
}

const sentNotifications = computed(() =>
  [...notifications.value]
    .filter((n) => !!n.sentAt)
    .sort(
      (a, b) =>
        DateTime.fromISO(b.sentAt, { setZone: true }).toMillis() -
        DateTime.fromISO(a.sentAt, { setZone: true }).toMillis(),
    ),
);

// const canCancel = computed(() => {
//   const s = appointment.value?.status;
//   return s === 'PENDING_CONFIRMATION' || s === 'CONFIRMED';
// });

const appointmentDate = computed(() => {
  if (!appointment.value) return '';
  const s = toLocal(appointment.value.startTime);
  return s.isValid ? s.toFormat('yyyy-LL-dd') : '—';
});

const appointmentTimeRange = computed(() => {
  if (!appointment.value) return '';
  const s = toLocal(appointment.value.startTime);
  const e = toLocal(appointment.value.endTime);
  if (!s.isValid || !e.isValid) return '—';
  return `${s.toFormat('HH:mm')}–${e.toFormat('HH:mm')} (${props.tz})`;
});

const headerSubtitle = computed(() => {
  if (!appointment.value) return `Details (${props.tz})`;
  const s = toLocal(appointment.value.startTime);
  const e = toLocal(appointment.value.endTime);
  if (!s.isValid || !e.isValid) return `Details (${props.tz})`;
  return `${appointment.value.customerName || '—'} • ${s.toFormat(
    'yyyy-LL-dd',
  )} ${s.toFormat('HH:mm')}–${e.toFormat('HH:mm')} (${props.tz})`;
});

function statusChipClass(status: AppointmentStatus) {
  if (status === 'CONFIRMED') return 'chip-confirmed';
  if (status === 'PENDING_CONFIRMATION') return 'chip-pending';
  return 'chip-cancelled';
}

async function loadNotifications() {
  if (!appointment.value) return;
  notificationsLoading.value = true;
  try {
    notifications.value = await getAppointmentNotifications(appointment.value.id);
  } finally {
    notificationsLoading.value = false;
  }
}

async function loadAppointment() {
  if (!props.appointmentId) return;

  loading.value = true;
  appointment.value = null;
  notifications.value = [];
  actionError.value = null;
  actionLoading.value = null;

  try {
    const a = await getAppointment(props.appointmentId);
    appointment.value = a;
    await loadNotifications();
  } finally {
    loading.value = false;
  }
}

watch(
  () => open.value,
  (v) => {
    if (v) void loadAppointment();
  },
);

watch(
  () => props.appointmentId,
  () => {
    if (open.value) void loadAppointment();
  },
);

function close() {
  open.value = false;
  emit('close');
}

// async function handleCancelAppointment() {
//   if (!appointment.value) return;
//   actionLoading.value = 'cancel';
//   actionError.value = null;

//   try {
//     await apiCancelAppointment(appointment.value.id);
//     appointment.value = await getAppointment(appointment.value.id);
//     await loadNotifications();
//     emit('changed');
//   } catch (e) {
//     actionError.value = e instanceof Error ? e.message : 'Failed to cancel';
//   } finally {
//     actionLoading.value = null;
//   }
// }
</script>

<style scoped>
.dialog-card {
  width: 720px;
  max-width: 92vw;
  border-radius: 16px;
}

.meta-label {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.55);
  margin-bottom: 4px;
}

.meta-value {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.87);
}

.chip-confirmed {
  background: #1f9d55;
}

.chip-pending {
  background: #f59e0b;
  color: #111827 !important;
}

.chip-cancelled {
  background: #ef4444;
}

.clamp-2-lines {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}
</style>
