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

        <template v-else-if="appointmentState">
          <q-card flat bordered class="q-pa-md" style="border-radius: 12px">
            <div class="row q-col-gutter-md">
              <div class="col-12">
                <q-chip dense :class="statusChipClass(appointmentState.status)" text-color="white">
                  {{ appointmentState.status }}
                </q-chip>
              </div>

              <template v-if="fullAppointment">
                <div class="col-12 col-md-6">
                  <div class="meta-label">Customer</div>
                  <div class="meta-value">{{ fullAppointment.customerName || '—' }}</div>
                </div>

                <div class="col-12 col-md-6">
                  <div class="meta-label">Email</div>
                  <div class="meta-value">{{ fullAppointment.customerEmail || '—' }}</div>
                </div>
              </template>

              <div class="col-12 col-md-6">
                <div class="meta-label">Date</div>
                <div class="meta-value">{{ appointmentDate }}</div>
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

          <div v-if="canSeeNotifications" class="q-mt-md">
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
          </div>

          <q-banner v-if="actionError" class="q-mt-md" rounded dense inline-actions>
            <template #avatar>
              <q-icon name="error_outline" />
            </template>
            {{ actionError }}
          </q-banner>
        </template>

        <q-banner v-else class="q-mt-md" rounded dense inline-actions>
          <template #avatar>
            <q-icon name="info_outline" />
          </template>
          No appointment details available.
        </q-banner>
      </q-card-section>

      <q-separator />

      <q-card-actions align="between" class="q-px-lg q-py-md">
        <div class="row items-center" style="gap: 8px">
          <q-btn
            v-if="canCancelWithToken && !canCancelAsAdmin"
            unelevated
            color="negative"
            label="Cancel booking"
            :loading="actionLoading === 'cancel_public'"
            @click="handleCancelPublic"
          />

          <q-btn
            v-if="canCancelAsAdmin"
            outline
            color="negative"
            label="Cancel (admin)"
            :loading="actionLoading === 'cancel_admin'"
            @click="handleCancelAdmin"
          />
        </div>

        <q-btn flat label="Close" :disable="!!actionLoading" @click="close()" />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import type {
  Appointment,
  AppointmentMinimal,
  AppointmentNotification,
  AppointmentStatus,
} from 'src/types/domain';
import {
  getAppointmentNotifications,
  getAppointment,
  getAppointmentPublic,
  cancelAppointment as apiCancelAppointment,
  cancelAppointmentPublic,
} from 'src/services/appointment.api';
import { useAuthStore } from 'src/stores/authStore';
import type { FriendlyAxiosError } from 'src/services/http';

defineOptions({ name: 'ViewAppointmentDialog' });

const props = defineProps<{
  modelValue: boolean;
  appointmentId: string | null;
  appointment?: Appointment | AppointmentMinimal | null;
  manageToken?: string | null;
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

const auth = useAuthStore();
const isAdmin = computed(() => auth.isAuthenticated && auth.isStaffOrAdmin);
const inTokenMode = computed(
  () => typeof props.manageToken === 'string' && props.manageToken.length > 0,
);

const canSeeNotifications = computed(() => isAdmin.value);

const loading = ref(false);
const appointmentState = ref<Appointment | AppointmentMinimal | null>(null);

const notifications = ref<AppointmentNotification[]>([]);
const notificationsLoading = ref(false);

const actionLoading = ref<null | 'cancel_public' | 'cancel_admin'>(null);
const actionError = ref<string | null>(null);

function isFullAppointment(a: Appointment | AppointmentMinimal | null): a is Appointment {
  return !!a && ('customerName' in a || 'customerEmail' in a || 'customerPhone' in a);
}

const fullAppointment = computed(() =>
  isFullAppointment(appointmentState.value) ? appointmentState.value : null,
);

function toLocal(dtISO: string) {
  return DateTime.fromISO(dtISO, { setZone: true }).setZone(props.tz);
}

function formatDateTime(dtISO: string | null) {
  if (!dtISO) return '—';
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

const appointmentDate = computed(() => {
  if (!appointmentState.value) return '';
  const s = toLocal(appointmentState.value.startTime);
  return s.isValid ? s.toFormat('yyyy-LL-dd') : '—';
});

const appointmentTimeRange = computed(() => {
  if (!appointmentState.value) return '';
  const s = toLocal(appointmentState.value.startTime);
  const e = toLocal(appointmentState.value.endTime);
  if (!s.isValid || !e.isValid) return '—';
  return `${s.toFormat('HH:mm')}–${e.toFormat('HH:mm')} (${props.tz})`;
});

const headerSubtitle = computed(() => {
  if (!appointmentState.value) return `Details (${props.tz})`;

  const s = toLocal(appointmentState.value.startTime);
  const e = toLocal(appointmentState.value.endTime);
  if (!s.isValid || !e.isValid) return `Details (${props.tz})`;

  if (fullAppointment.value) {
    return `${fullAppointment.value.customerName || '—'} • ${s.toFormat('yyyy-LL-dd')} ${s.toFormat(
      'HH:mm',
    )}–${e.toFormat('HH:mm')} (${props.tz})`;
  }

  return `${s.toFormat('yyyy-LL-dd')} ${s.toFormat('HH:mm')}–${e.toFormat('HH:mm')} (${props.tz})`;
});

function statusChipClass(status: AppointmentStatus) {
  if (status === 'CONFIRMED') return 'chip-confirmed';
  if (status === 'PENDING_CONFIRMATION') return 'chip-pending';
  return 'chip-cancelled';
}

const canCancelWithToken = computed(() => {
  if (!inTokenMode.value) return false;
  const s = appointmentState.value?.status;
  return s === 'PENDING_CONFIRMATION' || s === 'CONFIRMED';
});

const canCancelAsAdmin = computed(() => {
  if (!isAdmin.value) return false;
  const s = appointmentState.value?.status;
  return s === 'PENDING_CONFIRMATION' || s === 'CONFIRMED';
});

async function loadNotifications() {
  if (!appointmentState.value) return;
  if (!canSeeNotifications.value) return;

  notificationsLoading.value = true;
  try {
    notifications.value = await getAppointmentNotifications(String(appointmentState.value.id));
  } finally {
    notificationsLoading.value = false;
  }
}

async function loadAppointment() {
  loading.value = true;
  appointmentState.value = null;
  notifications.value = [];
  actionError.value = null;
  actionLoading.value = null;

  try {
    if (props.appointment) {
      appointmentState.value = props.appointment;
    } else if (isAdmin.value && props.appointmentId) {
      appointmentState.value = await getAppointment(props.appointmentId);
    } else if (inTokenMode.value && props.manageToken) {
      appointmentState.value = await getAppointmentPublic(props.manageToken);
    } else {
      actionError.value = 'Appointment details are not available.';
      return;
    }

    await loadNotifications();
  } catch (e) {
    const err = e as FriendlyAxiosError;
    actionError.value = err.friendlyMessage ?? 'Failed to load appointment';
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

watch(
  () => props.manageToken,
  () => {
    if (open.value) void loadAppointment();
  },
);

watch(
  () => props.appointment,
  () => {
    if (open.value && props.appointment) appointmentState.value = props.appointment;
  },
);

function close() {
  open.value = false;
  emit('close');
}

async function handleCancelPublic() {
  if (!appointmentState.value) return;
  if (!props.manageToken) return;

  actionLoading.value = 'cancel_public';
  actionError.value = null;

  try {
    await cancelAppointmentPublic(props.manageToken);

    appointmentState.value = {
      ...appointmentState.value,
      status: 'CANCELLED' as AppointmentStatus,
    };

    emit('changed');
  } catch (e) {
    const err = e as FriendlyAxiosError;
    actionError.value = err.friendlyMessage ?? 'Failed to cancel booking';
  } finally {
    actionLoading.value = null;
  }
}

async function handleCancelAdmin() {
  if (!appointmentState.value) return;
  if (!isAdmin.value) return;

  actionLoading.value = 'cancel_admin';
  actionError.value = null;

  try {
    await apiCancelAppointment(String(appointmentState.value.id));

    const a = await getAppointment(String(appointmentState.value.id));
    appointmentState.value = a;

    await loadNotifications();

    emit('changed');
  } catch (e) {
    const err = e as FriendlyAxiosError;
    actionError.value = err.friendlyMessage ?? 'Failed to cancel';
  } finally {
    actionLoading.value = null;
  }
}
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
