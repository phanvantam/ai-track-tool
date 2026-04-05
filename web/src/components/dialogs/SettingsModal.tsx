import { Button, Flex, Input, InputNumber, Modal, Typography } from "antd";
import { type ChangeEvent, useEffect, useState } from "react";
import type { ConfigPayload } from "../../api";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ConfigPayload | null;
  onSave: (storageDir: string | null, bulkCollapseThreshold?: number) => Promise<void>;
  loading: boolean;
}

/**
 * Modal cấu hình hệ thống.
 * Bao gồm: Storage Directory, Ngưỡng gom nhóm thư mục.
 */
export function SettingsModal({
  isOpen,
  onClose,
  config,
  onSave,
  loading,
}: SettingsModalProps) {
  const [storageDirInput, setStorageDirInput] = useState("");
  const [thresholdInput, setThresholdInput] = useState<number>(10);

  useEffect(() => {
    if (isOpen && config) {
      setStorageDirInput(config.config.storageDir ?? "");
      setThresholdInput(config.config.bulkCollapseThreshold ?? 10);
    }
  }, [config, isOpen]);

  async function handleSave() {
    await onSave(storageDirInput.trim() || null, thresholdInput);
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

        {/* Ngưỡng gom nhóm thư mục */}
        <div>
          <Typography.Text strong>
            Ngưỡng gom nhóm thư mục
          </Typography.Text>
          <Typography.Text type="secondary" style={{ display: 'block', fontSize: 12, marginBottom: 4 }}>
            Khi một thư mục có số file thay đổi ≥ ngưỡng này, các file sẽ được gom thành 1 dòng.
          </Typography.Text>
          <InputNumber
            min={1}
            max={10000}
            value={thresholdInput}
            onChange={(value) => setThresholdInput(value ?? 10)}
            disabled={loading}
            style={{ width: '100%' }}
            addonAfter="file"
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
