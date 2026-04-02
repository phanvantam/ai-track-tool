/**
 * SnapshotDrawer component - drawer chứa 3 tabs
 * Orchestrator cho 3 DrawerTab: Overview, Metadata, Compare
 * Chỉ quản lý drawer state (opened/closed, tab selection)
 */

import { useState } from "react";
import { Drawer, Tabs } from "@mantine/core";

import type { SnapshotDiffEntry, SessionHistoryView } from "../../api";
import { shortId } from "./helpers";
import type { SnapshotDrawerProps } from "./types";
import { SnapshotDrawerOverviewTab } from "./SnapshotDrawerOverviewTab";
import { SnapshotDrawerMetadataTab } from "./SnapshotDrawerMetadataTab";
import { SnapshotDrawerCompareTab } from "./SnapshotDrawerCompareTab";
import modalStyles from "../../styles/components/modal.module.css";

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
  const [drawerTab, setDrawerTab] = useState<string | null>("overview");

  return (
    <Drawer
      opened={opened && !!selectedSnapshot}
      onClose={onClose}
      title={
        selectedSnapshot
          ? `Mốc ${shortId(selectedSnapshot.snapshotId)}`
          : "Chi tiết mốc"
      }
      position="right"
      size="lg"
      classNames={{ body: modalStyles.modalBody }}
    >
      {selectedSnapshot ? (
        <Tabs
          value={drawerTab}
          onChange={setDrawerTab}
          className={modalStyles.drawerTabs}
        >
          <Tabs.List>
            <Tabs.Tab value="overview">Tổng quan</Tabs.Tab>
            <Tabs.Tab value="metadata">Tag & note</Tabs.Tab>
            <Tabs.Tab value="compare">So sánh</Tabs.Tab>
          </Tabs.List>

          {/* Overview Tab */}
          <Tabs.Panel value="overview" pt="md">
            <SnapshotDrawerOverviewTab
              selectedSnapshot={selectedSnapshot}
              onRestoreSnapshot={onRestoreSnapshot}
              onOpenConfirm={onOpenConfirm}
              onClose={onClose}
            />
          </Tabs.Panel>

          {/* Metadata Tab */}
          <Tabs.Panel value="metadata" pt="md">
            <SnapshotDrawerMetadataTab
              selectedSnapshot={selectedSnapshot}
              onCreateTag={onCreateTag}
              onDeleteTag={onDeleteTag}
              onSaveNote={onSaveNote}
              onDeleteNote={onDeleteNote}
              onOpenConfirm={onOpenConfirm}
            />
          </Tabs.Panel>

          {/* Compare Tab */}
          <Tabs.Panel value="compare" pt="md">
            <SnapshotDrawerCompareTab
              selectedSnapshot={selectedSnapshot}
              snapshotDiffs={snapshotDiffs}
              selectedSnapshotDiffPath={selectedSnapshotDiffPath}
              snapshotDiffText={snapshotDiffText}
              onSelectSnapshotDiffPath={onSelectSnapshotDiffPath}
            />
          </Tabs.Panel>
        </Tabs>
      ) : null}
    </Drawer>
  );
}
