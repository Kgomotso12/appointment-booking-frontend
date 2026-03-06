export interface Branch {
  id: string;
  name: string;
  address: string;
}

export type AppointmentStatus = 'CONFIRMED' | 'PENDING_CONFIRMATION' | 'CANCELLED';

/**
 * Public / minimal appointment (used for public APIs and token views)
 */
export interface AppointmentMinimal {
  id: string;

  branchId?: string;

  startTime: string;
  endTime: string;

  status: AppointmentStatus;
}

/**
 * Full appointment (admin view)
 */
export interface Appointment extends AppointmentMinimal {
  customerName?: string | null;
  customerEmail?: string | null;
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
