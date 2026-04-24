import { useToastContext } from './ToastProvider';

export default function useToast() {
  const ctx = useToastContext();
  if (!ctx) {
    throw new Error('useToast must be used within <ToastProvider>');
  }
  return ctx;
}

