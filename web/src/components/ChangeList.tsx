import { Badge, Group, Paper, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";

import type { ChangeEntry } from "../api";

interface ChangeListProps {
  changes: ChangeEntry[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

export function ChangeList({ changes, selectedPath, onSelect }: ChangeListProps) {
  return (
    <Paper className="panel-card" withBorder radius="xl" p="md">
      <Group justify="space-between" mb="md">
        <Stack gap={2}>
          <Text fw={700}>Danh sách thay đổi</Text>
          <Text size="sm" c="dimmed">
            Chọn file để xem diff chi tiết.
          </Text>
        </Stack>
        <Badge variant="light" radius="xl">
          {changes.length} file
        </Badge>
      </Group>
      <ScrollArea h="calc(100vh - 330px)">
        <Stack gap="xs">
          {changes.length === 0 ? (
            <Paper className="empty-panel" radius="xl" p="lg">
              <Text fw={600}>Không có thay đổi nào</Text>
              <Text size="sm" c="dimmed">
                Project đang sạch hoặc bộ lọc hiện tại không có kết quả.
              </Text>
            </Paper>
          ) : null}
          {changes.map((change) => (
            <UnstyledButton key={change.path} onClick={() => onSelect(change.path)}>
              <Paper className={selectedPath === change.path ? "change-item is-selected" : "change-item"} withBorder radius="xl" p="sm">
                <Group justify="space-between" align="flex-start">
                  <Stack gap={4} maw="80%">
                    <Text size="sm" fw={600} lineClamp={1}>
                      {getFileName(change.path)}
                    </Text>
                    <Text size="xs" c="dimmed" lineClamp={1}>
                      {getDirectoryName(change.path)}
                    </Text>
                  </Stack>
                  <Stack gap={6} align="flex-end">
                    <Badge color={badgeColor(change.type)} radius="xl">
                      {change.type}
                    </Badge>
                    {change.isBinary ? (
                      <Badge variant="dot" color="gray" radius="xl">
                        binary
                      </Badge>
                    ) : null}
                  </Stack>
                </Group>
              </Paper>
            </UnstyledButton>
          ))}
        </Stack>
      </ScrollArea>
    </Paper>
  );
}

function getFileName(relativePath: string): string {
  return relativePath.split("/").at(-1) ?? relativePath;
}

function getDirectoryName(relativePath: string): string {
  const segments = relativePath.split("/");

  if (segments.length <= 1) {
    return "root";
  }

  return segments.slice(0, -1).join("/");
}

function badgeColor(type: ChangeEntry["type"]): string {
  if (type === "added") {
    return "green";
  }

  if (type === "deleted") {
    return "red";
  }

  return "yellow";
}
