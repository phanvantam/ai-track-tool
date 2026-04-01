import { ActionIcon, Badge, CopyButton, Group, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconArrowsMaximize, IconCheck, IconCopy, IconRestore } from "@tabler/icons-react";
import { useState } from "react";

import type { ChangeEntry } from "../api";

interface DiffPanelProps {
  selectedChange: ChangeEntry | null;
  diff: string;
  onRollback: () => void;
  canRollback: boolean;
  loading: boolean;
}

export function DiffPanel({ selectedChange, diff, onRollback, canRollback, loading }: DiffPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  return (
    <div className={`diff-container ${isFullscreen ? "is-fullscreen" : ""}`}>
      <div className="diff-header">
        <Stack gap={4}>
          <Group gap="xs">
            <Text size="xs" fw={700} tt="uppercase" c="dimmed">
              Diff
            </Text>
            {selectedChange && (
              <Badge size="xs" variant="light" color={badgeColor(selectedChange.type)} radius="sm">
                {selectedChange.type}
              </Badge>
            )}
            {selectedChange?.isBinary && (
              <Badge size="xs" variant="dot" color="gray" radius="sm">
                binary
              </Badge>
            )}
          </Group>
          <Text size="xs" fw={500} className="diff-filename" lineClamp={1}>
            {selectedChange?.path ?? "Chọn một file để xem thay đổi"}
          </Text>
        </Stack>
        {selectedChange && (
          <Group gap="xs">
            <Tooltip label="Khôi phục file này" position="bottom">
              <ActionIcon variant="light" color="red" size="md" onClick={onRollback} disabled={!canRollback} loading={loading}>
                <IconRestore size={16} stroke={1.8} />
              </ActionIcon>
            </Tooltip>
            <CopyButton value={diff}>
              {({ copied, copy }) => (
                <Tooltip label={copied ? "Đã copy" : "Copy diff"} position="bottom">
                  <ActionIcon variant="light" color={copied ? "green" : "gray"} size="md" onClick={copy}>
                    {copied ? <IconCheck size={16} stroke={1.8} /> : <IconCopy size={16} stroke={1.8} />}
                  </ActionIcon>
                </Tooltip>
              )}
            </CopyButton>
            <Tooltip label={isFullscreen ? "Thu nhỏ" : "Fullscreen"} position="bottom">
              <ActionIcon variant="light" color="gray" size="md" onClick={() => setIsFullscreen(!isFullscreen)}>
                <IconArrowsMaximize size={16} stroke={1.8} />
              </ActionIcon>
            </Tooltip>
          </Group>
        )}
      </div>

      <ScrollArea className="diff-scroll" style={{ flex: 1 }}>
        {!selectedChange ? (
          <div className="diff-empty">
            <Text size="sm" c="dimmed">
              Chưa có file nào được chọn
            </Text>
          </div>
        ) : (
          <div className="diff-block">
            {diff.split("\n").map((line, index) => (
              <Text
                key={`${index}-${line}`}
                component="pre"
                ff="monospace"
                size="xs"
                className={`diff-line ${getDiffLineClass(line)}`}
              >
                {line || " "}
              </Text>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

function badgeColor(type: ChangeEntry["type"]): string {
  if (type === "added") return "green";
  if (type === "deleted") return "red";
  if (type === "renamed") return "blue";
  return "yellow";
}

function getDiffLineClass(line: string): string {
  if (line.startsWith("@@")) return "is-meta";
  if (line.startsWith("+") && !line.startsWith("+++")) return "is-added";
  if (line.startsWith("-") && !line.startsWith("---")) return "is-removed";
  if (line.startsWith("Index:") || line.startsWith("===") || line.startsWith("+++") || line.startsWith("---")) {
    return "is-header";
  }
  return "";
}
