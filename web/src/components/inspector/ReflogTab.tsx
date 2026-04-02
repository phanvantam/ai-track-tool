/**
 * ReflogTab component - tab Reflog trong InspectorPanel
 * Hiển thị reflog entries - lịch sử tất cả thay đổi snapshots
 * Sử dụng virtual scrolling cho performance tối ưu
 */

import { Badge, Group, Stack, Text } from "@mantine/core";

import type { ReflogTabProps } from "./types";
import { VirtualReflogList } from "./VirtualReflogList";
import layoutStyles from "../../styles/layout.module.css";
import cardStyles from "../../styles/components/card.module.css";

export function ReflogTab({ history }: ReflogTabProps) {
  return (
    <div className={layoutStyles.inspectorPanelFill}>
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

        {/* Reflog Entries - Virtual Scrolling */}
        {(history?.reflog ?? []).length > 0 ? (
          <VirtualReflogList entries={history?.reflog ?? []} height={400} />
        ) : (
          <Text size="sm" c="dimmed">
            Reflog trống.
          </Text>
        )}
      </Stack>
    </div>
  );
}
