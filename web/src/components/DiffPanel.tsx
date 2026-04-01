import { Badge, CopyButton, Group, Paper, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";

import type { ChangeEntry } from "../api";

interface DiffPanelProps {
  selectedChange: ChangeEntry | null;
  diff: string;
}

export function DiffPanel({ selectedChange, diff }: DiffPanelProps) {
  return (
    <Paper className="panel-card" withBorder radius="xl" p="md">
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Text fw={700}>Diff</Text>
          <Text size="sm" c="dimmed">
            {selectedChange ? selectedChange.path : "Chọn một file để xem thay đổi."}
          </Text>
        </Stack>
        <Group gap="xs">
          {selectedChange ? <Badge radius="xl">{selectedChange.type}</Badge> : null}
          {selectedChange?.isBinary ? (
            <Badge variant="light" color="gray" radius="xl">
              binary
            </Badge>
          ) : null}
          <CopyButton value={diff}>
            {({ copied, copy }) => (
              <UnstyledButton className="copy-button" onClick={copy}>
                <Text size="sm" fw={600} c={copied ? "teal.3" : "gray.2"}>
                  {copied ? "Đã copy" : "Copy diff"}
                </Text>
              </UnstyledButton>
            )}
          </CopyButton>
        </Group>
      </Group>
      <ScrollArea h="calc(100vh - 330px)">
        {!selectedChange ? (
          <Paper className="empty-panel" radius="xl" p="lg">
            <Text fw={600}>Chưa chọn file</Text>
            <Text size="sm" c="dimmed">
              Chọn một mục ở panel bên trái để xem diff chi tiết.
            </Text>
          </Paper>
        ) : (
          <Stack gap={0} className="diff-block">
            {diff.split("\n").map((line, index) => (
              <Text key={`${index}-${line}`} component="pre" ff="monospace" size="sm" className={`diff-line ${getDiffLineClass(line)}`}>
                {line || " "}
              </Text>
            ))}
          </Stack>
        )}
      </ScrollArea>
    </Paper>
  );
}

function getDiffLineClass(line: string): string {
  if (line.startsWith("@@")) {
    return "is-meta";
  }

  if (line.startsWith("+") && !line.startsWith("+++")) {
    return "is-added";
  }

  if (line.startsWith("-") && !line.startsWith("---")) {
    return "is-removed";
  }

  if (line.startsWith("Index:") || line.startsWith("===") || line.startsWith("+++") || line.startsWith("---")) {
    return "is-header";
  }

  return "";
}
