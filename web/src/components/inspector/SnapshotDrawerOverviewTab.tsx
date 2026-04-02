import { Button, Card, Descriptions, Flex, Tag, Typography } from "antd";
import { IconRestore } from "@tabler/icons-react";
import type { SessionHistoryView } from "../../api";
import type { ConfirmDialogState } from "./types";

interface SnapshotDrawerOverviewTabProps {
  selectedSnapshot: SessionHistoryView["snapshots"][0];
  onRestoreSnapshot: (id: string) => void;
  onOpenConfirm: (state: ConfirmDialogState) => void;
  onClose: () => void;
}

/**
 * Tab tổng quan snapshot.
 */
export function SnapshotDrawerOverviewTab({
  selectedSnapshot,
  onRestoreSnapshot,
  onOpenConfirm,
  onClose,
}: SnapshotDrawerOverviewTabProps) {
  return (
    <Card>
      <Flex vertical gap="middle">
        <Flex justify="space-between" align="start">
          <Flex vertical gap={4}>
            <Typography.Text type="secondary">Mốc đã chọn</Typography.Text>
            <Typography.Text strong>{selectedSnapshot.snapshotId}</Typography.Text>
          </Flex>
          <Flex gap="small" wrap="wrap">
            {selectedSnapshot.isActive ? <Tag color="purple">hiện tại</Tag> : null}
            <Tag>{selectedSnapshot.fileCount} file</Tag>
          </Flex>
        </Flex>

        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Thời gian">
            {new Date(selectedSnapshot.createdAt).toLocaleString("vi-VN")}
          </Descriptions.Item>
          <Descriptions.Item label="Mốc cha">{selectedSnapshot.parentSnapshotId ?? "-"}</Descriptions.Item>
          <Descriptions.Item label="Tóm tắt">{selectedSnapshot.summary ?? "Chưa có mô tả riêng."}</Descriptions.Item>
        </Descriptions>

        {!selectedSnapshot.isActive ? (
          <Flex justify="end">
            <Button
              type="primary"
              icon={<IconRestore size={14} />}
              onClick={() =>
                onOpenConfirm({
                  title: "Xác nhận khôi phục về mốc này",
                  description: "Toàn bộ project sẽ được đưa về đúng trạng thái của mốc đã chọn.",
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
          </Flex>
        ) : null}
      </Flex>
    </Card>
  );
}
