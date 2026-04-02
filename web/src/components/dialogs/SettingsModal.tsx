import { Button, Flex, Input, Modal, Typography } from "antd";
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
 * Modal cấu hình.
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
  }, [config, isOpen]);

  async function handleSave() {
    await onSave(storageDirInput.trim() || null);
    onClose();
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setStorageDirInput(event.currentTarget.value);
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Cấu hình"
      footer={null}
      centered
      maskClosable={!loading}
      keyboard={!loading}
      destroyOnHidden
    >
      <Flex vertical gap="middle">
        {/* Storage directory */}
        <div>
          <Typography.Text strong>
            Storage Directory
          </Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
            Để trống để sử dụng thư mục mặc định của hệ thống.
          </Typography.Text>
          <Input
            placeholder="/path/to/storage"
            value={storageDirInput}
            onChange={handleInputChange}
            disabled={loading}
          />
        </div>

        <Flex justify="end" gap="small" style={{ marginTop: 8 }}>
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="primary" onClick={() => void handleSave()} loading={loading}>
            Lưu
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}
