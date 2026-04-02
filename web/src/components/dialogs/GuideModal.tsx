import { Badge, Group, Modal, Stack, Text, ThemeIcon } from "@mantine/core";
import {
  IconCheck,
  IconFileText,
  IconHistory,
  IconQrcode,
  IconTimeline,
} from "@tabler/icons-react";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Modal hướng dẫn sử dụng.
 * Hiển thị các tính năng chính và cách sử dụng.
 */
export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title="Hướng Dẫn Sử Dụng"
      centered
      size="md"
    >
      <Stack gap="lg">
        {/* Features */}
        <Stack gap="sm">
          <Text fw={600} size="sm">
            Tính Năng Chính
          </Text>

          <Group gap="md" align="flex-start">
            <ThemeIcon size="lg" variant="light" color="blue" radius="md">
              <IconQrcode size={20} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>
                Quản Lý Session
              </Text>
              <Text size="xs" c="dimmed">
                Thêm, xóa, chuyển đổi giữa các dự án.
              </Text>
            </div>
          </Group>

          <Group gap="md" align="flex-start">
            <ThemeIcon size="lg" variant="light" color="green" radius="md">
              <IconFileText size={20} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>
                Xem Diff
              </Text>
              <Text size="xs" c="dimmed">
                Xem thay đổi file hiện tại so với snapshot lưu trữ.
              </Text>
            </div>
          </Group>

          <Group gap="md" align="flex-start">
            <ThemeIcon size="lg" variant="light" color="orange" radius="md">
              <IconHistory size={20} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>
                Lịch Sử Snapshot
              </Text>
              <Text size="xs" c="dimmed">
                Xem danh sách snapshots và so sánh giữa các version.
              </Text>
            </div>
          </Group>

          <Group gap="md" align="flex-start">
            <ThemeIcon size="lg" variant="light" color="red" radius="md">
              <IconCheck size={20} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>
                Restore & Rollback
              </Text>
              <Text size="xs" c="dimmed">
                Khôi phục hoặc quay lại snapshot trước đó.
              </Text>
            </div>
          </Group>

          <Group gap="md" align="flex-start">
            <ThemeIcon size="lg" variant="light" color="purple" radius="md">
              <IconTimeline size={20} />
            </ThemeIcon>
            <div>
              <Text size="sm" fw={500}>
                Reflog & Health Check
              </Text>
              <Text size="xs" c="dimmed">
                Kiểm tra lịch hoạt động và tính toàn vẹn dữ liệu.
              </Text>
            </div>
          </Group>
        </Stack>

        {/* Keyboard Shortcuts */}
        <Stack gap="sm">
          <Text fw={600} size="sm">
            Phím Tắt
          </Text>
          <Group justify="space-between" gap="md">
            <Text size="xs">
              <Badge size="sm" variant="light">
                Ctrl+?
              </Badge>{" "}
              Mở hướng dẫn
            </Text>
          </Group>
        </Stack>
      </Stack>
    </Modal>
  );
}
