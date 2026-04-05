import { DiffPanel } from "../DiffPanel";
import type { DiffTabProps } from "./types";

/**
 * Tab diff dùng AntD layout đơn giản.
 */
export function DiffTab({ selectedChange, diff, onRollback, canRollback, loading }: DiffTabProps) {
  return (
    <div style={{ height: 'calc(100vh - 100px)' }}>
      <DiffPanel
        selectedChange={selectedChange}
        diff={diff}
        onRollback={onRollback}
        canRollback={canRollback}
        loading={loading}
      />
    </div>
  );
}
