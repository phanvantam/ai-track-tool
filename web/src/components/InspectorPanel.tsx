import { Empty } from "antd";
import { DiffTab } from "./inspector";
import type { ChangeEntry } from "../api";

interface InspectorPanelProps {
  selectedPath: string | null;
  selectedChange: ChangeEntry | null;
  diff: string;
  fullContext: boolean;
  onToggleFullContext: () => void;
  onRollback: () => void;
  canRollback: boolean;
  loading: boolean;
}

/**
 * Panel hiển thị diff trực tiếp — không cần tabs.
 * Hỗ trợ chuyển đổi giữa xem diff rút gọn và toàn bộ file.
 */
export function InspectorPanel({
  selectedPath,
  selectedChange,
  diff,
  fullContext,
  onToggleFullContext,
  onRollback,
  canRollback,
  loading,
}: InspectorPanelProps) {
  // Chưa chọn file → empty state
  if (!selectedPath) {
    return (
      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Empty description="Chọn file để xem chi tiết" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto' }}>
      <DiffTab
        selectedChange={selectedChange}
        diff={diff}
        fullContext={fullContext}
        onToggleFullContext={onToggleFullContext}
        onRollback={onRollback}
        canRollback={canRollback}
        loading={loading}
      />
    </div>
  );
}
