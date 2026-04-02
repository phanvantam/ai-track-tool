/**
 * ReflogTab component - tab Reflog trong InspectorPanel
 * Hiển thị reflog entries - lịch sử tất cả thay đổi snapshots
 */

import { Badge, Group, ScrollArea, Stack, Text } from "@mantine/core";

import type { ReflogTabProps } from "./types";
import layoutStyles from "../../styles/layout.module.css";
import cardStyles from "../../styles/components/card.module.css";

export function ReflogTab({ history }: ReflogTabProps) {
  return (
    <div className={layoutStyles.inspectorPanelFill}>
      <ScrollArea className={layoutStyles.inspectorScroll} type="never">
        <Stack gap="md" p="md">
          {/* Reflog Stats Card */}
          <div className={cardStyles.inspectorCard}>
            <Text size="xs" fw={700} tt="uppercase" c="dimmed" mb={8}>
              Thống kê reflog
            </Text>
            <Group gap="xs" wrap="wrap">
              <Badge>Total {history?.reflogStats.totalEntries ?? 0}</Badge>
              {Object.entries(history?.reflogStats.actionCounts ?? {}).map(
                ([action, count]) => (
                  <Badge key={action} size="xs" variant="light">
                    {action}: {count}
                  </Badge>
                )
              )}
            </Group>
          </div>

          {/* Reflog Entries */}
          <Stack gap="xs">
            {(history?.reflog ?? []).map((entry) => (
              <div key={entry.id} className={cardStyles.inspectorCard}>
                <Group justify="space-between" align="flex-start" wrap="nowrap">
                  <Stack gap={4} style={{ flex: 1 }}>
                    <Group gap="xs" wrap="wrap">
                      <Badge size="xs" variant="light">
                        {entry.action}
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {new Date(entry.timestamp).toLocaleString("vi-VN")}
                      </Text>
                    </Group>
                    <Text size="sm">
                      {entry.reason ??
                        `${entry.fromSnapshotId ?? "-"} -> ${entry.toSnapshotId ?? "-"}`}
                    </Text>
                    {entry.metadata ? (
                      <Text size="xs" c="dimmed">
                        {Object.entries(entry.metadata)
                          .map(([key, value]) => `${key}: ${value}`)
                          .join(" · ")}
                      </Text>
                    ) : null}
                  </Stack>
                </Group>
              </div>
            ))}
            {history && history.reflog.length === 0 ? (
              <Text size="sm" c="dimmed">
                Reflog trống.
              </Text>
            ) : null}
          </Stack>
        </Stack>
      </ScrollArea>
    </div>
  );
}
