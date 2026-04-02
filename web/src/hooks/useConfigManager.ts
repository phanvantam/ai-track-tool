import { useEffect, useState } from "react";
import { notifications } from "../lib/notify";
import { getConfig, updateConfig, type ConfigPayload } from "../api";

interface UseConfigManagerReturn {
  config: ConfigPayload | null;
  configLoading: boolean;
  configError: string | null;
  savingConfig: boolean;
  loadConfig: () => Promise<void>;
  saveConfig: (storageDir: string | null) => Promise<void>;
}

/**
 * Quản lý config state và operations.
 * Tải config từ backend, lưu config, xử lý errors.
 */
export function useConfigManager(): UseConfigManagerReturn {
  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);

  // Tải config
  async function handleLoadConfig() {
    setConfigLoading(true);
    setConfigError(null);

    try {
      const payload = await getConfig();
      setConfig(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không tải được cấu hình từ backend.";
      setConfigError(message);
      notifications.show({
        color: "red",
        message,
      });
    } finally {
      setConfigLoading(false);
    }
  }

  // Lưu config
  async function handleSaveConfig(storageDir: string | null) {
    setSavingConfig(true);

    try {
      const payload = await updateConfig(storageDir);
      setConfig(payload);
      setConfigError(null);
      notifications.show({
        color: "green",
        message: "Đã cập nhật cấu hình lưu trữ.",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không lưu được cấu hình.";
      setConfigError(message);
      notifications.show({
        color: "red",
        message,
      });
    } finally {
      setSavingConfig(false);
    }
  }

  return {
    config,
    configLoading,
    configError,
    savingConfig,
    loadConfig: handleLoadConfig,
    saveConfig: handleSaveConfig,
  };
}
