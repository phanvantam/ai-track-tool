import { Button, Flex, Popconfirm, Select, Space, Tooltip } from "antd";
import {
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
            <Popconfirm
              title={isWatching ? "Dừng theo dõi?" : "Tiếp tục theo dõi?"}
              description={isWatching ? "Hệ thống sẽ không tự động nhận diện thay đổi file nữa." : "Hệ thống sẽ bắt đầu theo dõi thay đổi file realtime."}
              onConfirm={isWatching ? onPause : onResume}
              okText="Đồng ý"
              cancelText="Hủy"
              placement="bottomRight"
            >
              <Button
                icon={isWatching ? <IconPlayerPause size={16} /> : <IconPlayerPlay size={16} />}
                style={{ 
                  color: isWatching ? 'var(--color-warning)' : 'var(--color-success)',
                  borderColor: isWatching ? 'var(--color-warning)' : 'var(--color-success)'
                }}
                className="hover-lift"
              >
                {isWatching ? "Dừng" : "Chạy"}
              </Button>
            </Popconfirm>

            <Popconfirm
              title="Xóa project khỏi danh sách?"
              description="Hành động này chỉ xóa khỏi UI, không xóa dữ liệu .ai-track của bạn."
              onConfirm={onRemove}
              okText="Xóa"
              cancelText="Hủy"
              okButtonProps={{ danger: true }}
              placement="bottomRight"
            >
              <Button
                danger
                type="dashed"
                icon={<IconTrash size={16} />}
                className="hover-lift"
              >
                Xóa
              </Button>
            </Popconfirm>
          </>
        )}
      </Flex>
    </Flex>
  );
}
