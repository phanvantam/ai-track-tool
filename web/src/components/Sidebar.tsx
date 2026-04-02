import { Button, Group, ScrollArea, Stack, Text, TextInput, UnstyledButton } from "@mantine/core";
import { IconFolderPlus, IconRefresh } from "@tabler/icons-react";

import type { SessionState } from "../api";
import layoutStyles from "../styles/layout.module.css";
import badgeStyles from "../styles/components/badge.module.css";

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
      <div className={layoutStyles.sidebarHeader}>
        <Text size="xs" fw={700} tt="uppercase" c="dimmed">
          Projects
        </Text>
      </div>

      <ScrollArea className={layoutStyles.sidebarContent}>
        <Stack gap={2} p="xs">
          {sessions.map((session) => (
            <UnstyledButton
              key={session.id}
              onClick={() => onSessionSelect(session.id)}
              className={`${layoutStyles.sidebarItem} ${session.id === activeSessionId ? layoutStyles.sidebarItemActive : ""}`}
            >
              <Stack gap={4}>
                <Text size="sm" fw={600} lineClamp={1}>
                  {session.targetPath.split("/").at(-1) ?? session.targetPath}
                </Text>
                <Group gap="xs">
                  <span className={`${badgeStyles.statusDot} ${badgeStyles[`status${session.watchStatus.charAt(0).toUpperCase() + session.watchStatus.slice(1)}`] || ""}`} />
                  <Text size="xs" c="dimmed">
                    {session.changeCount} thay đổi
                  </Text>
                </Group>
              </Stack>
            </UnstyledButton>
          ))}
        </Stack>
      </ScrollArea>

      <div className={layoutStyles.sidebarFooter}>
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
              leftSection={<IconFolderPlus size={14} stroke={1.8} />}
            >
              Thêm project
            </Button>
            {activeSession && (
              <Button
                size="xs"
                variant="subtle"
                loading={loading}
                onClick={onRefresh}
                leftSection={<IconRefresh size={14} stroke={1.8} />}
              >
                Tải lại
              </Button>
            )}
          </Group>
        </Stack>
      </div>
    </Stack>
  );
}
