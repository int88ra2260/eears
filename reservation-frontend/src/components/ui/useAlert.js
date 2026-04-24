import { useAlertContext } from './ToastProvider';

export default function useAlert() {
  const ctx = useAlertContext();
  if (!ctx) {
    throw new Error('useAlert must be used within <ToastProvider>');
  }
  return ctx;
}

