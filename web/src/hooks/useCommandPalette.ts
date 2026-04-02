import { useEffect, useState, useCallback } from "react";
import type { SessionState } from "../api";

/**
 * Command item structure
 */
export interface CommandItem {
  id: string;
  label: string;
  icon?: string;
  action: () => void | Promise<void>;
}

/**
 * Command section structure
 */
export interface CommandSection {
  section: "Files" | "Sessions" | "Actions";
  items: CommandItem[];
}

/**
 * Hook để quản lý Command Palette logic.
 * Track: isOpen, searchQuery, results, selected index, etc.
 *
 * @param sessions - Danh sách các sessions
 * @param files - Danh sách các files
 * @param recentActions - Danh sách các recent actions
 * @returns Command palette state + actions
 */
export function useCommandPalette(
  sessions: SessionState[],
  files: string[] = [],
  recentActions: CommandItem[] = [],
) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Generate command sections từ sessions, files, recent actions
  const results = useCallback((): CommandSection[] => {
    const fileCommands: CommandItem[] = files
      .filter((f) =>
        f.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .slice(0, 5)
      .map((f) => ({
        id: `file-${f}`,
        label: `Open file: ${f}`,
        icon: "file",
        action: () => {
          console.log("Open file:", f);
          setIsOpen(false);
        },
      }));

    const sessionCommands: CommandItem[] = sessions
      .filter((s) =>
        s.targetPath.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .slice(0, 5)
      .map((s) => ({
        id: `session-${s.id}`,
        label: `Switch to session: ${s.targetPath}`,
        icon: "folder",
        action: () => {
          console.log("Switch to session:", s.id);
          setIsOpen(false);
        },
      }));

    const actionCommands: CommandItem[] = recentActions
      .filter((a) =>
        a.label.toLowerCase().includes(searchQuery.toLowerCase()),
      )
      .slice(0, 5);

    return [
      ...(fileCommands.length > 0 ? [{ section: "Files" as const, items: fileCommands }] : []),
      ...(sessionCommands.length > 0 ? [{ section: "Sessions" as const, items: sessionCommands }] : []),
      ...(actionCommands.length > 0 ? [{ section: "Actions" as const, items: actionCommands }] : []),
    ];
  }, [searchQuery, sessions, files, recentActions]);

  // Keyboard navigation (Arrow up/down, Enter, Esc)
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    const allItems = results().flatMap((s) => s.items);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % allItems.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allItems.length) % allItems.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (allItems[selectedIndex]) {
        allItems[selectedIndex].action();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
    }
  }, [isOpen, selectedIndex, results]);

  // Lắng nghe keyboard events
  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Open command palette với Ctrl+K
  useEffect(() => {
    const handleOpenCommandPalette = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleOpenCommandPalette);
    return () => window.removeEventListener("keydown", handleOpenCommandPalette);
  }, []);

  // Reset search khi đóng
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  return {
    isOpen,
    setIsOpen,
    searchQuery,
    setSearchQuery,
    results: results(),
    selectedIndex,
  };
}
