import { useEffect, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { useMediaQuery } from "../hooks/useMediaQuery";
import { Tabs } from "@mantine/core";
import type { Layout } from "react-resizable-panels";
import styles from "./ResizablePanelLayout.module.css";

interface ResizablePanelLayoutProps {
  fileTree: React.ReactNode;
  inspector: React.ReactNode;
}

/**
 * ResizablePanelLayout component - Main layout với resizable splitter.
 * Desktop (≥1024px): Horizontal panels (FileTree left, Inspector right)
 * Tablet (640-1024px): Vertical panels (FileTree top, Inspector bottom)
 * Mobile (<640px): Tabs (Files tab / Inspector tab)
 *
 * Panel sizes được lưu vào localStorage để restore khi reload.
 */
export function ResizablePanelLayout({
  fileTree,
  inspector,
}: ResizablePanelLayoutProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
  const isMobile = useMediaQuery("(max-width: 639px)");

  const [defaultLayout, setDefaultLayout] = useState<Layout>({
    "file-tree": 25,
    inspector: 75,
  });
  const [activeTab, setActiveTab] = useState<string | null>("files");

  // Load sizes từ localStorage
  useEffect(() => {
    const saved = localStorage.getItem("panel-layout");
    if (saved) {
      try {
        const layout = JSON.parse(saved);
        setDefaultLayout(layout);
      } catch {
        // Fallback to default
      }
    }
  }, []);

  // Save sizes vào localStorage
  const handleLayoutChange = (layout: Layout) => {
    setDefaultLayout(layout);
    localStorage.setItem("panel-layout", JSON.stringify(layout));
  };

  // Desktop: Horizontal layout với resizable panels
  if (isDesktop) {
    return (
      <div className={styles.container}>
        <Group
          orientation="horizontal"
          onLayoutChange={handleLayoutChange}
          className={styles.panelGroup}
          defaultLayout={defaultLayout}
        >
          <Panel id="file-tree" defaultSize={25} minSize={15} maxSize={50}>
            <div className={styles.panelContent}>{fileTree}</div>
          </Panel>

          <Separator className={styles.resizeHandle} />

          <Panel id="inspector" defaultSize={75} minSize={50}>
            <div className={styles.panelContent}>{inspector}</div>
          </Panel>
        </Group>
      </div>
    );
  }

  // Tablet: Vertical layout
  if (isTablet) {
    return (
      <div className={styles.container}>
        <Group
          orientation="vertical"
          onLayoutChange={handleLayoutChange}
          className={styles.panelGroup}
          defaultLayout={{ "file-tree": 50, inspector: 50 }}
        >
          <Panel id="file-tree" defaultSize={50} minSize={30}>
            <div className={styles.panelContent}>{fileTree}</div>
          </Panel>

          <Separator className={styles.verticalResizeHandle} />

          <Panel id="inspector" defaultSize={50} minSize={30}>
            <div className={styles.panelContent}>{inspector}</div>
          </Panel>
        </Group>
      </div>
    );
  }

  // Mobile: Tabs layout
  if (isMobile) {
    return (
      <div className={styles.container}>
        <Tabs
          value={activeTab}
          onChange={setActiveTab}
          classNames={{
            root: styles.tabsRoot,
            list: styles.tabsList,
            tab: styles.tab,
            panel: styles.tabPanel,
          }}
        >
          <Tabs.List>
            <Tabs.Tab value="files">Files</Tabs.Tab>
            <Tabs.Tab value="inspector">Inspector</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="files">
            <div className={styles.panelContent}>{fileTree}</div>
          </Tabs.Panel>

          <Tabs.Panel value="inspector">
            <div className={styles.panelContent}>{inspector}</div>
          </Tabs.Panel>
        </Tabs>
      </div>
    );
  }

  return null;
}
