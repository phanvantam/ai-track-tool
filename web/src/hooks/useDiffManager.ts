import { useCallback, useState } from "react";
import { notifications } from "../lib/notify";
import { getDiff, type SessionState } from "../api";

interface UseDiffManagerReturn {
  selectedPath: string | null;
  selectedPathType: "file" | "folder" | null;
  diffText: string;
  selectFile: (path: string | null, session?: SessionState) => void;
  loadCurrentDiff: (session: SessionState, path: string) => Promise<void>;
  setPathType: (type: "file" | "folder" | null) => void;
}

/**
 * Quản lý diff view cho file hiện tại được chọn.
 * Xác định loại path dựa vào session changes.
 */
export function useDiffManager(): UseDiffManagerReturn {
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedPathType, setSelectedPathType] = useState<"file" | "folder" | null>(null);
  const [diffText, setDiffText] = useState("");

  // Chọn file/folder và xác định type
  const handleSelectFile = useCallback(
    (path: string | null, session?: SessionState) => {
      setSelectedPath(path);
      if (path && session) {
        const isFile = session.changes.some((change) => change.path === path);
        setSelectedPathType(isFile ? "file" : "folder");
      } else {
        setSelectedPathType(null);
      }
    },
    [],
  );

  // Tải diff cho file
  async function handleLoadCurrentDiff(session: SessionState, path: string) {
    try {
      const diff = await getDiff(session.id, path);
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
    selectFile: handleSelectFile,
    loadCurrentDiff: handleLoadCurrentDiff,
    setPathType: handleSetPathType,
  };
}
