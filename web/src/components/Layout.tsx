import { Layout as AntLayout, Flex, Typography } from "antd";
import type { ReactNode } from "react";

interface LayoutProps {
  sidebar?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
}

/**
 * Khung ứng dụng chính với thiết kế sáng (Light).
 * Header có gradient branding, content co giãn.
 */
export function Layout({ sidebar, headerActions, children }: LayoutProps) {
  return (
    <AntLayout style={{ height: "100vh" }}>
      <AntLayout.Header className="app-header">
        <Flex align="center" justify="space-between" style={{ width: "100%" }}>
          {/* Branding */}
          <Flex align="center" gap={4}>
            <span className="app-brand">AI Track</span>
            <span className="app-brand-sub">Change Viewer</span>
          </Flex>

          {/* Actions */}
          <Flex align="center" gap="small">
            {headerActions}

            <Typography.Text
              style={{
                fontSize: 11,
                color: "var(--text-muted)",
                marginLeft: 4,
              }}
            >
              Local only
            </Typography.Text>
          </Flex>
        </Flex>
      </AntLayout.Header>

      <AntLayout style={{ height: "calc(100vh - 56px)" }}>
        {sidebar ? (
          <AntLayout.Sider
            width={320}
            style={{
              background: "var(--bg-secondary)",
              borderRight: "1px solid var(--border-primary)",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <div style={{ height: "100%", overflow: "auto", padding: 16 }}>
              {sidebar}
            </div>
          </AntLayout.Sider>
        ) : null}

        <AntLayout.Content
          style={{
            height: "100%",
            overflow: "hidden",
            padding: 0,
            background: "var(--bg-primary)",
          }}
        >
          {children}
        </AntLayout.Content>
      </AntLayout>
    </AntLayout>
  );
}
