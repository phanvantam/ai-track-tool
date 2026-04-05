import React from "react";
import ReactDOM from "react-dom/client";
import { App as AntApp, ConfigProvider, theme as antTheme } from "antd";

import App from "./App";
import "antd/dist/reset.css";
import "./app.css";

/**
 * Ứng dụng với cấu hình Ant Design sáng (Light) mặc định.
 */
function RootApp() {
  return (
    <ConfigProvider
      theme={{
        algorithm: antTheme.defaultAlgorithm,
        token: {
          colorPrimary: "#3b82f6",
          borderRadius: 8,
          fontSize: 14,
          fontFamily:
            "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
          colorBgContainer: "#ffffff",
          colorBgElevated: "#ffffff",
          colorBgLayout: "#f0f2f5",
          colorText: "#1a1a2e",
          colorTextSecondary: "#6b7280",
          colorBorder: "rgba(0,0,0,0.08)",
          colorBorderSecondary: "rgba(0,0,0,0.04)",
          boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
        },
        components: {
          Layout: {
            headerBg: "#ffffff",
            bodyBg: "#f0f2f5",
            siderBg: "#ffffff",
          },
          Card: {
            colorBgContainer: "#ffffff",
          },
          Tree: {
            directoryNodeSelectedBg: "rgba(59,130,246,0.1)",
            nodeSelectedBg: "rgba(59,130,246,0.1)",
          },
          Modal: {
            contentBg: "#ffffff",
            headerBg: "#ffffff",
          },
          Tabs: {
            itemSelectedColor: "#3b82f6",
            inkBarColor: "#3b82f6",
          },
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RootApp />
  </React.StrictMode>,
);
