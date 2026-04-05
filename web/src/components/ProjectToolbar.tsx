import { Button, Flex, Select, Tooltip } from "antd";
import {
  IconFolderPlus,
  IconHelp,
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
  onGuide: () => void;
  onRefresh: () => void;
  onPause: () => void;
  onResume: () => void;
  onRemove: () => void;
}

/**
 * Thanh công cụ project bằng AntD.
 * Tất cả hành động nguy hiểm (pause, resume, xóa) chỉ gọi callback —
 * confirm dialog được quản lý bên ngoài (App level).
 */
export function ProjectToolbar({
  sessions,
  activeSessionId,
  loading,
  onSessionChange,
  onAddProject,
  onSettings,
  onGuide,
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

  return (
    <Flex gap="middle" align="center" wrap="wrap" style={{ overflow: 'visible' }}>
      <Select
        placeholder="Chọn project"
        options={projectOptions}
        value={activeSessionId ?? undefined}
        onChange={(value) => onSessionChange(value ?? null)}
        showSearch
        optionFilterProp="label"
        style={{ minWidth: 180 }}
      />

      <Flex gap="small" align="center" style={{ overflow: 'visible' }}>
        <Tooltip title="Thêm project mới">
          <Button 
            type="primary" 
            icon={<IconFolderPlus size={16} />} 
            onClick={onAddProject}
            className="hover-lift"
          >
            Thêm
          </Button>
        </Tooltip>
        
        <Tooltip title="Cấu hình hệ thống">
          <Button 
            icon={<IconSettings size={16} />} 
            onClick={onSettings}
            className="hover-lift"
          />
        </Tooltip>

        <Tooltip title="Hướng dẫn sử dụng">
          <Button 
            icon={<IconHelp size={16} />} 
            onClick={onGuide}
            className="hover-lift"
          />
        </Tooltip>

        <Tooltip title="Làm mới trạng thái">
          <Button 
            icon={<IconRefresh size={16} />} 
            onClick={onRefresh} 
            loading={loading} 
            disabled={!activeSession}
            style={{ color: activeSession ? 'var(--color-info)' : undefined }}
            className="hover-lift"
          />
        </Tooltip>

        {activeSession && (
          <>
            <Tooltip title={isWatching ? "Dừng theo dõi" : "Tiếp tục theo dõi"}>
              <Button
                icon={isWatching ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                onClick={isWatching ? onPause : onResume}
                style={{ 
                  color: isWatching ? 'var(--color-warning)' : 'var(--color-success)',
                  borderColor: isWatching ? 'var(--color-warning)' : 'var(--color-success)'
                }}
                className="hover-lift"
              >
                {isWatching ? "Dừng" : "Chạy"}
              </Button>
            </Tooltip>

            <Tooltip title="Xóa project và dữ liệu">
              <Button
                danger
                type="dashed"
                icon={<IconTrash size={16} />}
                onClick={onRemove}
                className="hover-lift"
              >
                Xóa
              </Button>
            </Tooltip>
          </>
        )}
      </Flex>
    </Flex>
  );
}
