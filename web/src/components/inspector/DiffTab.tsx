import { useMemo, useCallback } from "react";
import { Button, ScrollArea, Stack } from "@mantine/core";
import { IconRestore } from "@tabler/icons-react";
import React from "react";

import { DiffPanel } from "../DiffPanel";
import type { DiffTabProps } from "./types";
import layoutStyles from "../../styles/layout.module.css";

/**
 * Simple diff parser - caches parsed result
 */
function parseDiff(diffText: string) {
  // Just return the text as-is, actual parsing happens in DiffPanel
  // This is a placeholder for potential expensive parsing logic
  return diffText;
}

function DiffTabComponent({
  selectedChange,
  diff,
  onRollback,
  canRollback,
  loading,
}: DiffTabProps) {
  // useMemo: avoid re-parsing diff text on every render
  const parsedDiff = useMemo(() => {
    return parseDiff(diff);
  }, [diff]);

  // useCallback: memoize rollback handler
  const handleRollback = useCallback(() => {
    onRollback();
  }, [onRollback]);

  return (
    <div className={layoutStyles.inspectorPanelFill}>
      <ScrollArea className={layoutStyles.inspectorScroll} type="never">
        <Stack gap="md" p="md">
          <DiffPanel
            selectedChange={selectedChange}
            diff={parsedDiff}
            onRollback={handleRollback}
            canRollback={canRollback}
            loading={loading}
          />
        </Stack>
      </ScrollArea>
    </div>
  );
}

export const DiffTab = React.memo(DiffTabComponent);
