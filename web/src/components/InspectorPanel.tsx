import { Empty } from "antd";
import { DiffTab } from "./inspector";
import type { ChangeEntry } from "../api";

interface InspectorPanelProps {
  selectedPath: string | null;
  selectedChange: ChangeEntry | null;
  diff: string;
  onRollback: () => void;
  canRollback: boolean;
  loading: boolean;
}

/**
 * Panel hiển thị diff trực tiếp — không cần tabs.
 * History/Health/Reflog đã chuyển sang sidebar.
 */
export function InspectorPanel({
  selectedPath,
  selectedChange,
  diff,
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
        onRollback={onRollback}
        canRollback={canRollback}
        loading={loading}
      />
    </div>
  );
}
