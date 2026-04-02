/**
 * HealthTab component - tab Health trong InspectorPanel
 * Hiển thị: lock info, FSCK/GC tools, FSCK/GC reports
 */

import { Button, Group, ScrollArea, Stack, Text, Badge } from "@mantine/core";
import {
  IconDatabaseCog,
  IconWand,
  IconRefresh,
  IconAlertTriangle,
} from "@tabler/icons-react";

import type { HealthTabProps } from "./types";

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
    <div className="inspector-panel-fill">
      <ScrollArea className="inspector-scroll" type="never">
        <Stack gap="md" p="md">
          {/* Lock Info Card */}
          <div className="inspector-card">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8}>
              Lock hiện tại
            </Text>
            {lockInfo ? (
              <Stack gap={4}>
                <Text size="sm">operation: {lockInfo.operation}</Text>
                <Text size="sm">pid: {lockInfo.processId}</Text>
                <Text size="sm">
                  expires:{" "}
                  {new Date(lockInfo.expiresAt).toLocaleString("vi-VN")}
                </Text>
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                Không có lock active.
              </Text>
            )}
          </div>

          {/* FSCK/GC Tools Card */}
          <div className="inspector-card">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8}>
              Công cụ integrity
            </Text>
            <Group>
              <Button
                variant="default"
                onClick={() => onRunFsck(false)}
                loading={loading}
                leftSection={<IconDatabaseCog size={14} stroke={1.8} />}
              >
                Chạy FSCK
              </Button>
              <Button
                color="orange"
                onClick={() =>
                  onOpenConfirm({
                    title: "Xác nhận FSCK repair",
                    description:
                      "FSCK repair có thể tự sửa hoặc xóa entry lỗi trong mốc hiện tại.",
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
                leftSection={<IconWand size={14} stroke={1.8} />}
              >
                FSCK repair
              </Button>
              <Button
                variant="default"
                onClick={() => onRunGc(true)}
                loading={loading}
                leftSection={<IconRefresh size={14} stroke={1.8} />}
              >
                GC dry-run
              </Button>
              <Button
                color="green"
                onClick={() =>
                  onOpenConfirm({
                    title: "Xác nhận chạy GC",
                    description:
                      "GC sẽ dọn snapshot mồ côi và có thể nén snapshot cũ.",
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
                leftSection={<IconDatabaseCog size={14} stroke={1.8} />}
              >
                Chạy GC
              </Button>
            </Group>
          </div>

          {/* FSCK Report Card */}
          <div className="inspector-card">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8}>
              Báo cáo FSCK
            </Text>
            {!fsckReport ? (
              <Text size="sm" c="dimmed">
                Chưa chạy FSCK từ giao diện.
              </Text>
            ) : (
              <Stack gap={8}>
                <Group gap="xs">
                  <Badge color={fsckReport.isHealthy ? "green" : "red"}>
                    {fsckReport.isHealthy ? "healthy" : "issues"}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {new Date(fsckReport.timestamp).toLocaleString("vi-VN")}
                  </Text>
                </Group>
                <Text size="sm">
                  {fsckReport.errors.length} lỗi, {fsckReport.repairs.length}{" "}
                  gợi ý/sửa chữa.
                </Text>
                <Stack gap={6}>
                  {fsckReport.errors.slice(0, 8).map((error, index) => (
                    <div
                      key={`${error.type}-${error.path ?? index}`}
                      className="inspector-list-item"
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Text size="sm">{error.path ?? error.type}</Text>
                        <Badge
                          size="xs"
                          color={
                            error.severity === "critical" ? "red" : "yellow"
                          }
                        >
                          {error.type}
                        </Badge>
                      </Group>
                    </div>
                  ))}
                </Stack>
              </Stack>
            )}
          </div>

          {/* GC Report Card */}
          <div className="inspector-card">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8}>
              Báo cáo GC
            </Text>
            {!gcReport ? (
              <Text size="sm" c="dimmed">
                Chưa chạy GC từ giao diện.
              </Text>
            ) : (
              <Stack gap={8}>
                <Group gap="xs">
                  <Badge color={gcReport.dryRun ? "blue" : "green"}>
                    {gcReport.dryRun ? "dry-run" : "done"}
                  </Badge>
                  <Text size="sm">{gcReport.actions.length} hành động</Text>
                </Group>
                <Stack gap={6}>
                  {gcReport.actions.slice(0, 8).map((action, index) => (
                    <div
                      key={`${action.type}-${action.path ?? index}`}
                      className="inspector-list-item"
                    >
                      <Group justify="space-between" wrap="nowrap">
                        <Text size="sm">{action.details}</Text>
                        <Badge size="xs" variant="light">
                          {action.type}
                        </Badge>
                      </Group>
                    </div>
                  ))}
                </Stack>
              </Stack>
            )}
          </div>
        </Stack>
      </ScrollArea>
    </div>
  );
}
