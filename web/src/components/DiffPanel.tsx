import { ActionIcon, Badge, CopyButton, Group, ScrollArea, Stack, Text, Tooltip } from "@mantine/core";
import { IconArrowsMaximize, IconCheck, IconCopy, IconRestore } from "@tabler/icons-react";
import { useState } from "react";

import type { ChangeEntry } from "../api";
import layoutStyles from "../styles/layout.module.css";
import diffStyles from "../styles/components/diff.module.css";

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
    <div className={`${layoutStyles.diffContainer} ${isFullscreen ? layoutStyles.diffContainerFullscreen : ""}`}>
      <div className={layoutStyles.diffHeader}>
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
           <Text size="xs" fw={500} className={diffStyles.diffFilename} lineClamp={1}>
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

      <ScrollArea className={layoutStyles.diffScroll} style={{ flex: 1 }}>
        {!selectedChange ? (
          <div className={layoutStyles.diffEmpty}>
            <Text size="sm" c="dimmed">
              Chưa có file nào được chọn
            </Text>
          </div>
        ) : (
          <div className={diffStyles.diffBlock}>
            {diff.split("\n").map((line, index) => (
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
  if (line.startsWith("@@")) return diffStyles.diffLineMeta;
  if (line.startsWith("+") && !line.startsWith("+++")) return diffStyles.diffLineAdded;
  if (line.startsWith("-") && !line.startsWith("---")) return diffStyles.diffLineRemoved;
  if (line.startsWith("Index:") || line.startsWith("===") || line.startsWith("+++") || line.startsWith("---")) {
    return diffStyles.diffLineHeader;
  }
  return "";
}
