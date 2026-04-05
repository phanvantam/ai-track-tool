import { Drawer, Tabs } from "antd";
import { useState } from "react";
import { shortId } from "./helpers";
import type { SnapshotDrawerProps } from "./types";
import { SnapshotDrawerCompareTab } from "./SnapshotDrawerCompareTab";
import { SnapshotDrawerMetadataTab } from "./SnapshotDrawerMetadataTab";
import { SnapshotDrawerOverviewTab } from "./SnapshotDrawerOverviewTab";

/**
 * Drawer chi tiết snapshot bằng AntD.
 */
export function SnapshotDrawer({
  opened,
  onClose,
  selectedSnapshot,
  snapshotDiffs,
  selectedSnapshotDiffPath,
  snapshotDiffText,
  loading,
  onSelectSnapshotDiffPath,
  onRestoreSnapshot,
  onCreateTag,
  onDeleteTag,
  onSaveNote,
  onDeleteNote,
  onOpenConfirm,
}: SnapshotDrawerProps) {
  const [activeKey, setActiveKey] = useState("overview");

  return (
    <Drawer
      open={opened && Boolean(selectedSnapshot)}
      onClose={onClose}
      title={selectedSnapshot ? `Mốc ${shortId(selectedSnapshot.snapshotId)}` : "Chi tiết mốc"}
      placement="right"
      width={760}
      destroyOnHidden
    >
      {selectedSnapshot ? (
        <Tabs
          activeKey={activeKey}
          onChange={setActiveKey}
          items={[
            {
              key: "overview",
              label: "Tổng quan",
              children: (
                <SnapshotDrawerOverviewTab
                  selectedSnapshot={selectedSnapshot}
                  onRestoreSnapshot={onRestoreSnapshot}
                  onOpenConfirm={onOpenConfirm}
                  onClose={onClose}
                />
              ),
            },
            {
              key: "metadata",
              label: "Tag & note",
              children: (
                <SnapshotDrawerMetadataTab
                  selectedSnapshot={selectedSnapshot}
                  onCreateTag={onCreateTag}
                  onDeleteTag={onDeleteTag}
                  onSaveNote={onSaveNote}
                  onDeleteNote={onDeleteNote}
                  onOpenConfirm={onOpenConfirm}
                />
              ),
            },
            {
              key: "compare",
              label: "So sánh",
              children: (
                <SnapshotDrawerCompareTab
                  selectedSnapshot={selectedSnapshot}
                  snapshotDiffs={snapshotDiffs}
                  selectedSnapshotDiffPath={selectedSnapshotDiffPath}
                  snapshotDiffText={snapshotDiffText}
                  onSelectSnapshotDiffPath={onSelectSnapshotDiffPath}
                />
              ),
            },
          ]}
        />
      ) : null}
    </Drawer>
  );
}
