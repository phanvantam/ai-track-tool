import React, { useCallback, useMemo, useState } from "react";
import { ActionIcon, Badge, Button, Group, Modal, Progress, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconInfoCircle, IconRestore, IconX } from "@tabler/icons-react";

import type { ChangeEntry, SessionState } from "../api";
import { VirtualFileTree } from "./VirtualFileTree";
import layoutStyles from "../styles/layout.module.css";
import treeStyles from "../styles/components/tree.module.css";

interface FileTreeNode {
  name: string;
  path: string;
  type: ChangeEntry["type"];
  isBinary: boolean;
  children?: FileTreeNode[];
  isFolder: boolean;
  changeCount?: number;
}

interface FileTreeProps {
  session: SessionState;
  changes: ChangeEntry[];
  selectedPath: string | null;
  selectedPathType: "file" | "folder" | null;
  selectedFolderChangeCount: number;
  onSelect: (path: string, type: "file" | "folder") => void;
  onResetSnapshot: () => void;
  onRollbackAll: () => void;
  onRollbackFolder: () => void;
  loading: boolean;
  rollbackAllProgress: number;
}

/**
 * FileTree component - Hierarchical file change display
 * Optimized with:
 * - VirtualFileTree: virtual scrolling for 1000+ files
 * - useMemo: memoize buildTree computation
 * - useCallback: memoize event handlers
 * - React.memo: prevent re-render on props change
 */

function FileTreeComponent({
  session,
  changes,
  selectedPath,
  selectedPathType,
  selectedFolderChangeCount,
  onSelect,
  onResetSnapshot,
  onRollbackAll,
  onRollbackFolder,
  loading,
  rollbackAllProgress,
}: FileTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([""]));
  const [infoOpened, setInfoOpened] = useState(false);
  const [resetConfirmOpened, setResetConfirmOpened] = useState(false);
  const [rollbackAllConfirmOpened, setRollbackAllConfirmOpened] = useState(false);
  const [rollbackFolderConfirmOpened, setRollbackFolderConfirmOpened] = useState(false);
  const tree = useMemo(() => buildTree(changes), [changes]);
  const addedCount = changes.filter((c) => c.type === "added").length;
  const modifiedCount = changes.filter((c) => c.type === "modified").length;
  const deletedCount = changes.filter((c) => c.type === "deleted").length;
  const renamedCount = changes.filter((c) => c.type === "renamed").length;

  // useCallback để optimize folder toggle
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  function handleResetClick() {
    setResetConfirmOpened(true);
  }

  function handleRollbackAllClick() {
    setRollbackAllConfirmOpened(true);
  }

  function handleRollbackFolderClick() {
    setRollbackFolderConfirmOpened(true);
  }

  function confirmReset() {
    setResetConfirmOpened(false);
    onResetSnapshot();
  }

  function confirmRollbackAll() {
    setRollbackAllConfirmOpened(false);
    onRollbackAll();
  }

  function confirmRollbackFolder() {
    setRollbackFolderConfirmOpened(false);
    onRollbackFolder();
  }

  return (
    <div className={layoutStyles.filetreeContainer}>
      <div className={layoutStyles.filetreeHeader}>
        <Group gap="xs" wrap="nowrap">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Thay đổi
          </Text>
          <ActionIcon variant="subtle" size="sm" aria-label="Thông tin project" onClick={() => setInfoOpened(true)}>
            <IconInfoCircle size={16} stroke={1.8} />
          </ActionIcon>
        </Group>
        <Group gap="xs">
          {addedCount > 0 ? <Badge size="xs" color="green">+{addedCount}</Badge> : null}
          {modifiedCount > 0 ? <Badge size="xs" color="yellow">~{modifiedCount}</Badge> : null}
          {deletedCount > 0 ? <Badge size="xs" color="red">-{deletedCount}</Badge> : null}
          {renamedCount > 0 ? <Badge size="xs" color="blue">→{renamedCount}</Badge> : null}
        </Group>
      </div>

      <ScrollArea className={layoutStyles.filetreeScroll} style={{ flex: 1 }}>
        <VirtualFileTree
          nodes={tree}
          selectedPath={selectedPath}
          selectedPathType={selectedPathType}
          expandedFolders={expandedFolders}
          onSelect={onSelect}
          onToggleFolder={toggleFolder}
          height={500}
        />
      </ScrollArea>

      <div className={layoutStyles.filetreeActions}>
        <Stack gap="xs">
          {selectedPathType === "folder" && selectedPath ? (
            <Button
              fullWidth
              size="sm"
              variant="light"
              color="blue"
              loading={loading}
              onClick={handleRollbackFolderClick}
              disabled={selectedFolderChangeCount === 0}
              leftSection={<IconRestore size={16} stroke={1.8} />}
            >
              Khôi phục thư mục đã chọn
            </Button>
          ) : null}
          <Button 
            fullWidth 
            size="sm" 
            variant="light" 
            color="green" 
            loading={loading} 
            onClick={handleResetClick}
            leftSection={<IconCheck size={16} stroke={1.8} />}
          >
            Áp dụng thay đổi
          </Button>
          <Button 
            fullWidth 
            size="sm" 
            variant="light" 
            color="red" 
            loading={loading} 
            onClick={handleRollbackAllClick}
            leftSection={<IconX size={16} stroke={1.8} />}
            disabled={changes.length === 0}
          >
            Hủy tất cả thay đổi
          </Button>
        </Stack>
      </div>

      <Modal opened={infoOpened} onClose={() => setInfoOpened(false)} title="Thông tin project" centered radius="md" size="lg">
        <Stack gap="md">
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Target Path</Text>
            <Text size="sm" mt={4}>{session.targetPath}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Storage Path</Text>
            <Text size="sm" mt={4}>{session.storagePath}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Snapshot Files</Text>
            <Text size="sm" mt={4}>{`${session.storagePath}/snapshots/${session.snapshotId}/files`}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Snapshot ID</Text>
            <Text size="sm" mt={4}>{session.snapshotId}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Watcher Status</Text>
            <Text size="sm" mt={4}>{session.watchStatus}</Text>
          </div>
          <div>
            <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Tổng thay đổi</Text>
            <Text size="sm" mt={4}>{session.changeCount}</Text>
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setInfoOpened(false)} leftSection={<IconX size={16} stroke={1.8} />}>
              Đóng
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={resetConfirmOpened} onClose={() => setResetConfirmOpened(false)} title="Xác nhận Áp dụng Thay đổi" centered radius="md" size="md">
        <Stack gap="md">
          <Group gap="sm" align="flex-start">
            <IconAlertTriangle size={24} stroke={1.8} style={{ color: '#22c55e', flexShrink: 0, marginTop: 2 }} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                Bạn có chắc muốn áp dụng tất cả thay đổi hiện tại?
              </Text>
              <Text size="sm" c="dimmed">
                {session.changeCount} thay đổi sẽ trở thành mốc theo dõi mới
              </Text>
            </Stack>
          </Group>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #22c55e' }}>
            <Group gap={6} mb={6}>
              <IconInfoCircle size={16} stroke={1.8} style={{ color: '#4ade80' }} />
              <Text size="xs" fw={600} c="green.4">
                ĐIỀU NÀY SẼ XẢY RA
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              • Tất cả thay đổi hiện tại sẽ được chấp nhận<br />
              • Snapshot cũ bị thay thế bằng trạng thái hiện tại<br />
              • Danh sách thay đổi sẽ về 0<br />
              • Bạn KHÔNG THỂ khôi phục về trạng thái trước đó
            </Text>
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setResetConfirmOpened(false)} disabled={loading} leftSection={<IconX size={16} stroke={1.8} />}>
              Hủy
            </Button>
            <Button color="green" onClick={confirmReset} loading={loading} leftSection={<IconCheck size={16} stroke={1.8} />}>
              Áp dụng
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={rollbackFolderConfirmOpened} onClose={() => setRollbackFolderConfirmOpened(false)} title="Xác nhận Khôi phục Thư mục" centered radius="md" size="md">
        <Stack gap="md">
          <Group gap="sm" align="flex-start">
            <IconAlertTriangle size={24} stroke={1.8} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                Bạn có chắc muốn khôi phục toàn bộ thư mục đã chọn?
              </Text>
              <Text size="sm" c="dimmed">
                Thư mục: <Text component="span" c="white" fw={500}>{selectedPath}</Text>
              </Text>
            </Stack>
          </Group>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
            <Group gap={6} mb={6}>
              <IconAlertTriangle size={16} stroke={1.8} style={{ color: '#fbbf24' }} />
              <Text size="xs" fw={600} c="yellow.4">
                CẢNH BÁO
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              • Tất cả file trong thư mục sẽ bị khôi phục theo snapshot<br />
              • File mới thêm trong thư mục có thể bị xóa<br />
              • Các thay đổi hiện tại trong thư mục sẽ mất<br />
              • Hãy kiểm tra diff trước khi tiếp tục
            </Text>
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRollbackFolderConfirmOpened(false)} disabled={loading} leftSection={<IconX size={16} stroke={1.8} />}>
              Hủy
            </Button>
            <Button color="red" onClick={confirmRollbackFolder} loading={loading} leftSection={<IconRestore size={16} stroke={1.8} />}>
              Khôi phục thư mục
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={rollbackAllConfirmOpened} onClose={() => setRollbackAllConfirmOpened(false)} title="Xác nhận Hủy Tất cả Thay đổi" centered radius="md" size="md">
        <Stack gap="md">
          <Group gap="sm" align="flex-start">
            <IconAlertTriangle size={24} stroke={1.8} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                Bạn có chắc muốn hủy tất cả thay đổi?
              </Text>
              <Text size="sm" c="dimmed">
                Tất cả {session.changeCount} file sẽ được khôi phục về phiên bản snapshot
              </Text>
            </Stack>
          </Group>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
            <Group gap={6} mb={6}>
              <IconAlertTriangle size={16} stroke={1.8} style={{ color: '#f87171' }} />
              <Text size="xs" fw={600} c="red.4">
                CẢNH BÁO NGHIÊM TRỌNG
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              • TẤT CẢ {addedCount + modifiedCount + deletedCount} file thay đổi sẽ bị ghi đè<br />
              • File added sẽ bị XÓA khỏi project<br />
              • File modified sẽ về phiên bản cũ<br />
              • File deleted sẽ được KHÔI PHỤC<br />
              • Hành động này KHÔNG THỂ hoàn tác<br />
              • Hãy đảm bảo đã backup code quan trọng
            </Text>
          </div>
          {loading && rollbackAllProgress > 0 ? (
            <Stack gap={6}>
              <Group justify="space-between" gap="xs">
                <Text size="xs" c="dimmed">
                  Đang khôi phục files...
                </Text>
                <Text size="xs" fw={600}>
                  {rollbackAllProgress}%
                </Text>
              </Group>
              <Progress value={rollbackAllProgress} radius="xl" size="sm" color="red" animated />
            </Stack>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRollbackAllConfirmOpened(false)} disabled={loading} leftSection={<IconX size={16} stroke={1.8} />}>
              Hủy
            </Button>
            <Button color="red" onClick={confirmRollbackAll} loading={loading} leftSection={<IconRestore size={16} stroke={1.8} />}>
              Hủy tất cả thay đổi
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

export const FileTree = React.memo(FileTreeComponent);


function buildTree(changes: ChangeEntry[]): FileTreeNode[] {
  const root: FileTreeNode = { name: "", path: "", type: "modified", isBinary: false, isFolder: true, children: [] };

  for (const change of changes) {
    const segments = change.path.split("/");
    let current = root;

    for (let index = 0; index < segments.length; index += 1) {
      const segment = segments[index];
      const isFile = index === segments.length - 1;
      const nodePath = segments.slice(0, index + 1).join("/");
      let child = current.children?.find((candidate) => candidate.name === segment);

      if (!child) {
        child = {
          name: segment,
          path: nodePath,
          type: change.type,
          isBinary: change.isBinary,
          isFolder: !isFile,
          children: isFile ? undefined : [],
          changeCount: isFile ? 1 : 0,
        };
        current.children?.push(child);
      } else if (!isFile) {
        child.children = child.children ?? [];
      }

      if (!isFile) {
        child.changeCount = (child.changeCount ?? 0) + 1;
        child.type = mergeFolderType(child.type, change.type);
      }

      current = child;
    }
  }

  return root.children ?? [];
}

function mergeFolderType(currentType: ChangeEntry["type"], nextType: ChangeEntry["type"]): ChangeEntry["type"] {
  if (currentType === nextType) {
    return currentType;
  }

  if (currentType === "modified" || nextType === "modified") {
    return "modified";
  }

  return "modified";
}
