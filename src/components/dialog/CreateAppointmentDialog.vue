<template>
  <q-dialog
    :model-value="modelValue"
    @update:model-value="emit('update:modelValue', $event)"
    no-backdrop-dismiss
  >
    <q-card class="q-pa-none" style="width: 720px; max-width: 92vw; border-radius: 16px">
      <!-- Header -->
      <q-card-section class="row items-center q-px-lg q-pt-lg q-pb-md">
        <div class="col">
          <div class="text-h6">
            {{ mode === 'edit' ? 'Edit appointment' : 'New appointment' }}
          </div>
          <div class="text-caption text-grey-7">
            {{ headerSubtitle }}
          </div>
        </div>

        <q-btn flat round icon="close" aria-label="Close" :disable="submitting" @click="close()" />
      </q-card-section>

      <q-separator />

      <q-card-section class="q-px-lg q-py-md">
        <q-form ref="formRef" class="q-gutter-md" @submit.prevent="submit">
          <q-card flat bordered class="q-pa-md" style="border-radius: 12px">
            <div class="row q-col-gutter-md">
              <!-- Row 1: Customer Name | Date -->
              <div class="col-12 col-md-6">
                <q-input
                  v-model.trim="customerName"
                  label="Customer name"
                  dense
                  outlined
                  :maxlength="80"
                  autocomplete="name"
                  @update:model-value="onUserEdit('customerName')"
                  @blur="touchLocal('customerName')"
                  :error="showLocalError()"
                  :error-message="localErrorMessage()"
                />
              </div>

              <div class="col-12 col-md-6">
                <q-input v-model="form.date" label="Date" dense outlined readonly>
                  <template #append>
                    <q-icon name="event" class="cursor-pointer">
                      <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                        <q-date
                          v-model="form.date"
                          mask="yyyy-LL-dd"
                          @update:model-value="onUserEdit('date')"
                          @blur="touch('date')"
                        />
                      </q-popup-proxy>
                    </q-icon>
                  </template>
                </q-input>

                <div v-if="showFieldError('date')" class="text-caption text-negative q-mt-xs">
                  {{ fieldErrorMessage('date') }}
                </div>
              </div>

              <!-- Row 2: Customer Email | Start + End -->
              <div class="col-12 col-md-6">
                <q-input
                  v-model.trim="form.customerEmail"
                  label="Customer email"
                  dense
                  outlined
                  :maxlength="120"
                  autocomplete="email"
                  hint="Used for confirmations and reminders"
                  @update:model-value="onUserEdit('customerEmail')"
                  @blur="touch('customerEmail')"
                  :error="showFieldError('customerEmail')"
                  :error-message="fieldErrorMessage('customerEmail')"
                />
              </div>

              <div class="col-12 col-md-6">
                <div class="row q-col-gutter-md">
                  <!-- Start -->
                  <div class="col-12 col-sm-6">
                    <q-input v-model="form.startTime" label="Start" dense outlined readonly>
                      <template #append>
                        <q-icon name="schedule" class="cursor-pointer">
                          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                            <q-time
                              v-model="form.startTime"
                              format24h
                              @update:model-value="onTimeChanged('start')"
                            />
                          </q-popup-proxy>
                        </q-icon>
                      </template>
                    </q-input>

                    <div
                      v-if="showFieldError('startTime')"
                      class="text-caption text-negative q-mt-xs"
                    >
                      {{ fieldErrorMessage('startTime') }}
                    </div>
                  </div>

                  <!-- End -->
                  <div class="col-12 col-sm-6">
                    <q-input v-model="form.endTime" label="End" dense outlined readonly>
                      <template #append>
                        <q-icon name="schedule" class="cursor-pointer">
                          <q-popup-proxy cover transition-show="scale" transition-hide="scale">
                            <q-time
                              v-model="form.endTime"
                              format24h
                              @update:model-value="onTimeChanged('end')"
                            />
                          </q-popup-proxy>
                        </q-icon>
                      </template>
                    </q-input>

                    <div
                      v-if="showFieldError('endTime')"
                      class="text-caption text-negative q-mt-xs"
                    >
                      {{ fieldErrorMessage('endTime') }}
                    </div>
                  </div>

                  <!-- Time validation -->
                  <div v-if="timeValidationError" class="col-12">
                    <div class="text-caption text-negative q-mt-xs">
                      {{ timeValidationError }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Row 3: Status aligned to the right column -->
              <!-- Row 3: Status aligned to the right column -->
              <div v-if="mode === 'edit'" class="col-12 col-md-6 offset-md-6">
                <q-select
                  v-model="status"
                  label="Status"
                  dense
                  outlined
                  emit-value
                  map-options
                  :options="statusOptions"
                  @update:model-value="onUserEdit('general')"
                />
              </div>
            </div>
          </q-card>

          <!-- Generic backend error -->
          <q-banner v-if="backendGeneralError" dense rounded class="bg-red-1 text-red-9">
            {{ backendGeneralError }}
          </q-banner>

          <!-- Footer actions -->
          <div class="row items-center q-pt-xs">
            <div class="col" />

            <div class="col-auto q-gutter-sm">
              <!-- Cancel just closes the modal -->
              <q-btn outline color="grey-8" label="Cancel" :disable="submitting" @click="close()" />

              <q-btn
                unelevated
                color="primary"
                :label="mode === 'edit' ? 'Save changes' : 'Create appointment'"
                type="submit"
                :loading="submitting"
                :disable="!canSubmit"
              />
            </div>
          </div>
        </q-form>
      </q-card-section>
    </q-card>
  </q-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { DateTime } from 'luxon';
import type { QForm } from 'quasar';
import type { Appointment, CreateAppointmentPayload, AppointmentStatus } from 'src/types/domain';

type UpsertMode = 'create' | 'edit';
type Preset = { date: string; startTime: string; endTime: string };
type FieldName = keyof CreateAppointmentPayload | 'general';

/**
 * Local payload extension so we can submit status in edit mode
 * without breaking create mode typing.
 */
type UpsertAppointmentPayload = CreateAppointmentPayload & {
  status?: Extract<AppointmentStatus, 'CONFIRMED' | 'CANCELLED'>;
};

const props = defineProps<{
  modelValue: boolean;
  branchId: string;
  tz: string;
  mode: UpsertMode;
  appointment: Appointment | null;
  preset: Preset | null;
  submitting: boolean;
  fieldErrors: Partial<Record<FieldName, string>> | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void;
  (e: 'submit', payload: UpsertAppointmentPayload): void;
  (e: 'clear-field-error', field: FieldName): void;
}>();

const formRef = ref<QForm | null>(null);

const form = reactive<CreateAppointmentPayload>({
  branchId: props.branchId,
  customerName: null,
  customerEmail: '',
  date: '',
  startTime: '',
  endTime: '',
});

watch(
  () => props.branchId,
  (id) => {
    form.branchId = id;
  },
);

// UI model for name (keeps form.customerName nullable and clean)
const customerName = ref('');

// Status (edit mode only)
const status = ref<Extract<AppointmentStatus, 'CONFIRMED' | 'CANCELLED'> | null>(null);
const statusOptions = [
  { label: 'Confirm', value: 'CONFIRMED' },
  { label: 'Cancel', value: 'CANCELLED' },
] as const;

// touched flags
const touched = reactive<Record<keyof CreateAppointmentPayload, boolean>>({
  branchId: false,
  customerName: false,
  customerEmail: false,
  date: false,
  startTime: false,
  endTime: false,
});

const touchedLocal = reactive<Record<'customerName', boolean>>({
  customerName: false,
});

function touch(k: keyof CreateAppointmentPayload) {
  touched[k] = true;
}

function touchLocal(k: keyof typeof touchedLocal) {
  touchedLocal[k] = true;
}

function close() {
  emit('update:modelValue', false);
}

function dtFromParts(date: string, time: string) {
  return DateTime.fromFormat(`${date} ${time}`, 'yyyy-LL-dd HH:mm', { zone: props.tz });
}

function primeFromSources() {
  if (props.mode === 'edit' && props.appointment) {
    const a = props.appointment;
    customerName.value = (a.customerName ?? '').trim();
    form.customerEmail = a.customerEmail ?? '';

    const start = DateTime.fromISO(a.startTime, { setZone: true }).setZone(props.tz);
    const end = DateTime.fromISO(a.endTime, { setZone: true }).setZone(props.tz);

    form.date = start.isValid
      ? start.toFormat('yyyy-LL-dd')
      : DateTime.now().setZone(props.tz).toFormat('yyyy-LL-dd');
    form.startTime = start.isValid ? start.toFormat('HH:mm') : '09:00';
    form.endTime = end.isValid ? end.toFormat('HH:mm') : '09:30';

    // Default dropdown to current status (but only allow confirmed/cancelled)
    status.value = a.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED';
    return;
  }

  // create mode
  customerName.value = '';
  form.customerEmail = '';
  status.value = null;

  if (props.preset) {
    form.date = props.preset.date;
    form.startTime = props.preset.startTime;
    form.endTime = props.preset.endTime;
    return;
  }

  const now = DateTime.now().setZone(props.tz).plus({ minutes: 30 }).startOf('minute');
  form.date = now.toFormat('yyyy-LL-dd');
  form.startTime = now.toFormat('HH:mm');
  form.endTime = now.plus({ minutes: 30 }).toFormat('HH:mm');
}

watch(
  () => props.modelValue,
  (open) => {
    if (!open) return;

    (Object.keys(touched) as (keyof CreateAppointmentPayload)[]).forEach(
      (k) => (touched[k] = false),
    );
    (Object.keys(touchedLocal) as (keyof typeof touchedLocal)[]).forEach(
      (k) => (touchedLocal[k] = false),
    );

    primeFromSources();
  },
);

watch(
  () => [props.mode, props.appointment, props.preset],
  () => {
    if (props.modelValue) primeFromSources();
  },
);

// ---- Validation ----
function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const timeValidationError = computed(() => {
  if (!form.date || !form.startTime || !form.endTime) return '';
  const s = dtFromParts(form.date, form.startTime);
  const e = dtFromParts(form.date, form.endTime);
  if (!s.isValid || !e.isValid) return 'Select a valid date and time';
  if (e <= s) return 'End time must be after start time';
  return '';
});

const clientFieldErrors = computed(() => {
  const errs: Partial<Record<keyof CreateAppointmentPayload, string>> = {};

  if (!form.branchId) errs.branchId = 'Branch is required';

  if (!customerName.value.trim()) errs.customerName = 'Customer name is required';

  if (!form.customerEmail.trim()) errs.customerEmail = 'Email is required';
  else if (!isValidEmail(form.customerEmail.trim()))
    errs.customerEmail = 'Enter a valid email address';

  if (!form.date) errs.date = 'Date is required';
  if (!form.startTime) errs.startTime = 'Start time is required';
  if (!form.endTime) errs.endTime = 'End time is required';
  if (timeValidationError.value) errs.endTime = timeValidationError.value;

  return errs;
});

const backendGeneralError = computed(() => props.fieldErrors?.general ?? '');

function showFieldError(field: keyof CreateAppointmentPayload) {
  const backendMsg = props.fieldErrors?.[field];
  const clientMsg = clientFieldErrors.value[field];
  if (backendMsg) return true;
  return touched[field] && !!clientMsg;
}

function fieldErrorMessage(field: keyof CreateAppointmentPayload) {
  const backendMsg = props.fieldErrors?.[field];
  if (backendMsg) return backendMsg;
  return clientFieldErrors.value[field] ?? '';
}

// Local-only error display for the name input
function showLocalError() {
  return touchedLocal.customerName && !customerName.value.trim();
}

function localErrorMessage() {
  return customerName.value.trim() ? '' : 'Customer name is required';
}

const headerSubtitle = computed(() => {
  const base = props.mode === 'edit' ? 'Update booking details' : 'Create a booking';
  const s = form.date && form.startTime ? `${form.date} ${form.startTime}` : '';
  const e = form.date && form.endTime ? `${form.endTime}` : '';
  return s ? `${base} • ${s}${e ? `–${e}` : ''} (${props.tz})` : `${base} (${props.tz})`;
});

const canSubmit = computed(() => {
  if (props.submitting) return false;
  return Object.keys(clientFieldErrors.value).length === 0;
});

function onUserEdit(field: FieldName) {
  emit('clear-field-error', field);
}

function onTimeChanged(which: 'start' | 'end') {
  touch(which === 'start' ? 'startTime' : 'endTime');
  onUserEdit(which === 'start' ? 'startTime' : 'endTime');
}

function submit() {
  // touch all relevant fields
  touch('customerEmail');
  touch('date');
  touch('startTime');
  touch('endTime');
  touch('customerName');
  touchLocal('customerName');

  if (!canSubmit.value) return;

  const payload: UpsertAppointmentPayload = {
    branchId: form.branchId,
    customerName: customerName.value.trim() || null,
    customerEmail: form.customerEmail.trim(),
    date: form.date,
    startTime: form.startTime,
    endTime: form.endTime,
  };

  // Only include status in edit mode (dropdown shown only in edit)
  if (props.mode === 'edit' && status.value) {
    payload.status = status.value;
  }

  emit('submit', payload);
}
</script>

<style scoped>
/* Keep it subtle; Quasar carries most styling */
</style>
