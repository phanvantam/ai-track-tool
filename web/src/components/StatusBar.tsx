import { Badge, Code, Paper, SimpleGrid, Stack, Text } from "@mantine/core";

import type { SessionState } from "../api";

interface StatusBarProps {
  session: SessionState | null;
}

export function StatusBar({ session }: StatusBarProps) {
  if (!session) {
    return (
      <Paper className="status-card" radius="xl" p="md" withBorder>
        <Stack gap={4}>
          <Text fw={600}>Chưa có project nào</Text>
          <Text size="sm" c="dimmed">
            Thêm đường dẫn project để bắt đầu theo dõi thay đổi.
          </Text>
        </Stack>
      </Paper>
    );
  }

  const addedCount = session.changes.filter((change) => change.type === "added").length;
  const modifiedCount = session.changes.filter((change) => change.type === "modified").length;
  const deletedCount = session.changes.filter((change) => change.type === "deleted").length;

  return (
    <SimpleGrid cols={{ base: 1, sm: 2, xl: 4 }} spacing="sm" w="100%">
      <Paper className="status-card" radius="xl" p="md" withBorder>
        <Stack gap={6}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Trạng thái watcher
          </Text>
          <Badge color={getStatusColor(session.watchStatus)} variant="light" radius="xl" w="fit-content">
            {session.watchStatus}
          </Badge>
          <Text size="sm" c="dimmed">
            {session.lastError ?? "Đang đồng bộ theo thời gian thực."}
          </Text>
        </Stack>
      </Paper>
      <Paper className="status-card" radius="xl" p="md" withBorder>
        <Stack gap={6}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Snapshot active
          </Text>
          <Code>{session.snapshotId}</Code>
          <Text size="sm" c="dimmed">
            Baseline hiện tại của project đang chọn.
          </Text>
        </Stack>
      </Paper>
      <Paper className="status-card" radius="xl" p="md" withBorder>
        <Stack gap={6}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Tổng thay đổi
          </Text>
          <Text fw={700} size="xl">
            {session.changeCount}
          </Text>
          <Text size="sm" c="dimmed">
            {addedCount} added, {modifiedCount} modified, {deletedCount} deleted
          </Text>
        </Stack>
      </Paper>
      <Paper className="status-card" radius="xl" p="md" withBorder>
        <Stack gap={6}>
          <Text size="xs" tt="uppercase" fw={700} c="dimmed">
            Đường dẫn theo dõi
          </Text>
          <Text fw={600} lineClamp={1}>
            {session.targetPath}
          </Text>
          <Text size="sm" c="dimmed">
            Project đang hiển thị ở tab hiện tại.
          </Text>
        </Stack>
      </Paper>
    </SimpleGrid>
  );
}

function getStatusColor(status: SessionState["watchStatus"]): string {
  if (status === "error") {
    return "red";
  }

  if (status === "refreshing") {
    return "yellow";
  }

  if (status === "watching") {
    return "green";
  }

  return "gray";
}
