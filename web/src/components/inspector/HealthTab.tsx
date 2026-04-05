import { Button, Card, Flex, List, Tag, Typography } from "antd";
import { IconDatabaseCog, IconRefresh, IconWand } from "@tabler/icons-react";
import type { HealthTabProps } from "./types";

/**
 * Tab health bằng AntD Card/List.
 */
export function HealthTab({
  lockInfo,
  fsckReport,
  gcReport,
  loading,
  onRunFsck,
  onRunGc,
  onOpenConfirm,
}: HealthTabProps) {
  return (
    <div>
      <Flex vertical gap="middle">
        <Card title="Lock hiện tại">
          {lockInfo ? (
            <Flex vertical gap="small">
              <Typography.Text>operation: {lockInfo.operation}</Typography.Text>
              <Typography.Text>pid: {lockInfo.processId}</Typography.Text>
              <Typography.Text>expires: {new Date(lockInfo.expiresAt).toLocaleString("vi-VN")}</Typography.Text>
            </Flex>
          ) : (
            <Typography.Text type="secondary">Không có lock active.</Typography.Text>
          )}
        </Card>

        <Card title="Công cụ integrity">
          <Flex gap="small" wrap="wrap">
            <Button icon={<IconDatabaseCog size={14} />} onClick={() => onRunFsck(false)} loading={loading}>
              Chạy FSCK
            </Button>
            <Button
              icon={<IconWand size={14} />}
              onClick={() =>
                onOpenConfirm({
                  title: "Xác nhận FSCK repair",
                  description: "FSCK repair có thể tự sửa hoặc xóa entry lỗi trong mốc hiện tại.",
                  warnings: [
                    "Manifest entry bị thiếu có thể bị loại bỏ.",
                    "Orphan file có thể bị xóa khỏi storage.",
                    "Chỉ nên chạy khi bạn hiểu báo cáo integrity hiện tại.",
                  ],
                  confirmLabel: "Chạy repair",
                  confirmColor: "orange",
                  onConfirm: () => onRunFsck(true),
                })
              }
              loading={loading}
            >
              FSCK repair
            </Button>
            <Button icon={<IconRefresh size={14} />} onClick={() => onRunGc(true)} loading={loading}>
              GC dry-run
            </Button>
            <Button
              type="primary"
              icon={<IconDatabaseCog size={14} />}
              onClick={() =>
                onOpenConfirm({
                  title: "Xác nhận chạy GC",
                  description: "GC sẽ dọn snapshot mồ côi và có thể nén snapshot cũ.",
                  warnings: [
                    "Snapshot mồ côi ngoài history có thể bị xóa.",
                    "Snapshot cũ có thể chuyển sang delta/reference.",
                    "Hãy chạy dry-run trước nếu chưa chắc chắn.",
                  ],
                  confirmLabel: "Chạy GC",
                  confirmColor: "green",
                  onConfirm: () => onRunGc(false),
                })
              }
              loading={loading}
            >
              Chạy GC
            </Button>
          </Flex>
        </Card>

        <Card title="Báo cáo FSCK">
          {!fsckReport ? (
            <Typography.Text type="secondary">Chưa chạy FSCK từ giao diện.</Typography.Text>
          ) : (
            <Flex vertical gap="small">
              <Flex gap="small" wrap="wrap">
                <Tag color={fsckReport.isHealthy ? "green" : "red"}>{fsckReport.isHealthy ? "healthy" : "issues"}</Tag>
                <Typography.Text type="secondary">{new Date(fsckReport.timestamp).toLocaleString("vi-VN")}</Typography.Text>
              </Flex>
              <Typography.Text>
                {fsckReport.errors.length} lỗi, {fsckReport.repairs.length} gợi ý hoặc sửa chữa.
              </Typography.Text>
              <List
                dataSource={fsckReport.errors.slice(0, 8)}
                renderItem={(error, index) => (
                  <List.Item>
                    <Flex justify="space-between">
                      <Typography.Text>{error.path ?? error.type}</Typography.Text>
                      <Tag color={error.severity === "critical" ? "red" : "gold"}>{error.type}</Tag>
                    </Flex>
                  </List.Item>
                )}
              />
            </Flex>
          )}
        </Card>

        <Card title="Báo cáo GC">
          {!gcReport ? (
            <Typography.Text type="secondary">Chưa chạy GC từ giao diện.</Typography.Text>
          ) : (
            <Flex vertical gap="small">
              <Flex gap="small" wrap="wrap">
                <Tag color={gcReport.dryRun ? "blue" : "green"}>{gcReport.dryRun ? "dry-run" : "done"}</Tag>
                <Typography.Text>{gcReport.actions.length} hành động</Typography.Text>
              </Flex>
              <List
                dataSource={gcReport.actions.slice(0, 8)}
                renderItem={(action) => (
                  <List.Item>
                    <Flex justify="space-between">
                      <Typography.Text>{action.details}</Typography.Text>
                      <Tag>{action.type}</Tag>
                    </Flex>
                  </List.Item>
                )}
              />
            </Flex>
          )}
        </Card>
      </Flex>
    </div>
  );
}
