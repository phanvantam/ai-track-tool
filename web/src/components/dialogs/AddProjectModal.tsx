import { Button, Group, Modal, Progress, Stack, TextInput } from "@mantine/core";
import { type ChangeEvent, type KeyboardEvent, useState } from "react";

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (path: string) => Promise<void>;
  loading: boolean;
  progress: number;
}

/**
 * Modal thêm project mới.
 * Cho phép nhập path và thêm project với progress bar.
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
    await onAdd(newPath);
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
      opened={isOpen}
      onClose={onClose}
      title="Thêm Project Mới"
      centered
      closeOnClickOutside={!loading}
      closeOnEscape={!loading}
    >
      <Stack gap="md">
        <TextInput
          label="Đường dẫn Project"
          placeholder="/path/to/project"
          value={newPath}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          disabled={loading}
          autoFocus
        />
        {loading && <Progress value={progress} />}
        <Group justify="flex-end" gap="sm">
          <Button
            variant="default"
            onClick={onClose}
            disabled={loading}
          >
            Hủy
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            loading={loading}
            disabled={!newPath.trim()}
          >
            Thêm
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
