/**
 * DiffTab component - tab Diff trong InspectorPanel
 * Hiển thị diff file được chọn, action rollback
 */

import { Button, ScrollArea, Stack } from "@mantine/core";
import { IconRestore } from "@tabler/icons-react";

import { DiffPanel } from "../DiffPanel";
import type { DiffTabProps } from "./types";

export function DiffTab({
  selectedChange,
  diff,
  onRollback,
  canRollback,
  loading,
}: DiffTabProps) {
  return (
    <div className="inspector-panel-fill">
      <ScrollArea className="inspector-scroll" type="never">
        <Stack gap="md" p="md">
          <DiffPanel
            selectedChange={selectedChange}
            diff={diff}
            onRollback={onRollback}
            canRollback={canRollback}
            loading={loading}
          />
        </Stack>
      </ScrollArea>
    </div>
  );
}
