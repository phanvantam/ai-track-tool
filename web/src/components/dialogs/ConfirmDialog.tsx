import { Button, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";
import type { ConfirmState } from "../../hooks";

interface ConfirmDialogProps {
  confirmState: ConfirmState;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Generic confirm dialog component.
 * Hiển thị modal xác nhận với confirm/cancel buttons.
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
      opened={confirmState.isOpen}
      onClose={onCancel}
      title={confirmState.title}
      centered
      size="sm"
    >
      <Stack gap="md">
        <Text size="sm">{confirmState.message}</Text>
        <Group justify="flex-end" gap="sm">
          <Button variant="default" onClick={onCancel} disabled={isLoading}>
            Hủy
          </Button>
          <Button
            color="red"
            onClick={() => void handleConfirm()}
            loading={isLoading}
          >
            Xác nhận
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
