import { ref } from 'vue';
import { useQuasar } from 'quasar';

import type {
  Appointment,
  CreateAppointmentPayload,
  RescheduleAppointmentPayload,
} from 'src/types/domain';
import {
  cancelAppointment,
  confirmAppointment,
  createAppointment,
  rescheduleAppointment,
} from 'src/services/appointment.api';
import { notifyError, notifySuccess } from 'src/utils/notify';

export function useAppointments() {
  const quasar = useQuasar();

  const loading = ref(false);

  async function runCreate(payload: CreateAppointmentPayload): Promise<Appointment | null> {
    loading.value = true;

    try {
      const created = await createAppointment(payload);
      notifySuccess('Appointment created');
      return created;
    } catch (err) {
      console.error('Failed to create appointment', err);
      notifyError(err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function runCancel(appointmentId: string): Promise<boolean> {
    loading.value = true;

    try {
      await cancelAppointment(appointmentId);
      notifySuccess('Appointment cancelled');
      return true;
    } catch (err) {
      console.error('Failed to cancel appointment', err);
      notifyError(err);
      return false;
    } finally {
      loading.value = false;
    }
  }

  async function confirmAndCancel(appointmentId: string): Promise<boolean> {
    return new Promise((resolve) => {
      quasar
        .dialog({
          title: 'Cancel Appointment',
          message: 'Are you sure you want to cancel this appointment?',
          cancel: true,
          persistent: true,
        })
        .onOk(() => {
          void runCancel(appointmentId).then(resolve);
        })
        .onCancel(() => resolve(false));
    });
  }

  async function runReschedule(
    appointmentId: string,
    payload: RescheduleAppointmentPayload,
  ): Promise<Appointment | null> {
    loading.value = true;

    try {
      const updated = await rescheduleAppointment(appointmentId, payload);
      notifySuccess('Appointment rescheduled');
      return updated;
    } catch (err) {
      console.error('Failed to reschedule appointment', err);
      notifyError(err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function runConfirm(appointmentId: string): Promise<Appointment | null> {
    loading.value = true;

    try {
      const confirmed = await confirmAppointment(appointmentId);
      notifySuccess('Appointment confirmed');
      return confirmed;
    } catch (err) {
      console.error('Failed to confirm appointment', err);
      notifyError(err);
      return null;
    } finally {
      loading.value = false;
    }
  }

  // async function runUpdate(id: ID, payload: CreateAppointmentPayload): Promise<Appointment | null> {
  //   loading.value = true;

  //   try {
  //     const updated = await updateAppointment(id, payload);
  //     quasar.notify({ type: 'positive', message: 'Appointment updated', timeout: 2000 });
  //     return updated;
  //   } catch (err) {
  //     console.error('Failed to update appointment', err);
  //     quasar.notify({ type: 'negative', message: 'Failed to update appointment', timeout: 3500 });
  //     return null;
  //   } finally {
  //     loading.value = false;
  //   }
  // }

  return {
    loading,
    runCreate,
    //runUpdate,
    runCancel,
    runReschedule,
    runConfirm,
    confirmAndCancel,
  };
}
