/**
 * SnapshotDrawerOverviewTab - Tab "Tổng quan" trong SnapshotDrawer
 * Hiển thị: snapshot info, restore button
 */

import { Badge, Button, Group, Stack, Text } from "@mantine/core";
import { IconRestore } from "@tabler/icons-react";

import type { SessionHistoryView } from "../../api";
import { shortId } from "./helpers";
import type { ConfirmDialogState } from "./types";

interface SnapshotDrawerOverviewTabProps {
  selectedSnapshot: SessionHistoryView["snapshots"][0];
  onRestoreSnapshot: (id: string) => void;
  onOpenConfirm: (state: ConfirmDialogState) => void;
  onClose: () => void;
}

export function SnapshotDrawerOverviewTab({
  selectedSnapshot,
  onRestoreSnapshot,
  onOpenConfirm,
  onClose,
}: SnapshotDrawerOverviewTabProps) {
  return (
    <Stack gap="md">
      <div className="inspector-card">
        <Stack gap="sm">
          <Group justify="space-between" align="flex-start">
            <Stack gap={2}>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                Mốc đã chọn
              </Text>
              <Text size="sm" fw={600} className="history-id">
                {selectedSnapshot.snapshotId}
              </Text>
            </Stack>
            <Group gap="xs">
              {selectedSnapshot.isActive ? (
                <Badge size="xs" color="violet">
                  hiện tại
                </Badge>
              ) : null}
              <Badge size="xs" variant="light">
                {selectedSnapshot.fileCount} file
              </Badge>
            </Group>
          </Group>

          <div className="inspector-list-item">
            <Text size="xs" c="dimmed">
              Thời gian
            </Text>
            <Text size="sm">
              {new Date(selectedSnapshot.createdAt).toLocaleString("vi-VN")}
            </Text>
          </div>

          <div className="inspector-list-item">
            <Text size="xs" c="dimmed">
              Mốc cha
            </Text>
            <Text size="sm" className="history-id">
              {selectedSnapshot.parentSnapshotId ?? "-"}
            </Text>
          </div>

          <div className="inspector-list-item">
            <Text size="xs" c="dimmed">
              Tóm tắt
            </Text>
            <Text size="sm">
              {selectedSnapshot.summary ?? "Chưa có mô tả riêng."}
            </Text>
          </div>

          {!selectedSnapshot.isActive ? (
            <Group justify="flex-end">
              <Button
                color="orange"
                leftSection={<IconRestore size={14} stroke={1.8} />}
                onClick={() =>
                  onOpenConfirm({
                    title: "Xác nhận khôi phục về mốc này",
                    description:
                      "Toàn bộ project sẽ được đưa về đúng trạng thái của mốc đã chọn.",
                    warnings: [
                      "Workspace hiện tại sẽ bị ghi đè theo mốc đã chọn.",
                      "Mốc hiện tại sẽ chuyển sang mốc này và danh sách thay đổi sẽ về 0.",
                      "Nếu cần trạng thái hiện tại, hãy tạo mốc mới trước khi khôi phục.",
                    ],
                    confirmLabel: "Khôi phục mốc",
                    confirmColor: "orange",
                    onConfirm: () => {
                      onClose();
                      onRestoreSnapshot(selectedSnapshot.snapshotId);
                    },
                  })
                }
              >
                Khôi phục về mốc này
              </Button>
            </Group>
          ) : null}
        </Stack>
      </div>
    </Stack>
  );
}
