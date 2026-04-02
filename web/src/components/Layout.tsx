import { Layout as AntLayout, Flex, Typography } from "antd";
import type { ReactNode } from "react";

interface LayoutProps {
  sidebar?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
}

/**
 * Khung ứng dụng chính bằng Ant Design.
 * Giữ header cố định, phần content co giãn theo chiều cao màn hình.
 */
export function Layout({ sidebar, headerActions, children }: LayoutProps) {
  return (
    <AntLayout style={{ height: '100vh' }}>
      <AntLayout.Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Flex align="center" justify="space-between" style={{ width: '100%' }}>
          <Flex align="center" gap="middle">
            <Typography.Text strong style={{ fontSize: 16 }}>
              AI Track
            </Typography.Text>
            <Typography.Title level={4} style={{ margin: 0 }}>
              Change Viewer
            </Typography.Title>
          </Flex>

          <Flex align="center" gap="small">
            {headerActions}
            <Typography.Text type="secondary">Local only</Typography.Text>
          </Flex>
        </Flex>
      </AntLayout.Header>

      <AntLayout style={{ height: 'calc(100vh - 64px)' }}>
        {sidebar ? (
          <AntLayout.Sider 
            width={320} 
            style={{ 
              background: '#fff', 
              borderRight: '1px solid #f0f0f0',
              height: '100%',
              overflow: 'hidden'
            }}
          >
            <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
              {sidebar}
            </div>
          </AntLayout.Sider>
        ) : null}
        
        <AntLayout.Content style={{ 
          height: '100%', 
          overflow: 'hidden',
          padding: 16,
          background: '#f5f5f5'
        }}>
          {children}
        </AntLayout.Content>
      </AntLayout>
    </AntLayout>
  );
}
