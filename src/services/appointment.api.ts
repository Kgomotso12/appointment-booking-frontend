import type {
  Appointment,
  AppointmentMinimal,
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
  from: string;
  to: string;
}): Promise<Appointment[]> {
  const res = await http.get<Appointment[]>('/v1/appointments/range', { params });
  return res.data;
}

export async function getAppointmentsViewRange(params: {
  branchId: string;
  from: string;
  to: string;
}): Promise<AppointmentMinimal[]> {
  const res = await http.get<AppointmentMinimal[]>('/v1/appointments/public/range', { params });
  return res.data;
}

export async function getAppointment(id: string): Promise<Appointment> {
  const res = await http.get<Appointment>(`/v1/appointments/${encodeURIComponent(id)}`);
  return res.data;
}

export async function getAppointmentPublic(token: string): Promise<AppointmentMinimal> {
  const res = await http.get<AppointmentMinimal>(
    `/v1/appointments/public/${encodeURIComponent(token)}/appointment`,
  );
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

export async function cancelAppointmentPublic(token: string): Promise<void> {
  await http.patch(`/v1/appointments/cancel-public/${encodeURIComponent(token)}`);
}

export async function getAppointmentNotifications(
  appointmentId: string,
): Promise<AppointmentNotification[]> {
  const res = await http.get<AppointmentNotification[]>(
    `/v1/notifications/${encodeURIComponent(appointmentId)}`,
  );
  return res.data;
}
