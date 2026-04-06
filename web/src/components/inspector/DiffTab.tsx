import { DiffPanel } from "../DiffPanel";
import type { DiffTabProps } from "./types";

/**
 * Tab diff dùng AntD layout đơn giản.
 * Truyền fullContext cho DiffPanel.
 */
export function DiffTab({ selectedChange, diff, fullContext, onToggleFullContext, onRollback, canRollback, loading }: DiffTabProps) {
  return (
    <div style={{ height: 'calc(100vh - 100px)' }}>
      <DiffPanel
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
