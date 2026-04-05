import { useHotkeys } from "react-hotkeys-hook";
import { notifications } from "../lib/notify";

interface KeyboardShortcutsProps {
  onOpenCommandPalette: () => void;
  onOpenGuide: () => void;
  onSaveConfig: () => void | Promise<void>;
  onRefreshSession: () => void | Promise<void>;
  onDeleteSelected: () => void | Promise<void>;
}

/**
 * KeyboardShortcuts component - Register global keyboard shortcuts.
 * Shortcuts:
 * - Ctrl+K: Open command palette
 * - Ctrl+?: Open guide modal
 * - Ctrl+S: Save config
 * - Ctrl+R: Refresh session
 * - Delete: Delete selected item
 * - Escape: Close modals/drawers
 */
export function KeyboardShortcuts({
  onOpenCommandPalette,
  onOpenGuide,
  onSaveConfig,
  onRefreshSession,
  onDeleteSelected,
}: KeyboardShortcutsProps) {
  // Ctrl+K: Open command palette
  useHotkeys(
    "ctrl+k",
    (e) => {
      e.preventDefault();
      onOpenCommandPalette();
    },
    { enableOnFormTags: false },
  );

  // Ctrl+?: Open guide
  useHotkeys(
    "ctrl+shift+/",
    (e) => {
      e.preventDefault();
      onOpenGuide();
    },
    { enableOnFormTags: false },
  );

  // Ctrl+S: Save config
  useHotkeys(
    "ctrl+s",
    (e) => {
      e.preventDefault();
      onSaveConfig();
      notifications.show({
        message: "Cấu hình đã được lưu",
        color: "green",
      });
    },
    { enableOnFormTags: false },
  );

  // Ctrl+R: Refresh session
  useHotkeys(
    "ctrl+r",
    (e) => {
      e.preventDefault();
      onRefreshSession();
      notifications.show({
        message: "Đang làm mới session...",
        color: "blue",
      });
    },
    { enableOnFormTags: false },
  );

  // Delete: Delete selected item (nếu focus không phải input)
  useHotkeys(
    "delete",
    (e) => {
      const target = e.target as HTMLElement;
      // Chỉ trigger nếu focus không phải input field
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") {
        e.preventDefault();
        onDeleteSelected();
      }
    },
    { enableOnFormTags: false },
  );

  // Component này không render gì, chỉ register shortcuts
  return null;
}
