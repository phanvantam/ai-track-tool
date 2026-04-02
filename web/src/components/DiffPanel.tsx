import { Button, Card, Flex, Tag, Tooltip, Typography, notification } from "antd";
import { IconArrowsMaximize, IconCopy, IconRestore } from "@tabler/icons-react";
import { useState } from "react";
import type { ChangeEntry } from "../api";

interface DiffPanelProps {
  selectedChange: ChangeEntry | null;
  diff: string;
  onRollback: () => void;
  canRollback: boolean;
  loading: boolean;
}

/**
 * Panel diff bằng AntD Card và Button.
 */
export function DiffPanel({ selectedChange, diff, onRollback, canRollback, loading }: DiffPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(diff);
    notification.success({ message: "Đã copy diff", placement: "topRight" });
  }

  return (
    <Card 
      title={
        <Flex justify="space-between" align="center">
          <Flex align="center" gap="small">
            <span>Diff</span>
            {selectedChange ? <Tag color={badgeColor(selectedChange.type)}>{selectedChange.type}</Tag> : null}
            {selectedChange?.isBinary ? <Tag>binary</Tag> : null}
          </Flex>

          {selectedChange ? (
            <Flex gap="small">
              <Tooltip title="Khôi phục file này">
                <Button size="small" danger icon={<IconRestore size={16} />} onClick={onRollback} disabled={!canRollback} loading={loading} />
              </Tooltip>
              <Tooltip title="Copy diff">
                <Button size="small" icon={<IconCopy size={16} />} onClick={() => void handleCopy()} />
              </Tooltip>
              <Tooltip title={isFullscreen ? "Thu nhỏ" : "Fullscreen"}>
                <Button size="small" icon={<IconArrowsMaximize size={16} />} onClick={() => setIsFullscreen((prev) => !prev)} />
              </Tooltip>
            </Flex>
          ) : null}
        </Flex>
      }
      style={{ height: '100%' }}
      bodyStyle={{ padding: 0, height: 'calc(100% - 57px)', overflow: 'hidden' }}
    >
      {!selectedChange ? (
        <Flex align="center" justify="center" style={{ height: '100%' }}>
          <Typography.Text type="secondary">Chọn một file để xem thay đổi</Typography.Text>
        </Flex>
      ) : (
        <div className="diff-container">
          {diff.split("\n").map((line, index) => (
            <pre 
              key={index}
              className={`diff-line ${getDiffLineClass(line)}`}
            >
              {line || " "}
            </pre>
          ))}
        </div>
      )}
    </Card>
  );
}

function badgeColor(type: ChangeEntry["type"]) {
  if (type === "added") return "green";
  if (type === "deleted") return "red";
  if (type === "renamed") return "blue";
  return "gold";
}

function getDiffLineClass(line: string): string {
  if (line.startsWith("@@")) return "diff-meta";
  if (line.startsWith("+") && !line.startsWith("+++")) return "diff-added";
  if (line.startsWith("-") && !line.startsWith("---")) return "diff-removed";
  if (line.startsWith("Index:") || line.startsWith("===") || line.startsWith("+++") || line.startsWith("---")) {
    return "diff-header";
  }
  return "";
}
