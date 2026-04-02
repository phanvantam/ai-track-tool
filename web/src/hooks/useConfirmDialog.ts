import { useState } from "react";

export interface ConfirmState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

interface UseConfirmDialogReturn {
  confirmState: ConfirmState;
  openConfirm: (title: string, message: string, onConfirm?: () => void | Promise<void>, onCancel?: () => void) => void;
  closeConfirm: () => void;
  setLoading: (loading: boolean) => void;
}

/**
 * Generic confirm dialog state management.
 * Quản lý confirm dialog state cho các tác vụ yêu cầu xác nhận.
 */
export function useConfirmDialog(): UseConfirmDialogReturn {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: undefined,
    onCancel: undefined,
    loading: false,
  });

  function openConfirm(
    title: string,
    message: string,
    onConfirm?: () => void | Promise<void>,
    onCancel?: () => void,
  ) {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      onCancel,
      loading: false,
    });
  }

  function closeConfirm() {
    setConfirmState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }

  function setLoading(loading: boolean) {
    setConfirmState((prev) => ({
      ...prev,
      loading,
    }));
  }

  return {
    confirmState,
    openConfirm,
    closeConfirm,
    setLoading,
  };
}
