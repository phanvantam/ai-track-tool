import { Splitter, Tabs } from "antd";
import { useEffect, useState } from "react";
import { useMediaQuery } from "../hooks/useMediaQuery";

interface ResizablePanelLayoutProps {
  fileTree: React.ReactNode;
  inspector: React.ReactNode;
}

const DESKTOP_KEY = "layout.desktop.split";
const TABLET_KEY = "layout.tablet.split";

/**
 * Layout chính bằng AntD Splitter/Tabs.
 * Desktop ngang, tablet dọc, mobile chuyển tab.
 * Panel con có border-radius và spacing tinh tế.
 */
export function ResizablePanelLayout({ fileTree, inspector }: ResizablePanelLayoutProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 640px) and (max-width: 1023px)");
  const isMobile = useMediaQuery("(max-width: 639px)");

  const [desktopSizes, setDesktopSizes] = useState<[number, number]>([25, 75]);
  const [tabletSizes, setTabletSizes] = useState<[number, number]>([45, 55]);
  const [mobileTab, setMobileTab] = useState("files");

  useEffect(() => {
    const savedDesktop = localStorage.getItem(DESKTOP_KEY);
    const savedTablet = localStorage.getItem(TABLET_KEY);

    if (savedDesktop) {
      try {
        const parsed = JSON.parse(savedDesktop) as [number, number];
        if (Array.isArray(parsed) && parsed.length === 2) {
          setDesktopSizes(parsed);
        }
      } catch {
        // Bỏ qua dữ liệu hỏng.
      }
    }

    if (savedTablet) {
      try {
        const parsed = JSON.parse(savedTablet) as [number, number];
        if (Array.isArray(parsed) && parsed.length === 2) {
          setTabletSizes(parsed);
        }
      } catch {
        // Bỏ qua dữ liệu hỏng.
      }
    }
  }, []);

  // Mobile → Tabs layout
  if (isMobile) {
    return (
      <div style={{ height: "100%", padding: 4 }}>
        <Tabs
          activeKey={mobileTab}
          onChange={setMobileTab}
          style={{ height: "100%" }}
          items={[
            {
              key: "files",
              label: "Files",
              children: (
                <div className="panel-section" style={{ height: "calc(100vh - 120px)" }}>
                  {fileTree}
                </div>
              ),
            },
            {
              key: "inspector",
              label: "Inspector",
              children: (
                <div className="panel-section" style={{ height: "calc(100vh - 120px)" }}>
                  {inspector}
                </div>
              ),
            },
          ]}
        />
      </div>
    );
  }

  // Tablet → Vertical splitter
  if (isTablet) {
    return (
      <div style={{ height: "100%", padding: 4 }}>
        <Splitter
          orientation="vertical"
          style={{ height: "100%" }}
          onResizeEnd={(sizes) => {
            const next = [sizes[0] ?? 45, sizes[1] ?? 55] as [number, number];
            setTabletSizes(next);
            localStorage.setItem(TABLET_KEY, JSON.stringify(next));
          }}
        >
          <Splitter.Panel min="30%" max="70%" size={`${tabletSizes[0]}%`} defaultSize="45%">
            <div className="panel-section">{fileTree}</div>
          </Splitter.Panel>
          <Splitter.Panel min="30%" size={`${tabletSizes[1]}%`} defaultSize="55%">
            <div className="panel-section">{inspector}</div>
          </Splitter.Panel>
        </Splitter>
      </div>
    );
  }

  // Desktop → Horizontal splitter
  if (isDesktop || (!isTablet && !isMobile)) {
    return (
      <div style={{ height: "100%", padding: 4 }}>
        <Splitter
          style={{ height: "100%" }}
          onResizeEnd={(sizes) => {
            const next = [sizes[0] ?? 25, sizes[1] ?? 75] as [number, number];
            setDesktopSizes(next);
            localStorage.setItem(DESKTOP_KEY, JSON.stringify(next));
          }}
        >
          <Splitter.Panel min="15%" max="50%" size={`${desktopSizes[0]}%`} defaultSize="25%">
            <div className="panel-section">{fileTree}</div>
          </Splitter.Panel>
          <Splitter.Panel min="50%" size={`${desktopSizes[1]}%`} defaultSize="75%">
            <div className="panel-section">{inspector}</div>
          </Splitter.Panel>
        </Splitter>
      </div>
    );
  }

  return null;
}
