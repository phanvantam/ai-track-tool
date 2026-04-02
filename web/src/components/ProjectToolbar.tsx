import { Button, Dropdown, Flex, Select, Space } from "antd";
import {
  IconDotsVertical,
  IconFolderPlus,
  IconPlayerPause,
  IconPlayerPlay,
  IconRefresh,
  IconSettings,
  IconTrash,
} from "@tabler/icons-react";
import type { SessionState } from "../api";

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

/**
 * Thanh công cụ project bằng AntD.
 * Dùng control chuẩn thay vì custom UI cũ.
 */
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
  const isWatching =
    activeSession?.watchStatus === "watching" || activeSession?.watchStatus === "refreshing";

  const menuItems = activeSession
    ? [
        {
          key: isWatching ? "pause" : "resume",
          label: isWatching ? "Tạm dừng theo dõi" : "Tiếp tục theo dõi",
          icon: isWatching ? <IconPlayerPause size={14} /> : <IconPlayerPlay size={14} />,
          onClick: isWatching ? onPause : onResume,
        },
        { type: "divider" as const },
        {
          key: "remove",
          label: "Xóa project",
          icon: <IconTrash size={14} />,
          danger: true,
          onClick: onRemove,
        },
      ]
    : [];

  return (
    <Flex gap="small" align="center" wrap="wrap">
      <Select
        placeholder="Chọn project"
        options={projectOptions}
        value={activeSessionId ?? undefined}
        onChange={(value) => onSessionChange(value ?? null)}
        showSearch
        optionFilterProp="label"
      />

      <Space.Compact>
        <Button icon={<IconFolderPlus size={16} />} onClick={onAddProject}>
          Thêm
        </Button>
        <Button icon={<IconSettings size={16} />} onClick={onSettings} />
        <Button icon={<IconRefresh size={16} />} onClick={onRefresh} loading={loading} disabled={!activeSession} />
        {activeSession ? (
          <Dropdown menu={{ items: menuItems }} trigger={["click"]}>
            <Button icon={<IconDotsVertical size={16} />} />
          </Dropdown>
        ) : null}
      </Space.Compact>
    </Flex>
  );
}
