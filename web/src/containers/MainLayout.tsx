import type { ReactNode } from "react";
import { Layout } from "../components/Layout";
import { ResizablePanelLayout } from "../components/ResizablePanelLayout";

interface MainLayoutProps {
  sessionBar: ReactNode;
  fileTree: ReactNode;
  inspector: ReactNode;
}

/**
 * Layout trang chính.
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
