import { useConfirmContext } from './ToastProvider';

export default function useConfirm() {
  const ctx = useConfirmContext();
  if (!ctx) {
    throw new Error('useConfirm must be used within <ToastProvider>');
  }
  return ctx;
}

