import { Button, Group, ScrollArea, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";

import type { SessionState } from "../api";

interface SidebarProps {
  sessions: SessionState[];
  activeSessionId: string | null;
  activeSession: SessionState | null;
  newPath: string;
  loading: boolean;
  onSessionSelect: (id: string) => void;
  onNewPathChange: (path: string) => void;
  onAddSession: () => void;
  onPathKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  onRefresh: () => void;
}

export function Sidebar({
  sessions,
  activeSessionId,
  activeSession,
  newPath,
  loading,
  onSessionSelect,
  onNewPathChange,
  onAddSession,
  onPathKeyDown,
  onRefresh,
}: SidebarProps) {
  return (
    <Stack h="100%" gap={0}>
      <div className="sidebar-header">
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Projects
        </Text>
      </div>

      <ScrollArea className="sidebar-list">
        <Stack gap={2} p="xs">
          {sessions.map((session) => (
            <UnstyledButton
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={`sidebar-item ${session.id === activeSessionId ? "is-active" : ""}`}
            >
              <Stack gap={4}>
                <Text size="sm" fw={600} lineClamp={1}>
                  {session.targetPath.split("/").at(-1) ?? session.targetPath}
                </Text>
                <Group gap="xs">
                  <span className={`status-dot status-${session.watchStatus}`} />
                  <Text size="xs" c="dimmed">
                    {session.changeCount} thay đổi
                  </Text>
                </Group>
              </Stack>
            </UnstyledButton>
          ))}
        </Stack>
      </ScrollArea>

      <div className="sidebar-footer">
        <Stack gap="xs" p="xs">
          <TextInput
            value={newPath}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => onNewPathChange(event.currentTarget.value)}
            onKeyDown={onPathKeyDown}
            placeholder="/duong/dan/project"
            size="xs"
          />
          <Group gap="xs">
            <Button
              size="xs"
              loading={loading}
              onClick={onAddSession}
              fullWidth
            >
              + Thêm project
            </Button>
            {activeSession && (
              <Button
                size="xs"
                variant="subtle"
                loading={loading}
                onClick={onRefresh}
              >
                ↻
              </Button>
            )}
          </Group>
        </Stack>
      </div>
    </Stack>
  );
}
