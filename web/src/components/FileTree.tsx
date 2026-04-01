import { useMemo, useState } from "react";
import { ActionIcon, Badge, Button, Group, Modal, Progress, ScrollArea, Stack, Text, UnstyledButton } from "@mantine/core";
import { IconAlertTriangle, IconCheck, IconChevronRight, IconFolder, IconFolderOpen, IconInfoCircle, IconX } from "@tabler/icons-react";
import { FileIcon as ReactFileIcon, defaultStyles } from "react-file-icon";

import type { ChangeEntry, SessionState } from "../api";

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

export function FileTree({
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
  const tree = useMemo(() => buildTree(changes), [changes]);
  const addedCount = changes.filter((c) => c.type === "added").length;
  const modifiedCount = changes.filter((c) => c.type === "modified").length;
  const deletedCount = changes.filter((c) => c.type === "deleted").length;
  const renamedCount = changes.filter((c) => c.type === "renamed").length;

  function toggleFolder(path: string) {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }

  function handleResetClick() {
    setResetConfirmOpened(true);
  }

  function handleRollbackAllClick() {
    setRollbackAllConfirmOpened(true);
  }

  function confirmReset() {
    setResetConfirmOpened(false);
    onResetSnapshot();
  }

  function confirmRollbackAll() {
    setRollbackAllConfirmOpened(false);
    onRollbackAll();
  }

  return (
    <div className="filetree-container">
      <div className="filetree-header">
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

      <ScrollArea className="filetree-scroll" style={{ flex: 1 }}>
        <Stack gap={0}>
          {tree.map((node) => (
            <TreeNode
              key={node.path}
              node={node}
              depth={0}
              selectedPath={selectedPath}
              selectedPathType={selectedPathType}
              expandedFolders={expandedFolders}
              onSelect={onSelect}
              onToggleFolder={toggleFolder}
            />
          ))}
        </Stack>
      </ScrollArea>

      <div className="filetree-actions">
        <Stack gap="xs">
          {selectedPathType === "folder" && selectedPath ? (
            <Button
              fullWidth
              size="sm"
              variant="light"
              color="blue"
              loading={loading}
              onClick={onRollbackFolder}
              disabled={selectedFolderChangeCount === 0}
              leftSection={<IconX size={16} stroke={1.8} />}
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
            <Button variant="default" onClick={() => setInfoOpened(false)}>
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
                {session.changeCount} thay đổi sẽ trở thành baseline mới
              </Text>
            </Stack>
          </Group>
          <div style={{ background: 'rgba(34, 197, 94, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #22c55e' }}>
            <Text size="xs" fw={600} c="green.4" mb={6}>
              ℹ️ ĐIỀU NÀY SẼ XẢY RA
            </Text>
            <Text size="xs" c="dimmed">
              • Tất cả thay đổi hiện tại sẽ được chấp nhận<br />
              • Snapshot cũ bị thay thế bằng trạng thái hiện tại<br />
              • Danh sách thay đổi sẽ về 0<br />
              • Bạn KHÔNG THỂ khôi phục về trạng thái trước đó
            </Text>
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setResetConfirmOpened(false)} disabled={loading}>
              Hủy
            </Button>
            <Button color="green" onClick={confirmReset} loading={loading}>
              Áp dụng
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
            <Text size="xs" fw={600} c="red.4" mb={6}>
              ⚠️ CẢNH BÁO NGHIÊM TRỌNG
            </Text>
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
            <Button variant="default" onClick={() => setRollbackAllConfirmOpened(false)} disabled={loading}>
              Hủy
            </Button>
            <Button color="red" onClick={confirmRollbackAll} loading={loading}>
              Hủy tất cả thay đổi
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}

interface TreeNodeProps {
  node: FileTreeNode;
  depth: number;
  selectedPath: string | null;
  selectedPathType: "file" | "folder" | null;
  expandedFolders: Set<string>;
  onSelect: (path: string, type: "file" | "folder") => void;
  onToggleFolder: (path: string) => void;
}

function TreeNode({ node, depth, selectedPath, selectedPathType, expandedFolders, onSelect, onToggleFolder }: TreeNodeProps) {
  if (node.isFolder) {
    const isExpanded = expandedFolders.has(node.path);
    return (
      <div>
        <UnstyledButton className={`tree-folder ${isExpanded ? "is-expanded" : ""} ${selectedPath === node.path && selectedPathType === "folder" ? "is-selected" : ""} type-${node.type}`} onClick={() => onSelect(node.path, "folder")} style={{ paddingLeft: depth * 16 + 12 }}>
          <Group gap="xs" wrap="nowrap">
            <ActionIcon variant="transparent" size="sm" color="gray" onClick={(event) => {
              event.stopPropagation();
              onToggleFolder(node.path);
            }} aria-label={isExpanded ? "Thu gọn thư mục" : "Mở rộng thư mục"}>
              <IconChevronRight size={14} stroke={1.8} className={isExpanded ? "folder-arrow is-expanded" : "folder-arrow"} />
            </ActionIcon>
            {isExpanded ? <IconFolderOpen size={15} stroke={1.8} className="folder-glyph" /> : <IconFolder size={15} stroke={1.8} className="folder-glyph" />}
            <Text size="sm" fw={600} lineClamp={1}>
              {node.name}
            </Text>
            <Badge size="xs" variant="light" color={badgeColor(node.type)} radius="sm">
              {node.type === "added" ? "+" : node.type === "deleted" ? "-" : node.type === "renamed" ? "→" : "~"}
            </Badge>
            <Text size="xs" c="dimmed" ml="auto">
              {node.changeCount}
            </Text>
          </Group>
        </UnstyledButton>
        {isExpanded && node.children ? (
          <Stack gap={0}>
            {node.children.map((child) => (
              <TreeNode key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} selectedPathType={selectedPathType} expandedFolders={expandedFolders} onSelect={onSelect} onToggleFolder={onToggleFolder} />
            ))}
          </Stack>
        ) : null}
      </div>
    );
  }

  return (
    <UnstyledButton className={`tree-file ${selectedPath === node.path && selectedPathType === "file" ? "is-selected" : ""} type-${node.type}`} onClick={() => onSelect(node.path, "file")} style={{ paddingLeft: depth * 16 + 28 }}>
      <Group gap="xs" wrap="nowrap">
        <FileTypeIcon path={node.name} />
        <Text size="sm" lineClamp={1} style={{ flex: 1 }}>
          {node.name}
        </Text>
        <Badge size="xs" variant="light" color={badgeColor(node.type)} radius="sm">
          {node.type === "added" ? "+" : node.type === "deleted" ? "-" : node.type === "renamed" ? "→" : "~"}
        </Badge>
      </Group>
    </UnstyledButton>
  );
}

function FileTypeIcon({ path }: { path: string }) {
  const ext = path.split(".").pop()?.toLowerCase();
  const styleKey = (ext && ext in defaultStyles ? ext : "txt") as keyof typeof defaultStyles;
  const style = defaultStyles[styleKey];

  return (
    <span className="file-icon">
      <ReactFileIcon extension={ext || "txt"} {...style} />
    </span>
  );
}

function badgeColor(type: ChangeEntry["type"]): string {
  if (type === "added") return "green";
  if (type === "deleted") return "red";
  if (type === "renamed") return "blue";
  return "yellow";
}

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
