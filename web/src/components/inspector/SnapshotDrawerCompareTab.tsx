/**
 * SnapshotDrawerCompareTab - Tab "So sánh" trong SnapshotDrawer
 * Hiển thị: diff list vs current, modal chi tiết diff
 */

import { Badge, Group, Modal, Stack, Text } from "@mantine/core";
import { useState } from "react";

import type { SnapshotDiffEntry, SessionHistoryView } from "../../api";
import { labelForDiffType, getDiffLineClass, shortId } from "./helpers";
import cardStyles from "../../styles/components/card.module.css";
import historyStyles from "../../styles/components/history.module.css";
import diffStyles from "../../styles/components/diff.module.css";

interface SnapshotDrawerCompareTabProps {
  selectedSnapshot: SessionHistoryView["snapshots"][0];
  snapshotDiffs: SnapshotDiffEntry[];
  selectedSnapshotDiffPath: string | null;
  snapshotDiffText: string;
  onSelectSnapshotDiffPath: (path: string) => void;
}

export function SnapshotDrawerCompareTab({
  selectedSnapshot,
  snapshotDiffs,
  selectedSnapshotDiffPath,
  snapshotDiffText,
  onSelectSnapshotDiffPath,
}: SnapshotDrawerCompareTabProps) {
  const [compareDiffOpened, setCompareDiffOpened] = useState(false);

  return (
    <>
      <div className={cardStyles.inspectorCard}>
        <Text
          size="xs"
          fw={700}
          tt="uppercase"
          c="dimmed"
          mb={8}
        >
          So sánh với mốc hiện tại
        </Text>
        {selectedSnapshot.isActive ? (
          <Text size="sm" c="dimmed">
            Đây là mốc hiện tại.
          </Text>
        ) : snapshotDiffs.length === 0 ? (
          <Text size="sm" c="dimmed">
            Không có khác biệt với mốc hiện tại.
          </Text>
        ) : (
          <Stack gap="md">
            <Group gap="xs">
              <Badge size="xs" variant="light">
                {snapshotDiffs.length} thay đổi
              </Badge>
              <Badge size="xs" color="green">
                +{snapshotDiffs.filter((entry) => entry.type === "added").length}
              </Badge>
              <Badge size="xs" color="yellow">
                ~{snapshotDiffs.filter((entry) => entry.type === "modified").length}
              </Badge>
              <Badge size="xs" color="red">
                -{snapshotDiffs.filter((entry) => entry.type === "deleted").length}
              </Badge>
            </Group>

            <Stack gap={6}>
              {snapshotDiffs.map((entry) => (
                <button
                  key={`${entry.type}-${entry.path}`}
                  type="button"
                  className={`${historyStyles.historyItem} ${
                    selectedSnapshotDiffPath === entry.path
                      ? historyStyles.historyItemSelected
                      : ""
                  }`}
                  title={entry.path}
                  onClick={() => {
                    onSelectSnapshotDiffPath(entry.path);
                    setCompareDiffOpened(true);
                  }}
                >
                  <Group
                    justify="space-between"
                    align="center"
                    wrap="nowrap"
                    className={`${cardStyles.listItem} ${historyStyles.compareListItem}`}
                  >
                    <Text
                      size="sm"
                      className={historyStyles.comparePathText}
                      title={entry.path}
                    >
                      {entry.path}
                    </Text>
                    <Group
                      gap={6}
                      wrap="nowrap"
                      className={historyStyles.compareListMeta}
                    >
                      <Badge
                        size="xs"
                        variant="light"
                        color={
                          entry.type === "added"
                            ? "green"
                            : entry.type === "deleted"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {labelForDiffType(entry.type)}
                      </Badge>
                      <Badge size="xs" variant="dot">
                        {entry.changeCount ?? 0}
                      </Badge>
                      <Badge size="xs" color="green" variant="light">
                        +{entry.insertions ?? 0}
                      </Badge>
                      <Badge size="xs" color="red" variant="light">
                        -{entry.deletions ?? 0}
                      </Badge>
                    </Group>
                  </Group>
                </button>
              ))}
            </Stack>
            <Text size="sm" c="dimmed">
              Bấm vào một file để mở modal xem diff chi tiết.
            </Text>
          </Stack>
        )}
      </div>

      {/* Diff Modal */}
      <Modal
        opened={compareDiffOpened && !!selectedSnapshotDiffPath}
        onClose={() => setCompareDiffOpened(false)}
        title={
          selectedSnapshotDiffPath
            ? `Diff ${selectedSnapshotDiffPath}`
            : "Diff giữa hai mốc"
        }
        centered
        radius="md"
        size="xl"
        classNames={{
          content: "project-modal",
          header: "project-modal-header",
          title: "project-modal-title",
        }}
      >
        <Stack gap="md">
          {selectedSnapshot && selectedSnapshotDiffPath ? (
            <>
              <Group gap="xs" wrap="wrap">
                <Badge size="xs" variant="light">{`${shortId(
                  selectedSnapshot.snapshotId
                )} -> mốc hiện tại`}</Badge>
                {snapshotDiffs
                  .filter((entry) => entry.path === selectedSnapshotDiffPath)
                  .map((entry) => (
                    <Group key={entry.path} gap="xs" wrap="wrap">
                      <Badge
                        size="xs"
                        color={
                          entry.type === "added"
                            ? "green"
                            : entry.type === "deleted"
                              ? "red"
                              : "yellow"
                        }
                      >
                        {labelForDiffType(entry.type)}
                      </Badge>
                      <Badge size="xs" variant="dot">
                        {entry.changeCount ?? 0} dòng đổi
                      </Badge>
                      <Badge size="xs" color="green" variant="light">
                        +{entry.insertions ?? 0}
                      </Badge>
                      <Badge size="xs" color="red" variant="light">
                        -{entry.deletions ?? 0}
                      </Badge>
                    </Group>
                  ))}
              </Group>
              <div className={`${cardStyles.inspectorCard} ${cardStyles.inspectorGraphCard}`}>
                <div className={diffStyles.diffBlock}>
                  {snapshotDiffText.split("\n").map((line, index) => (
                    <Text
                      key={`${index}-${line}`}
                      component="pre"
                      ff="monospace"
                      size="xs"
                      className={`${diffStyles.diffLine} ${getDiffLineClass(line)}`}
                    >
                      {line || " "}
                    </Text>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <Text size="sm" c="dimmed">
              Chưa có file nào được chọn để xem diff.
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}
