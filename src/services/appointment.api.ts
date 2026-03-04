import type {
  Appointment,
  AppointmentNotification,
  CreateAppointmentPayload,
  RescheduleAppointmentPayload,
} from 'src/types/domain';
import { http } from './http';

export async function listAppointmentsByBranch(branchId: string): Promise<Appointment[]> {
  const res = await http.get<Appointment[]>(
    `/v1/branches/${encodeURIComponent(branchId)}/appointments`,
  );
  return res.data;
}

export async function getAppointmentsRange(params: {
  branchId: string;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
}): Promise<Appointment[]> {
  const res = await http.get<Appointment[]>('/v1/appointments/range', {
    params,
  });

  return res.data;
}

export async function getAppointment(id: string): Promise<Appointment> {
  const res = await http.get<Appointment>(`/v1/appointments/${encodeURIComponent(id)}`);
  return res.data;
}

export async function createAppointment(payload: CreateAppointmentPayload): Promise<Appointment> {
  const res = await http.post<Appointment>('/v1/appointments', payload);
  return res.data;
}

export async function rescheduleAppointment(
  id: string,
  payload: RescheduleAppointmentPayload,
): Promise<Appointment> {
  const res = await http.patch<Appointment>(
    `/v1/appointments/${encodeURIComponent(id)}/reschedule`,
    payload,
  );
  return res.data;
}

export async function confirmAppointment(id: string): Promise<Appointment> {
  const res = await http.patch<Appointment>(`/v1/appointments/${encodeURIComponent(id)}/confirm`);
  return res.data;
}

export async function cancelAppointment(id: string): Promise<Appointment> {
  const res = await http.patch<Appointment>(`/v1/appointments/${encodeURIComponent(id)}/cancel`);
  return res.data;
}

export async function getAppointmentNotifications(id: string): Promise<AppointmentNotification[]> {
  const res = await http.get<AppointmentNotification[]>(
    `/v1/notifications/${encodeURIComponent(id)}`,
  );
  return res.data;
}
