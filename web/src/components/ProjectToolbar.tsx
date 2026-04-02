import { ActionIcon, Group, Menu, Select } from "@mantine/core";
import { IconDotsVertical, IconFolderPlus, IconPlayerPause, IconPlayerPlay, IconRefresh, IconSettings, IconTrash } from "@tabler/icons-react";

import type { SessionState } from "../api";
import inputStyles from "../styles/components/input.module.css";

interface ProjectToolbarProps {
  sessions: SessionState[];
  activeSessionId: string | null;
  loading: boolean;
  onSessionChange: (sessionId: string | null) => void;
  onAddProject: () => void;
  onSettings: () => void;
  onRefresh: () => void;
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
}

export function ProjectToolbar({
  sessions,
  activeSessionId,
  loading,
  onSessionChange,
  onAddProject,
  onSettings,
  onRefresh,
  onPause,
  onResume,
  onRemove,
}: ProjectToolbarProps) {
  const projectOptions = sessions.map((session) => ({
    value: session.id,
    label: session.targetPath.split("/").at(-1) ?? session.targetPath,
  }));

  const activeSession = sessions.find((session) => session.id === activeSessionId);
  const isWatching = activeSession?.watchStatus === "watching" || activeSession?.watchStatus === "refreshing";

  return (
    <Group gap="xs" wrap="nowrap" className={inputStyles.projectSwitcher}>
      <Select
        placeholder="Chọn project"
        data={projectOptions}
        value={activeSessionId}
        onChange={onSessionChange}
        className={inputStyles.projectSelect}
        checkIconPosition="right"
        allowDeselect={false}
        searchable
        nothingFoundMessage="Không có project"
      />
      <ActionIcon variant="light" size="lg" radius="md" onClick={onAddProject} aria-label="Thêm project">
        <IconFolderPlus size={18} stroke={1.8} />
      </ActionIcon>
      <ActionIcon variant="light" size="lg" radius="md" onClick={onSettings} aria-label="Cấu hình lưu trữ">
        <IconSettings size={18} stroke={1.8} />
      </ActionIcon>
      {activeSession ? (
        <>
          <ActionIcon variant="light" size="lg" radius="md" onClick={onRefresh} loading={loading} aria-label="Làm mới">
            <IconRefresh size={18} stroke={1.8} />
          </ActionIcon>
          <Menu shadow="md" width={200} position="bottom-end">
            <Menu.Target>
              <ActionIcon variant="light" size="lg" radius="md" aria-label="Thêm tùy chọn">
                <IconDotsVertical size={18} stroke={1.8} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Thao tác project</Menu.Label>
              {isWatching ? (
                <Menu.Item leftSection={<IconPlayerPause size={14} stroke={1.8} />} onClick={onPause}>
                  Tạm dừng theo dõi
                </Menu.Item>
              ) : (
                <Menu.Item leftSection={<IconPlayerPlay size={14} stroke={1.8} />} onClick={onResume}>
                  Tiếp tục theo dõi
                </Menu.Item>
              )}
              <Menu.Divider />
              <Menu.Item color="red" leftSection={<IconTrash size={14} stroke={1.8} />} onClick={onRemove}>
                Xóa project
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>
        </>
      ) : null}
    </Group>
  );
}
