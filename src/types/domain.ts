export interface Branch {
  id: string;
  name: string;
  address: string;
}

export type AppointmentStatus = 'CONFIRMED' | 'PENDING_CONFIRMATION' | 'CANCELLED';

export interface Appointment {
  id: string;
  branchId: string;

  customerName: string | null;
  customerEmail: string;

  startTime: string;
  endTime: string;

  status: AppointmentStatus;
}

export type NotificationChannel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH' | 'OTHER';
export type NotificationStatus = 'QUEUED' | 'SENT' | 'FAILED';

export interface AppointmentNotification {
  id: string;
  appointmentId: string;
  message: string;

  channel: NotificationChannel;
  status: NotificationStatus;
  sentAt: string;
}

/** API payloads */
export interface CreateAppointmentPayload {
  branchId: string;
  customerName: string | null;
  customerEmail: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface RescheduleAppointmentPayload {
  newDate: string;
  newStartTime: string;
  newEndTime: string;
}
