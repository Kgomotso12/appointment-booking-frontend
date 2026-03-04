import { Notify } from 'quasar';

export function notifyError(error: unknown, fallback = 'Something went wrong') {
  let message = fallback;

  if (error instanceof Error) {
    message = error.message;
  }

  const axiosErr = error as { friendlyMessage?: string };

  if (axiosErr?.friendlyMessage) {
    message = axiosErr.friendlyMessage;
  }

  Notify.create({
    type: 'negative',
    message,
  });
}

export function notifySuccess(message: string) {
  Notify.create({
    type: 'positive',
    message,
    timeout: 2000,
  });
}

export function notifyInfo(message: string) {
  Notify.create({
    type: 'info',
    message,
    timeout: 2500,
  });
}
