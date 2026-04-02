import { Card, Flex, Modal, Tag, Typography } from "antd";
import { IconFileCode, IconFileMinus, IconFilePlus } from "@tabler/icons-react";
import { useState } from "react";
import type { SessionHistoryView, SnapshotDiffEntry } from "../../api";
import { getDiffLineClass, shortId } from "./helpers";

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
      <div style={{ marginTop: 15 }}>
        <Typography.Text strong style={{ fontSize: 14, display: 'block', marginBottom: 12 }}>
          So sánh với mốc hiện tại
        </Typography.Text>
        {selectedSnapshot.isActive ? (
          <Typography.Text type="secondary">Đây là mốc hiện tại.</Typography.Text>
        ) : snapshotDiffs.length === 0 ? (
          <Typography.Text type="secondary">Không có khác biệt với mốc hiện tại.</Typography.Text>
        ) : (
          <>
            <Flex gap="small" wrap="wrap" style={{ marginBottom: 12 }}>
              <Tag>{snapshotDiffs.length} thay đổi</Tag>
              <Tag color="green">+{snapshotDiffs.filter((entry) => entry.type === "added").length}</Tag>
              <Tag color="gold">~{snapshotDiffs.filter((entry) => entry.type === "modified").length}</Tag>
              <Tag color="red">-{snapshotDiffs.filter((entry) => entry.type === "deleted").length}</Tag>
            </Flex>

            <div className="flat-change-list">
              {snapshotDiffs.map((entry) => (
                <div
                  key={entry.path}
                  className="change-item"
                  onClick={() => {
                    onSelectSnapshotDiffPath(entry.path);
                    setCompareDiffOpened(true);
                  }}
                >
                  <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
                    {entry.type === "added"
                      ? <IconFilePlus size={16} style={{ color: "var(--color-success)", flexShrink: 0 }} />
                      : entry.type === "deleted"
                        ? <IconFileMinus size={16} style={{ color: "var(--color-danger)", flexShrink: 0 }} />
                        : <IconFileCode size={16} style={{ color: "var(--color-warning)", flexShrink: 0 }} />
                    }
                    <Typography.Text
                      className="change-path"
                      ellipsis
                      delete={entry.type === "deleted"}
                    >
                      {entry.path}
                    </Typography.Text>
                  </Flex>

                  <Flex align="center" gap={4} className="change-meta">
                    {(entry.insertions ?? 0) > 0 && (
                      <span style={{ color: 'var(--color-success)', fontSize: 11, fontWeight: 600 }}>
                        +{entry.insertions}
                      </span>
                    )}
                    {(entry.deletions ?? 0) > 0 && (
                      <span style={{ color: 'var(--color-danger)', fontSize: 11, fontWeight: 600 }}>
                        -{entry.deletions}
                      </span>
                    )}
                  </Flex>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

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
                      {entry.type === "added" ? "Thêm" : entry.type === "deleted" ? "Xóa" : "Sửa"}
                    </Tag>
                    <Tag>{entry.changeCount ?? 0} dòng đổi</Tag>
                    <Tag color="green">+{entry.insertions ?? 0}</Tag>
                    <Tag color="red">-{entry.deletions ?? 0}</Tag>
                  </Flex>
                ))}
            </Flex>

            <div className="diff-container">
              {snapshotDiffText.split("\n").map((line, index) => (
                <pre
                  key={index}
                  className={`diff-line ${getDiffLineClass(line)}`}
                >
                  {line || " "}
                </pre>
              ))}
            </div>
          </Flex>
        ) : (
          <Typography.Text type="secondary">Chưa có file nào được chọn để xem diff.</Typography.Text>
        )}
      </Modal>
    </>
  );
}
