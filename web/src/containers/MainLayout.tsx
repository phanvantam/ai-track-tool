import { Grid } from "@mantine/core";
import type { ReactNode } from "react";
import { Layout } from "../components/Layout";
import { ResizablePanelLayout } from "../components/ResizablePanelLayout";

interface MainLayoutProps {
  sessionBar: ReactNode;
  fileTree: ReactNode;
  inspector: ReactNode;
}

/**
 * Main page layout structure.
 * Render: SessionContainer (top), ResizablePanelLayout(FileTree | Inspector) (bottom).
 * ResizablePanelLayout hỗ trợ:
 * - Desktop: Horizontal splitter (FileTree left 25%, Inspector right 75%)
 * - Tablet: Vertical splitter (FileTree top 50%, Inspector bottom 50%)
 * - Mobile: Tabs (Files / Inspector)
 */
export function MainLayout({ sessionBar, fileTree, inspector }: MainLayoutProps) {
  return (
    <Layout headerActions={sessionBar}>
      <div className="main-content">
        <ResizablePanelLayout fileTree={fileTree} inspector={inspector} />
      </div>
    </Layout>
  );
}
