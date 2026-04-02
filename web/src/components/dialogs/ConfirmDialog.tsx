import { Button, Flex, Modal, Typography } from "antd";
import { useState } from "react";
import type { ConfirmState } from "../../hooks";

interface ConfirmDialogProps {
  confirmState: ConfirmState;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Dialog xác nhận dùng AntD Modal.
 */
export function ConfirmDialog({ confirmState, onConfirm, onCancel }: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  async function handleConfirm() {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  }

  const isLoading = confirmState.loading || internalLoading;

  return (
    <Modal
      open={confirmState.isOpen}
      onCancel={onCancel}
      title={confirmState.title}
      footer={null}
      centered
      destroyOnHidden
    >
      <Flex vertical gap="middle">
        <Typography.Text>{confirmState.message}</Typography.Text>
        <Flex justify="end" gap="small">
          <Button onClick={onCancel} disabled={isLoading}>
            Hủy
          </Button>
          <Button danger type="primary" onClick={() => void handleConfirm()} loading={isLoading}>
            Xác nhận
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}
