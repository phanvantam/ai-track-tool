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
    <Card style={{ marginTop: 15 }}>
      <Flex vertical gap="middle">
        <Flex justify="space-between" align="start">
          <Flex vertical gap={4}>
            <Typography.Text type="secondary">Mốc đã chọn</Typography.Text>
            <Typography.Text strong>{selectedSnapshot.snapshotId}</Typography.Text>
          </Flex>
          <Flex gap="small" wrap="wrap" align="start">
            {selectedSnapshot.isActive ? (
               <Tag color="success" bordered={false} style={{ fontSize: 9, lineHeight: '16px', padding: '0 4px', margin: 0 }}>ACTIVE</Tag>
            ) : null}
            <Flex vertical align="end">
              <Tag style={{ margin: 0 }}>{selectedSnapshot.fileCount} file</Tag>
              {selectedSnapshot.diffStats && (
                <Flex gap={4} style={{ fontSize: 10, marginTop: 4 }}>
                  <span style={{ color: 'var(--color-success, #52c41a)' }}>+{selectedSnapshot.diffStats.added}</span>
                  <span style={{ color: 'var(--color-warning, #faad14)' }}>~{selectedSnapshot.diffStats.modified}</span>
                  <span style={{ color: 'var(--color-error, #ff4d4f)' }}>-{selectedSnapshot.diffStats.deleted}</span>
                </Flex>
              )}
            </Flex>
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
