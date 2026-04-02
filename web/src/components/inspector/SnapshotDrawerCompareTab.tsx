import { Card, Flex, List, Modal, Tag, Typography } from "antd";
import { useState } from "react";
import type { SessionHistoryView, SnapshotDiffEntry } from "../../api";
import { getDiffLineClass, labelForDiffType, shortId } from "./helpers";

interface SnapshotDrawerCompareTabProps {
  selectedSnapshot: SessionHistoryView["snapshots"][0];
  snapshotDiffs: SnapshotDiffEntry[];
  selectedSnapshotDiffPath: string | null;
  snapshotDiffText: string;
  onSelectSnapshotDiffPath: (path: string) => void;
}

/**
 * Tab so sánh snapshot bằng AntD List/Modal.
 */
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
      <Card title="So sánh với mốc hiện tại">
        {selectedSnapshot.isActive ? (
          <Typography.Text type="secondary">Đây là mốc hiện tại.</Typography.Text>
        ) : snapshotDiffs.length === 0 ? (
          <Typography.Text type="secondary">Không có khác biệt với mốc hiện tại.</Typography.Text>
        ) : (
          <Flex vertical gap="middle">
            <Flex gap="small" wrap="wrap">
              <Tag>{snapshotDiffs.length} thay đổi</Tag>
              <Tag color="green">+{snapshotDiffs.filter((entry) => entry.type === "added").length}</Tag>
              <Tag color="gold">~{snapshotDiffs.filter((entry) => entry.type === "modified").length}</Tag>
              <Tag color="red">-{snapshotDiffs.filter((entry) => entry.type === "deleted").length}</Tag>
            </Flex>

            <List
              dataSource={snapshotDiffs}
              renderItem={(entry) => (
                <List.Item>
                  <Card
                    hoverable
                    size="small"
                    onClick={() => {
                      onSelectSnapshotDiffPath(entry.path);
                      setCompareDiffOpened(true);
                    }}
                  >
                    <Flex justify="space-between" align="center" wrap="wrap" gap="small">
                      <Typography.Text>{entry.path}</Typography.Text>
                      <Flex gap="small" wrap="wrap">
                        <Tag color={entry.type === "added" ? "green" : entry.type === "deleted" ? "red" : "gold"}>
                          {labelForDiffType(entry.type)}
                        </Tag>
                        <Tag>{entry.changeCount ?? 0}</Tag>
                        <Tag color="green">+{entry.insertions ?? 0}</Tag>
                        <Tag color="red">-{entry.deletions ?? 0}</Tag>
                      </Flex>
                    </Flex>
                  </Card>
                </List.Item>
              )}
            />
          </Flex>
        )}
      </Card>

      <Modal
        open={compareDiffOpened && Boolean(selectedSnapshotDiffPath)}
        onCancel={() => setCompareDiffOpened(false)}
        title={selectedSnapshotDiffPath ? `Diff ${selectedSnapshotDiffPath}` : "Diff giữa hai mốc"}
        footer={null}
        width={960}
        centered
        destroyOnHidden
      >
        {selectedSnapshot && selectedSnapshotDiffPath ? (
          <Flex vertical gap="middle">
            <Flex gap="small" wrap="wrap">
              <Tag>{`${shortId(selectedSnapshot.snapshotId)} -> mốc hiện tại`}</Tag>
              {snapshotDiffs
                .filter((entry) => entry.path === selectedSnapshotDiffPath)
                .map((entry) => (
                  <Flex key={entry.path} gap="small" wrap="wrap">
                    <Tag color={entry.type === "added" ? "green" : entry.type === "deleted" ? "red" : "gold"}>
                      {labelForDiffType(entry.type)}
                    </Tag>
                    <Tag>{entry.changeCount ?? 0} dòng đổi</Tag>
                    <Tag color="green">+{entry.insertions ?? 0}</Tag>
                    <Tag color="red">-{entry.deletions ?? 0}</Tag>
                  </Flex>
                ))}
            </Flex>

            <Card>
              <div>
                {snapshotDiffText.split("\n").map((line, index) => (
                  <pre
                    key={`${index}-${line}`}
                    className={getDiffLineClass(line)}
                  >
                    {line || " "}
                  </pre>
                ))}
              </div>
            </Card>
          </Flex>
        ) : (
          <Typography.Text type="secondary">Chưa có file nào được chọn để xem diff.</Typography.Text>
        )}
      </Modal>
    </>
  );
}
