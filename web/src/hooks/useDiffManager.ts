import { useCallback, useState } from "react";
import { notifications } from "../lib/notify";
import { getDiff, type SessionState } from "../api";

interface UseDiffManagerReturn {
  selectedPath: string | null;
  selectedPathType: "file" | "folder" | null;
  diffText: string;
  /** Chế độ xem toàn bộ file (full context) */
  fullContext: boolean;
  selectFile: (path: string | null, session?: SessionState) => void;
  loadCurrentDiff: (session: SessionState, path: string, fullContext?: boolean) => Promise<void>;
  setPathType: (type: "file" | "folder" | null) => void;
  setFullContext: (value: boolean) => void;
}

/**
 * Quản lý diff view cho file hiện tại được chọn.
 * Xác định loại path dựa vào session changes.
 * Hỗ trợ chuyển đổi giữa diff rút gọn và xem toàn bộ file.
 */
export function useDiffManager(): UseDiffManagerReturn {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedPathType, setSelectedPathType] = useState<"file" | "folder" | null>(null);
  const [diffText, setDiffText] = useState("");
  const [fullContext, setFullContext] = useState(false);

  // Chọn file/folder và xác định type
  const handleSelectFile = useCallback(
    (path: string | null, session?: SessionState) => {
      setSelectedPath(path);
      // Reset fullContext khi đổi file
      setFullContext(false);
      if (path && session) {
        const isFile = session.changes.some((change) => change.path === path);
        setSelectedPathType(isFile ? "file" : "folder");
      } else {
        setSelectedPathType(null);
      }
    },
    [],
  );

  // Tải diff cho file, hỗ trợ fullContext
  async function handleLoadCurrentDiff(session: SessionState, path: string, useFullContext = false) {
    try {
      const diff = await getDiff(session.id, path, useFullContext);
      setDiffText(diff);
    } catch (error) {
      setDiffText(error instanceof Error ? error.message : "Lỗi tải diff.");
    }
  }

  function handleSetPathType(type: "file" | "folder" | null) {
    setSelectedPathType(type);
  }

  return {
    selectedPath,
    selectedPathType,
    diffText,
    fullContext,
    selectFile: handleSelectFile,
    loadCurrentDiff: handleLoadCurrentDiff,
    setPathType: handleSetPathType,
    setFullContext,
  };
}
