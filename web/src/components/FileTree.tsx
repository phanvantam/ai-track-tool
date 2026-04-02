import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Empty,
  Flex,
  Modal,
  Progress,
  Space,
  Tag,
  Tree,
  Typography,
} from "antd";
import { IconInfoCircle, IconRestore, IconX } from "@tabler/icons-react";
import type { DataNode } from "antd/es/tree";
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

interface TreeNodeData extends DataNode {
  filePath: string;
  nodeKind: "file" | "folder";
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
 * File tree dùng AntD Tree/Card/Modal.
 */
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
  const [infoOpened, setInfoOpened] = useState(false);
  const [resetConfirmOpened, setResetConfirmOpened] = useState(false);
  const [rollbackAllConfirmOpened, setRollbackAllConfirmOpened] = useState(false);
  const [rollbackFolderConfirmOpened, setRollbackFolderConfirmOpened] = useState(false);
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([""]);

  const tree = useMemo(() => buildTree(changes), [changes]);
  const treeData = useMemo(() => toTreeData(tree), [tree]);

  const addedCount = changes.filter((c) => c.type === "added").length;
  const modifiedCount = changes.filter((c) => c.type === "modified").length;
  const deletedCount = changes.filter((c) => c.type === "deleted").length;
  const renamedCount = changes.filter((c) => c.type === "renamed").length;

  return (
    <Card 
      title={
        <Flex justify="space-between" align="center">
          <span>Thay đổi</span>
          <Space size={4}>
            {addedCount > 0 ? <Tag color="green">+{addedCount}</Tag> : null}
            {modifiedCount > 0 ? <Tag color="gold">~{modifiedCount}</Tag> : null}
            {deletedCount > 0 ? <Tag color="red">-{deletedCount}</Tag> : null}
            {renamedCount > 0 ? <Tag color="blue">→{renamedCount}</Tag> : null}
          </Space>
        </Flex>
      }
      extra={<Button type="text" size="small" icon={<IconInfoCircle size={16} />} onClick={() => setInfoOpened(true)} />}
      style={{ height: '100%' }}
      bodyStyle={{ padding: 0, height: 'calc(100% - 57px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: 12 }}>
        {treeData.length === 0 ? (
          <Empty description="Không có thay đổi" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Tree
            blockNode
            showLine
            treeData={treeData}
            expandedKeys={expandedKeys}
            selectedKeys={selectedPath ? [selectedPath] : []}
            onExpand={(keys) => setExpandedKeys(keys)}
            onSelect={(_, info) => {
              const node = info.node as unknown as TreeNodeData;
              onSelect(node.filePath, node.nodeKind);
            }}
          />
        )}
      </div>

      <div style={{ padding: 12, borderTop: '1px solid #f0f0f0', background: '#fafafa' }}>
        <Flex vertical gap="small">
          {selectedPathType === "folder" && selectedPath ? (
            <Button
              block
              size="small"
              icon={<IconRestore size={16} />}
              onClick={() => setRollbackFolderConfirmOpened(true)}
              disabled={selectedFolderChangeCount === 0}
              loading={loading}
            >
              Khôi phục thư mục
            </Button>
          ) : null}

          <Button block size="small" type="primary" onClick={() => setResetConfirmOpened(true)} loading={loading}>
            Áp dụng thay đổi
          </Button>

          <Button block size="small" danger onClick={() => setRollbackAllConfirmOpened(true)} loading={loading} disabled={changes.length === 0}>
            Hủy tất cả
          </Button>
        </Flex>
      </div>

      <Modal open={infoOpened} onCancel={() => setInfoOpened(false)} title="Thông tin project" footer={null} destroyOnHidden>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Target Path">{session.targetPath}</Descriptions.Item>
          <Descriptions.Item label="Storage Path">{session.storagePath}</Descriptions.Item>
          <Descriptions.Item label="Snapshot Files">{`${session.storagePath}/snapshots/${session.snapshotId}/files`}</Descriptions.Item>
          <Descriptions.Item label="Snapshot ID">{session.snapshotId}</Descriptions.Item>
          <Descriptions.Item label="Watcher Status">{session.watchStatus}</Descriptions.Item>
          <Descriptions.Item label="Tổng thay đổi">{session.changeCount}</Descriptions.Item>
        </Descriptions>
      </Modal>

      <Modal
        open={resetConfirmOpened}
        onCancel={() => setResetConfirmOpened(false)}
        onOk={() => {
          setResetConfirmOpened(false);
          onResetSnapshot();
        }}
        okText="Áp dụng"
        cancelText="Hủy"
        confirmLoading={loading}
        title="Xác nhận áp dụng thay đổi"
        destroyOnHidden
      >
        <Alert
          type="success"
          message="Snapshot sẽ được cập nhật"
          description={`${session.changeCount} thay đổi sẽ trở thành trạng thái theo dõi mới.`}
          showIcon
        />
      </Modal>

      <Modal
        open={rollbackFolderConfirmOpened}
        onCancel={() => setRollbackFolderConfirmOpened(false)}
        onOk={() => {
          setRollbackFolderConfirmOpened(false);
          onRollbackFolder();
        }}
        okText="Khôi phục thư mục"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={loading}
        title="Xác nhận khôi phục thư mục"
        destroyOnHidden
      >
        <Alert
          type="warning"
          message={selectedPath ?? "Thư mục đã chọn"}
          description="Toàn bộ file trong thư mục sẽ bị khôi phục theo snapshot hiện tại. Hành động này không hoàn tác được."
          showIcon
        />
      </Modal>

      <Modal
        open={rollbackAllConfirmOpened}
        onCancel={() => setRollbackAllConfirmOpened(false)}
        onOk={() => {
          setRollbackAllConfirmOpened(false);
          onRollbackAll();
        }}
        okText="Hủy tất cả thay đổi"
        cancelText="Hủy"
        okButtonProps={{ danger: true }}
        confirmLoading={loading}
        title="Xác nhận hủy tất cả thay đổi"
        destroyOnHidden
      >
        <Flex vertical gap="middle">
          <Alert
            type="error"
            message="Toàn bộ thay đổi sẽ mất"
            description={`Tất cả ${session.changeCount} file sẽ quay về phiên bản snapshot.`}
            showIcon
          />

          {loading && rollbackAllProgress > 0 ? (
            <Progress percent={rollbackAllProgress} status="active" />
          ) : null}
        </Flex>
      </Modal>
    </Card>
  );
}

function toTreeData(nodes: FileTreeNode[]): TreeNodeData[] {
  return nodes.map((node) => ({
    key: node.path,
    title: (
      <Flex align="center" gap="small">
        <Typography.Text ellipsis>
          {node.name}
        </Typography.Text>
        <Tag color={badgeColor(node.type)}>{node.isFolder ? node.changeCount ?? 0 : labelForType(node.type)}</Tag>
      </Flex>
    ),
    children: node.children ? toTreeData(node.children) : undefined,
    filePath: node.path,
    nodeKind: node.isFolder ? "folder" : "file",
    selectable: true,
  }));
}

function labelForType(type: ChangeEntry["type"]) {
  if (type === "added") return "+";
  if (type === "deleted") return "-";
  if (type === "renamed") return "→";
  return "~";
}

function badgeColor(type: ChangeEntry["type"]) {
  if (type === "added") return "green";
  if (type === "deleted") return "red";
  if (type === "renamed") return "blue";
  return "gold";
}

function buildTree(changes: ChangeEntry[]): FileTreeNode[] {
  const root: FileTreeNode = {
    name: "",
    path: "",
    type: "modified",
    isBinary: false,
    isFolder: true,
    children: [],
  };

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
      }

      if (!isFile) {
        child.children = child.children ?? [];
        child.changeCount = (child.changeCount ?? 0) + 1;
        child.type = mergeFolderType(child.type, change.type);
      }

      current = child;
    }
  }

  return root.children ?? [];
}

function mergeFolderType(currentType: ChangeEntry["type"], nextType: ChangeEntry["type"]): ChangeEntry["type"] {
  if (currentType === nextType) return currentType;
  return "modified";
}
