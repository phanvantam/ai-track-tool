import { Button, Flex, Input, Modal, Progress, Typography } from "antd";
import { type ChangeEvent, type KeyboardEvent, useState } from "react";

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (path: string) => Promise<void>;
  loading: boolean;
  progress: number;
}

/**
 * Modal thêm project bằng AntD.
 */
export function AddProjectModal({
  isOpen,
  onClose,
  onAdd,
  loading,
  progress,
}: AddProjectModalProps) {
  const [newPath, setNewPath] = useState("");

  async function handleSubmit() {
    if (!newPath.trim()) return;
    await onAdd(newPath.trim());
    setNewPath("");
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    setNewPath(event.currentTarget.value);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !loading) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Thêm project mới"
      footer={null}
      centered
      maskClosable={!loading}
      keyboard={!loading}
      destroyOnHidden
    >
      <Flex vertical gap="middle">
        <div>
          <Typography.Text type="secondary">Đường dẫn project</Typography.Text>
          <Input
            placeholder="/path/to/project"
            value={newPath}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={loading}
            autoFocus
          />
        </div>

        {loading ? <Progress percent={progress} showInfo={false} /> : null}

        <Flex justify="end" gap="small">
          <Button onClick={onClose} disabled={loading}>
            Hủy
          </Button>
          <Button type="primary" onClick={() => void handleSubmit()} loading={loading} disabled={!newPath.trim()}>
            Thêm
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}
