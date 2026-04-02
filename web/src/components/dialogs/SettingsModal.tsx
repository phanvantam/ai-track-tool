import { Button, Group, Modal, Stack, Text, TextInput } from "@mantine/core";
import { type ChangeEvent, useEffect, useState } from "react";
import type { ConfigPayload } from "../../api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfigPayload | null;
  onSave: (storageDir: string | null) => Promise<void>;
  loading: boolean;
}

/**
 * Modal cấu hình ứng dụng.
 * Cho phép chỉnh sửa storage directory và lưu.
 */
export function SettingsModal({
  isOpen,
  onClose,
  config,
  onSave,
  loading,
}: SettingsModalProps) {
  const [storageDirInput, setStorageDirInput] = useState("");

  useEffect(() => {
    if (isOpen && config) {
      setStorageDirInput(config.config.storageDir ?? "");
    }
  }, [isOpen, config]);

  async function handleSave() {
    await onSave(storageDirInput.trim() || null);
    onClose();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setStorageDirInput(event.currentTarget.value);
  }

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Cấu Hình"
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <Stack gap="md">
        <div>
          <Text size="xs" c="dimmed" mb="xs">
            Storage Directory (để trống = mặc định)
          </Text>
          <TextInput
            placeholder="/path/to/storage"
            value={storageDirInput}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>
        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={() => void handleSave()}
            loading={loading}
          >
            Lưu
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
