/**
 * HistoryTab component - tab History trong InspectorPanel
 * Hiển thị: snapshot history graph, snapshot list
 * Click snapshot → mở SnapshotDrawer
 * Optimized với React.memo + useMemo
 */

import React, { useMemo } from "react";
import { Badge, Button, Group, ScrollArea, Stack, Text } from "@mantine/core";
import { IconRefresh } from "@tabler/icons-react";

import type { HistoryTabProps } from "./types";
import { shortId, countChildSnapshots, countBranchNodes } from "./helpers";
import layoutStyles from "../../styles/layout.module.css";
import cardStyles from "../../styles/components/card.module.css";
import historyStyles from "../../styles/components/history.module.css";

export function HistoryTab({
  history,
  historyLoading,
  selectedSnapshotId,
  onSelectSnapshot,
  onRefreshHistory,
  onOpenDrawer,
}: HistoryTabProps) {
  const selectedSnapshot = useMemo(
    () =>
      history?.snapshots.find(
        (snapshot) => snapshot.snapshotId === selectedSnapshotId
      ) ?? history?.snapshots.find((snapshot) => snapshot.isActive) ?? null,
    [history?.snapshots, selectedSnapshotId]
  );

  return (
    <div className={layoutStyles.inspectorPanelFill}>
      <ScrollArea className={layoutStyles.inspectorScroll} type="never">
        <Stack gap="md" p="md">
          {/* Header */}
          <Group justify="space-between">
            <Stack gap={2}>
              <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                Snapshot history
              </Text>
              <Text size="sm" c="dimmed">
                Bấm một mốc để mở drawer chi tiết, tag, note và phần so sánh.
              </Text>
            </Stack>
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconRefresh size={14} stroke={1.8} />}
              onClick={onRefreshHistory}
              loading={historyLoading}
            >
              Tải lại
            </Button>
          </Group>

          {/* History Graph Card */}
          <div className={`${cardStyles.inspectorCard} ${cardStyles.inspectorGraphCard}`}>
            <Group justify="space-between" align="flex-start" mb={10}>
              <Stack gap={2}>
                <Text size="xs" fw={700} tt="uppercase" c="dimmed">
                  Sơ đồ mốc
                </Text>
                <Text size="sm" c="dimmed">
                  Bấm một node để mở chi tiết mốc.
                </Text>
              </Stack>
              <Group gap="xs" wrap="wrap">
                <Badge size="xs" variant="light">
                  {history?.snapshots.length ?? 0} mốc
                </Badge>
                {countBranchNodes(history?.snapshots ?? []) > 0 ? (
                  <Badge size="xs" color="cyan" variant="light">
                    {countBranchNodes(history?.snapshots ?? [])} điểm tách
                    nhánh
                  </Badge>
                ) : null}
              </Group>
            </Group>

            {history && history.snapshots.length > 0 ? (
              <div className={historyStyles.historyGraphList}>
                {history.snapshots.slice(0, 12).map((snapshot, index, snapshots) => {
                  const childCount = countChildSnapshots(
                    history.snapshots,
                    snapshot.snapshotId
                  );

                  return (
                    <button
                      key={snapshot.snapshotId}
                      type="button"
                      className={`${historyStyles.graphNode} ${snapshot.snapshotId === selectedSnapshot?.snapshotId ? historyStyles.graphNodeSelected : ""} ${snapshot.isActive ? historyStyles.graphNodeActive : ""}`}
                      onClick={() => {
                        onSelectSnapshot(snapshot.snapshotId);
                        onOpenDrawer();
                      }}
                    >
                      <div
                        className={historyStyles.graphNodeRail}
                        aria-hidden="true"
                      >
                        <span
                          className={`${historyStyles.graphNodeLine} ${
                            index === 0 ? historyStyles.graphNodeLineHidden : ""
                          }`}
                        />
                        <span className={historyStyles.graphNodeDot} />
                        <span
                          className={`${historyStyles.graphNodeLine} ${
                            index === snapshots.length - 1 ? historyStyles.graphNodeLineHidden : ""
                          }`}
                        />
                      </div>
                      <div className={historyStyles.graphNodeContent}>
                        <Group
                          justify="space-between"
                          align="flex-start"
                          wrap="nowrap"
                        >
                          <Stack gap={4} style={{ flex: 1, minWidth: 0 }}>
                            <Group gap="xs" wrap="wrap">
                              <Text fw={700} size="sm" className={historyStyles.historyId}>
                                {shortId(snapshot.snapshotId)}
                              </Text>
                              {snapshot.isActive ? (
                                <Badge size="xs" color="violet">
                                  hiện tại
                                </Badge>
                              ) : null}
                              {snapshot.snapshotId ===
                                selectedSnapshot?.snapshotId &&
                              !snapshot.isActive ? (
                                <Badge size="xs" color="blue" variant="light">
                                  đang xem
                                </Badge>
                              ) : null}
                              {snapshot.tags.slice(0, 2).map((tag) => (
                                <Badge
                                  key={tag}
                                  size="xs"
                                  variant="light"
                                  color="blue"
                                >
                                  {tag}
                                </Badge>
                              ))}
                            </Group>
                            <Text size="xs" c="dimmed">
                              {new Date(snapshot.createdAt).toLocaleString(
                                "vi-VN"
                              )}
                            </Text>
                          </Stack>
                        </Group>

                        <Group gap={6} wrap="wrap" mt={6}>
                          {snapshot.parentSnapshotId ? (
                            <Badge size="xs" variant="dot">
                              cha {shortId(snapshot.parentSnapshotId)}
                            </Badge>
                          ) : (
                            <Badge size="xs" variant="light" color="gray">
                              mốc gốc
                            </Badge>
                          )}
                          <Badge size="xs" variant="light">
                            {snapshot.fileCount} file
                          </Badge>
                          {childCount > 1 ? (
                            <Badge size="xs" variant="light" color="cyan">
                              {childCount} nhánh con
                            </Badge>
                          ) : childCount === 1 ? (
                            <Badge size="xs" variant="light">
                              1 mốc con
                            </Badge>
                          ) : (
                            <Badge size="xs" variant="light" color="gray">
                              mốc lá
                            </Badge>
                          )}
                        </Group>

                        <Text
                          size="sm"
                          c={snapshot.note ? undefined : "dimmed"}
                          lineClamp={1}
                          mt={6}
                        >
                          {snapshot.note?.content ||
                            snapshot.summary ||
                            "Không có mô tả cho mốc này."}
                        </Text>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <Text size="sm" c="dimmed">
                Chưa có history.
              </Text>
            )}

            {history && history.snapshots.length > 12 ? (
              <Text size="xs" c="dimmed" mt={10}>
                Đang hiển thị 12 mốc mới nhất.
              </Text>
            ) : null}
          </div>
        </Stack>
      </ScrollArea>
    </div>
  );
}
