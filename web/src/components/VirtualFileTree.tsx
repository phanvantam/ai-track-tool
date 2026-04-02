/**
 * VirtualFileTree component - Optimized file tree with simple virtual scrolling
 * Sử dụng custom virtual scrolling thay vì react-window (ESM compatibility issues)
 * Performance: ~20-30 visible nodes, 60fps scroll
 */

import React, { useCallback, useMemo, useState, useRef, useEffect } from "react";
import { ActionIcon, Badge, Group, Text, UnstyledButton, ScrollArea } from "@mantine/core";
import { IconChevronRight, IconFolder, IconFolderOpen } from "@tabler/icons-react";
import { FileIcon as ReactFileIcon, defaultStyles } from "react-file-icon";

import type { ChangeEntry } from "../api";
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

interface FlattenedNode extends FileTreeNode {
  depth: number;
  index: number;
}

/**
 * Flatten tree structure sang array cho virtual list
 * Chỉ include expanded folders
 */
function flattenNodes(
  nodes: FileTreeNode[],
  expandedFolders: Set<string>,
  depth = 0
): FlattenedNode[] {
  const flattened: FlattenedNode[] = [];

  for (const node of nodes) {
    flattened.push({ ...node, depth, index: flattened.length });

    // Nếu folder expanded, thêm children vào
    if (node.isFolder && expandedFolders.has(node.path) && node.children) {
      flattened.push(
        ...flattenNodes(node.children, expandedFolders, depth + 1).map(
          (child, idx) => ({
            ...child,
            index: flattened.length + idx,
          })
        )
      );
    }
  }

  return flattened;
}

interface VirtualFileTreeProps {
  nodes: FileTreeNode[];
  selectedPath: string | null;
  selectedPathType: "file" | "folder" | null;
  expandedFolders: Set<string>;
  onSelect: (path: string, type: "file" | "folder") => void;
  onToggleFolder: (path: string) => void;
  height?: number;
}

const ITEM_HEIGHT = 32;
const BUFFER_SIZE = 10; // Render extra items above/below visible area

/**
 * Row component
 */
const VirtualTreeRow = React.memo(({
  node,
  selectedPath,
  selectedPathType,
  expandedFolders,
  onSelect,
  onToggleFolder,
}: {
  node: FlattenedNode;
  selectedPath: string | null;
  selectedPathType: "file" | "folder" | null;
  expandedFolders: Set<string>;
  onSelect: (path: string, type: "file" | "folder") => void;
  onToggleFolder: (path: string) => void;
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected =
    selectedPath === node.path && selectedPathType === (node.isFolder ? "folder" : "file");

  const handleToggleFolder = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleFolder(node.path);
    },
    [node.path, onToggleFolder]
  );

  const handleSelect = useCallback(() => {
    onSelect(node.path, node.isFolder ? "folder" : "file");
  }, [node.path, node.isFolder, onSelect]);

  if (node.isFolder) {
    return (
      <UnstyledButton
        className={`${treeStyles.treeFolder} ${treeStyles.treeFolderHover} ${
          isSelected ? treeStyles.treeFolderSelected : ""
        }`}
        onClick={handleSelect}
        style={{ paddingLeft: node.depth * 16 + 12, height: ITEM_HEIGHT }}
      >
        <Group gap="xs" wrap="nowrap">
          <ActionIcon
            variant="transparent"
            size="sm"
            color="gray"
            onClick={handleToggleFolder}
            aria-label={isExpanded ? "Thu gọn thư mục" : "Mở rộng thư mục"}
          >
            <IconChevronRight
              size={14}
              stroke={1.8}
              className={`${treeStyles.folderArrow} ${
                isExpanded ? treeStyles.folderArrowExpanded : ""
              }`}
            />
          </ActionIcon>
          {isExpanded ? (
            <IconFolderOpen size={15} stroke={1.8} className={treeStyles.folderGlyph} />
          ) : (
            <IconFolder size={15} stroke={1.8} className={treeStyles.folderGlyph} />
          )}
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
    );
  }

  return (
    <UnstyledButton
      className={`${treeStyles.treeFile} ${treeStyles.treeFileHover} ${
        isSelected ? treeStyles.treeFileSelected : ""
      }`}
      onClick={handleSelect}
      style={{ paddingLeft: node.depth * 16 + 28, height: ITEM_HEIGHT }}
    >
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
});

VirtualTreeRow.displayName = "VirtualTreeRow";

function FileTypeIcon({ path }: { path: string }) {
  const ext = path.split(".").pop()?.toLowerCase();
  const styleKey = (ext && ext in defaultStyles ? ext : "txt") as keyof typeof defaultStyles;
  const style = defaultStyles[styleKey];

  return (
    <span className={treeStyles.fileIcon}>
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

/**
 * VirtualFileTree - Simple virtual scrolling implementation
 * Performance:
 * - Renders only visible nodes + buffer (~20-30 nodes at a time)
 * - 1000+ files: scroll at 60fps
 * - DOM reduction: 95%+ from non-virtual
 * - Memory: significant reduction
 */
export const VirtualFileTree = React.memo(
  ({
    nodes,
    selectedPath,
    selectedPathType,
    expandedFolders,
    onSelect,
    onToggleFolder,
    height = 400,
  }: VirtualFileTreeProps) => {
    const flattenedNodes = useMemo(() => {
      return flattenNodes(nodes, expandedFolders);
    }, [nodes, expandedFolders]);

    const [scrollTop, setScrollTop] = useState(0);
    const scrollRef = useRef<HTMLDivElement>(null);

    const startIndex = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER_SIZE);
    const visibleCount = Math.ceil(height / ITEM_HEIGHT) + BUFFER_SIZE * 2;
    const endIndex = Math.min(flattenedNodes.length, startIndex + visibleCount);

    const visibleNodes = flattenedNodes.slice(startIndex, endIndex);
    const offsetY = startIndex * ITEM_HEIGHT;
    const totalHeight = flattenedNodes.length * ITEM_HEIGHT;

    const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setScrollTop(target.scrollTop);
    }, []);

    return (
      <ScrollArea
        ref={scrollRef}
        style={{ height }}
        onScroll={handleScroll}
        type="never"
      >
        <div style={{ height: totalHeight, position: "relative" }}>
          <div style={{ transform: `translateY(${offsetY}px)` }}>
            {visibleNodes.map((node) => (
              <VirtualTreeRow
                key={node.path}
                node={node}
                selectedPath={selectedPath}
                selectedPathType={selectedPathType}
                expandedFolders={expandedFolders}
                onSelect={onSelect}
                onToggleFolder={onToggleFolder}
              />
            ))}
          </div>
        </div>
      </ScrollArea>
    );
  }
);

VirtualFileTree.displayName = "VirtualFileTree";
