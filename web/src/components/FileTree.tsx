import { useState } from "react";
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
  Tooltip,
  Typography,
} from "antd";
import { 
  IconAlertCircle,
  IconBrandCss3,
  IconBrandHtml5,
  IconBrandTypescript,
  IconCheck,
  IconDatabase,
  IconDatabaseCog,
  IconEdit,
  IconFileCode,
  IconFileText,
  IconFolder, 
  IconFolderOpen,
  IconHistory,
  IconInfoCircle, 
  IconJson,
  IconLock,
  IconMarkdown,
  IconPackage,
  IconPhoto,
  IconPlaylistX,
  IconSettings,
  IconX,
} from "@tabler/icons-react";
import type { ChangeEntry, FsckReport, GarbageCollectionReport, SessionState } from "../api";
import {
  createTag as apiCreateTag,
  deleteNote as apiDeleteNote,
  deleteTag as apiDeleteTag,
  restoreSnapshot as apiRestoreSnapshot,
  saveNote as apiSaveNote,
} from "../api";
import { notifications } from "../lib/notify";
import { HealthTab, HistoryTab, ReflogTab, SnapshotDrawer, type ConfirmDialogState } from "./inspector";
import type { useHistoryManager } from "../hooks";

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
  historyManager: ReturnType<typeof useHistoryManager>;
  fsckReport: FsckReport | null;
  gcReport: GarbageCollectionReport | null;
  onRunFsck: (repair: boolean) => Promise<void>;
  onRunGc: (dryRun: boolean) => Promise<void>;
}

/** Mục hiển thị — phân biệt file đơn lẻ và directory rename qua field directoryRename */

/**
 * Danh sách thay đổi phẳng (Flat List) hiển thị full path.
 * Backend đã gom nhóm directory rename thành 1 entry đại diện.
 */
export function FileTree({
  session,
  changes,
  selectedPath,
  onSelect,
  onResetSnapshot,
  onRollbackAll,
  loading,
  rollbackAllProgress,
  historyManager,
  fsckReport,
  gcReport,
  onRunFsck,
  onRunGc,
}: FileTreeProps) {
  const [infoOpened, setInfoOpened] = useState(false);
  const [healthOpened, setHealthOpened] = useState(false);
  const [reflogOpened, setReflogOpened] = useState(false);
  const [historyOpened, setHistoryOpened] = useState(false);
  const [drawerOpened, setDrawerOpened] = useState(false);
  const [resetConfirmOpened, setResetConfirmOpened] = useState(false);
  const [rollbackAllConfirmOpened, setRollbackAllConfirmOpened] = useState(false);
  const [confirmState, setConfirmState] = useState<ConfirmDialogState | null>(null);

  const selectedSnapshot =
    historyManager.historyView?.snapshots.find((s) => s.snapshotId === historyManager.selectedSnapshotId) ??
    historyManager.historyView?.snapshots.find((s) => s.isActive) ??
    null;

  const addedCount = changes.filter((c) => c.type === "added").length;
  const modifiedCount = changes.filter((c) => c.type === "modified").length;
  const deletedCount = changes.filter((c) => c.type === "deleted").length;
  const renamedCount = changes.filter((c) => c.type === "renamed").length;

  return (
    <Card 
      extra={
        <Space size={0}>
          <Button type="text" size="small" icon={<IconHistory size={16} />} onClick={() => { setHistoryOpened(true); void historyManager.loadHistory(session.id); }} />
          <Button type="text" size="small" icon={<IconDatabaseCog size={16} />} onClick={() => setHealthOpened(true)} />
          <Button type="text" size="small" icon={<IconPlaylistX size={16} />} onClick={() => setReflogOpened(true)} />
          <Button type="text" size="small" icon={<IconInfoCircle size={16} />} onClick={() => setInfoOpened(true)} />
        </Space>
      }
      style={{ height: '100%', background: 'var(--bg-secondary)', borderColor: 'var(--border-primary)' }}
      bodyStyle={{ padding: 0, height: 'calc(100% - 57px)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto' }}>
        {changes.length === 0 ? (
          <Empty 
            style={{ marginTop: 60 }} 
            description="Không có thay đổi" 
            image={Empty.PRESENTED_IMAGE_SIMPLE} 
          />
        ) : (
          <div className="flat-change-list">
            {changes.map((change) => {
              if (change.directoryRename) {
                return renderDirRenameItem(change, selectedPath, onSelect);
              }
              if (change.collapsedCount) {
                return renderCollapsedDirItem(change, selectedPath, onSelect);
              }
              return renderFileItem(change, selectedPath, onSelect);
            })}
          </div>
        )}
      </div>

      <div className="filetree-footer">
        {/* Thanh tiến trình khi đang xử lý thao tác */}
        {loading && (
          <div className="filetree-footer-progress">
            <Progress 
              percent={rollbackAllProgress > 0 ? rollbackAllProgress : 100} 
              showInfo={rollbackAllProgress > 0}
              status="active" 
              strokeColor={rollbackAllProgress > 0 ? '#ff3b30' : { from: 'var(--accent-primary)', to: 'var(--accent-secondary)' }}
              size="small"
            />
          </div>
        )}
        <Flex gap="small">
          <Button
            style={{ flex: 1 }}
            type="primary"
            icon={<IconCheck size={16} />}
            onClick={() => setResetConfirmOpened(true)}
            loading={loading}
          >
            Áp dụng
          </Button>
          <Button
            style={{ flex: 1 }}
            danger
            icon={<IconX size={16} />}
            onClick={() => setRollbackAllConfirmOpened(true)}
            loading={loading}
            disabled={changes.length === 0}
          >
            Hủy bỏ
          </Button>
        </Flex>
      </div>

      <Modal open={infoOpened} onCancel={() => setInfoOpened(false)} title="Thông tin project" footer={null} centered destroyOnHidden>
        <Descriptions column={1} bordered size="small">
          <Descriptions.Item label="Target Path">{session.targetPath}</Descriptions.Item>
          <Descriptions.Item label="Storage Path">{session.storagePath}</Descriptions.Item>
          <Descriptions.Item label="Snapshot ID">{session.snapshotId}</Descriptions.Item>
          <Descriptions.Item label="Watcher Status">{session.watchStatus}</Descriptions.Item>
          <Descriptions.Item label="Tổng thay đổi">{session.changeCount}</Descriptions.Item>
        </Descriptions>
      </Modal>

      <Modal open={healthOpened} onCancel={() => setHealthOpened(false)} title="Dữ liệu & Health" footer={null} width={800} centered destroyOnHidden>
        <HealthTab
          lockInfo={historyManager.lockInfo}
          fsckReport={fsckReport}
          gcReport={gcReport}
          loading={loading}
          onRunFsck={onRunFsck}
          onRunGc={onRunGc}
          onOpenConfirm={setConfirmState}
        />
      </Modal>

      <Modal open={reflogOpened} onCancel={() => setReflogOpened(false)} title="Lịch sử thao tác (Reflog)" footer={null} width={800} centered destroyOnHidden>
        <ReflogTab history={historyManager.historyView} />
      </Modal>

      <Modal open={historyOpened} onCancel={() => setHistoryOpened(false)} title="Lịch sử Snapshot" footer={null} width={800} centered destroyOnHidden>
        <HistoryTab
          history={historyManager.historyView}
          historyLoading={false}
          selectedSnapshotId={historyManager.selectedSnapshotId}
          onSelectSnapshot={historyManager.selectSnapshot}
          onRefreshHistory={() => void historyManager.loadHistory(session.id)}
          onOpenDrawer={() => setDrawerOpened(true)}
        />
      </Modal>

      <SnapshotDrawer
        opened={drawerOpened && !!selectedSnapshot}
        onClose={() => setDrawerOpened(false)}
        selectedSnapshot={selectedSnapshot}
        snapshotDiffs={historyManager.snapshotDiffs}
        selectedSnapshotDiffPath={historyManager.selectedSnapshotDiffPath}
        snapshotDiffText={historyManager.snapshotDiffText}
        loading={loading}
        onSelectSnapshotDiffPath={historyManager.selectSnapshotDiffPath}
        onRestoreSnapshot={async (snapshotId: string) => {
          try {
            await apiRestoreSnapshot(session.id, snapshotId);
            await historyManager.loadHistory(session.id);
            notifications.show({ color: "green", message: "Đã khôi phục snapshot." });
          } catch (error) {
            notifications.show({ color: "red", message: error instanceof Error ? error.message : "Lỗi khôi phục." });
          }
        }}
        onCreateTag={async (snapshotId: string, tagName: string) => {
          try {
            await apiCreateTag(session.id, snapshotId, tagName);
            await historyManager.loadHistory(session.id);
            notifications.show({ color: "green", message: "Đã tạo tag." });
          } catch (error) {
            notifications.show({ color: "red", message: error instanceof Error ? error.message : "Lỗi tạo tag." });
          }
        }}
        onDeleteTag={async (tagName: string) => {
          try {
            await apiDeleteTag(session.id, tagName);
            await historyManager.loadHistory(session.id);
            notifications.show({ color: "green", message: "Đã xóa tag." });
          } catch (error) {
            notifications.show({ color: "red", message: error instanceof Error ? error.message : "Lỗi xóa tag." });
          }
        }}
        onSaveNote={async (snapshotId: string, content: string) => {
          try {
            await apiSaveNote(session.id, snapshotId, content);
            await historyManager.loadHistory(session.id);
            notifications.show({ color: "green", message: "Đã lưu ghi chú." });
          } catch (error) {
            notifications.show({ color: "red", message: error instanceof Error ? error.message : "Lỗi lưu ghi chú." });
          }
        }}
        onDeleteNote={async (snapshotId: string) => {
          try {
            await apiDeleteNote(session.id, snapshotId);
            await historyManager.loadHistory(session.id);
            notifications.show({ color: "green", message: "Đã xóa ghi chú." });
          } catch (error) {
            notifications.show({ color: "red", message: error instanceof Error ? error.message : "Lỗi xóa ghi chú." });
          }
        }}
        onOpenConfirm={setConfirmState}
      />

      <Modal
        open={Boolean(confirmState)}
        onCancel={() => setConfirmState(null)}
        footer={null}
        centered
        width={420}
        destroyOnHidden
        closable={false}
        styles={{ body: { padding: '32px 24px' } }}
      >
        <Flex vertical align="center" gap="large">
          <div style={{ 
            width: 64, 
            height: 64, 
            borderRadius: '50%', 
            background: confirmState?.confirmColor === "red" ? 'var(--bg-danger-subtle)' : 'var(--bg-success-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: confirmState?.confirmColor === "red" ? 'var(--text-danger)' : 'var(--text-success)'
          }}>
            {confirmState?.confirmColor === "red" ? <IconAlertCircle size={36} /> : <IconCheck size={36} />}
          </div>

          <Flex vertical align="center" gap="small">
            <Typography.Title level={4} style={{ margin: 0 }}>{confirmState?.title}</Typography.Title>
            <Typography.Text type="secondary" style={{ textAlign: 'center' }}>
              {confirmState?.description}
            </Typography.Text>
          </Flex>

          {confirmState?.warnings && confirmState.warnings.length > 0 && (
            <div style={{ 
              width: '100%', 
              padding: '12px', 
              background: 'var(--bg-warning-subtle)', 
              borderRadius: 8,
              border: '1px solid var(--border-warning-subtle)'
            }}>
              <ul style={{ margin: 0, paddingLeft: 20, color: 'var(--text-warning)', fontSize: '13px' }}>
                {confirmState.warnings.map((warning: string) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          <Flex gap="small" style={{ width: '100%' }}>
            <Button block size="large" onClick={() => setConfirmState(null)}>Hủy</Button>
            <Button
              block
              size="large"
              type="primary"
              danger={confirmState?.confirmColor === "red"}
              onClick={() => {
                confirmState?.onConfirm();
                setConfirmState(null);
              }}
            >
              {confirmState?.confirmLabel ?? "Xác nhận"}
            </Button>
          </Flex>
        </Flex>
      </Modal>

      <Modal
        open={resetConfirmOpened}
        onCancel={() => setResetConfirmOpened(false)}
        footer={null}
        centered
        width={420}
        destroyOnHidden
        closable={false}
        styles={{ body: { padding: '32px 24px' } }}
      >
        <Flex vertical align="center" gap="large">
          <div style={{ 
            width: 64, 
            height: 64, 
            borderRadius: '50%', 
            background: 'rgba(52, 199, 89, 0.1)', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#34c759'
          }}>
            <IconCheck size={36} />
          </div>

          <Flex vertical align="center" gap="small">
            <Typography.Title level={4} style={{ margin: 0 }}>Áp dụng thay đổi</Typography.Title>
            <Typography.Text type="secondary" style={{ textAlign: 'center' }}>
              Xác nhận lưu {changes.length} thay đổi hiện tại vào snapshot mới. Trạng thái cũ sẽ được lưu vào lịch sử.
            </Typography.Text>
          </Flex>

          <Flex gap="small" style={{ width: '100%' }}>
            <Button block size="large" onClick={() => setResetConfirmOpened(false)}>Quay lại</Button>
            <Button
              block
              size="large"
              type="primary"
              loading={loading}
              onClick={() => { setResetConfirmOpened(false); onResetSnapshot(); }}
            >
              Xác nhận
            </Button>
          </Flex>
        </Flex>
      </Modal>

      <Modal
        open={rollbackAllConfirmOpened}
        onCancel={() => setRollbackAllConfirmOpened(false)}
        footer={null}
        centered
        width={420}
        destroyOnHidden
        closable={false}
        styles={{ body: { padding: '32px 24px' } }}
      >
        <Flex vertical align="center" gap="large">
          <div style={{ 
            width: 64, 
            height: 64, 
            borderRadius: '50%', 
            background: 'rgba(255, 59, 48, 0.1)', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ff3b30'
          }}>
            <IconAlertCircle size={36} />
          </div>

          <Flex vertical align="center" gap="small">
            <Typography.Title level={4} style={{ margin: 0 }}>Hủy bỏ tất cả</Typography.Title>
            <Typography.Text type="secondary" style={{ textAlign: 'center' }}>
              Bạn có chắc chắn muốn hủy bỏ toàn bộ {changes.length} thay đổi? Hành động này sẽ đưa project về trạng thái snapshot gần nhất.
            </Typography.Text>
          </Flex>

          {loading && rollbackAllProgress > 0 && (
            <div style={{ width: '100%' }}>
              <Progress percent={rollbackAllProgress} status="active" strokeColor="#ff3b30" />
            </div>
          )}

          <Flex gap="small" style={{ width: '100%' }}>
            <Button block size="large" onClick={() => setRollbackAllConfirmOpened(false)}>Quay lại</Button>
            <Button
              block
              size="large"
              type="primary"
              danger
              loading={loading}
              onClick={() => { setRollbackAllConfirmOpened(false); onRollbackAll(); }}
            >
              Hủy bỏ ngay
            </Button>
          </Flex>
        </Flex>
      </Modal>
    </Card>
  );
}

/** Render dòng folder rename — backend đã gom thành 1 ChangeEntry đại diện */
function renderDirRenameItem(
  change: ChangeEntry,
  selectedPath: string | null,
  onSelect: (path: string, type: "file" | "folder") => void,
) {
  const dirRename = change.directoryRename!;
  const isSelected = selectedPath === dirRename.newPath;
  return (
    <div
      key={`${dirRename.oldPath}->${dirRename.newPath}`}
      className={`change-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(dirRename.newPath, 'folder')}
    >
      <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
        <IconFolderOpen size={16} style={{ color: "var(--color-info)", flexShrink: 0 }} />
        <Tooltip title={`${dirRename.oldPath} → ${dirRename.newPath}`} mouseEnterDelay={0.5} placement="right">
          <Typography.Text className="change-path" ellipsis>
            <span style={{ color: 'var(--text-muted)', textDecoration: 'line-through' }}>{dirRename.oldPath}</span>
            <span style={{ margin: '0 6px', color: 'var(--color-info)' }}>→</span>
            <span>{dirRename.newPath}</span>
          </Typography.Text>
        </Tooltip>
      </Flex>

      <Flex align="center" gap={4} className="change-meta">
        {change.insertions !== undefined && change.insertions > 0 && (
          <span style={{ color: 'var(--color-success)', fontSize: 11, fontWeight: 600 }}>+{change.insertions}</span>
        )}
        {change.deletions !== undefined && change.deletions > 0 && (
          <span style={{ color: 'var(--color-danger)', fontSize: 11, fontWeight: 600 }}>-{change.deletions}</span>
        )}
        <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>{dirRename.filesAffected} file</Tag>
      </Flex>
    </div>
  );
}

/** Render dòng folder gom nhóm bulk changes (nhiều file added/deleted/modified cùng folder) */
function renderCollapsedDirItem(
  change: ChangeEntry,
  selectedPath: string | null,
  onSelect: (path: string, type: "file" | "folder") => void,
) {
  const isSelected = selectedPath === change.path;

  // Màu và label theo type
  const typeConfig: Record<string, { color: string; label: string }> = {
    added: { color: "var(--color-success)", label: "thêm" },
    deleted: { color: "var(--color-danger)", label: "xóa" },
    modified: { color: "var(--color-warning)", label: "sửa" },
    renamed: { color: "var(--color-info)", label: "đổi tên" },
  };
  const config = typeConfig[change.type] ?? { color: "var(--text-muted)", label: change.type };

  return (
    <div
      key={`collapsed:${change.path}:${change.type}`}
      className={`change-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(change.path, 'folder')}
    >
      <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
        <IconFolder size={16} style={{ color: config.color, flexShrink: 0 }} />
        <Tooltip title={`${change.path}/ — ${change.collapsedCount} file ${config.label}`} mouseEnterDelay={0.5} placement="right">
          <Typography.Text className="change-path" ellipsis>
            {change.path}/
          </Typography.Text>
        </Tooltip>
      </Flex>

      <Flex align="center" gap={4} className="change-meta">
        {change.insertions !== undefined && change.insertions > 0 && (
          <span style={{ color: 'var(--color-success)', fontSize: 11, fontWeight: 600 }}>+{change.insertions}</span>
        )}
        {change.deletions !== undefined && change.deletions > 0 && (
          <span style={{ color: 'var(--color-danger)', fontSize: 11, fontWeight: 600 }}>-{change.deletions}</span>
        )}
        <Tag color={change.type === 'added' ? 'green' : change.type === 'deleted' ? 'red' : 'gold'} style={{ fontSize: 10, margin: 0 }}>
          {change.collapsedCount} file
        </Tag>
      </Flex>
    </div>
  );
}

/** Render dòng file đơn lẻ */
function renderFileItem(
  change: ChangeEntry,
  selectedPath: string | null,
  onSelect: (path: string, type: "file" | "folder") => void,
) {
  const isSelected = selectedPath === change.path;
  return (
    <div
      key={change.path}
      className={`change-item ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(change.path, 'file')}
    >
      <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
        {renderChangeIcon(change)}
        <Tooltip title={change.path} mouseEnterDelay={0.5} placement="right">
          <Typography.Text 
            className="change-path" 
            ellipsis 
            delete={change.type === 'deleted'}
          >
            {change.path}
          </Typography.Text>
        </Tooltip>
      </Flex>
      
      <Flex align="center" gap={4} className="change-meta">
        {change.diffSkipped ? (
          <Tooltip title={change.diffSkipped} mouseEnterDelay={0.3}>
            <Tag color="orange" style={{ fontSize: 9, margin: 0 }}>quá lớn</Tag>
          </Tooltip>
        ) : (
          <>
            {change.insertions !== undefined && change.insertions > 0 && (
              <span style={{ color: 'var(--color-success)', fontSize: 11, fontWeight: 600 }}>
                +{change.insertions}
              </span>
            )}
            {change.deletions !== undefined && change.deletions > 0 && (
              <span style={{ color: 'var(--color-danger)', fontSize: 11, fontWeight: 600 }}>
                -{change.deletions}
              </span>
            )}
          </>
        )}
        {change.isBinary && <Tag style={{ fontSize: 9 }}>bin</Tag>}
      </Flex>
    </div>
  );
}

/** Icon hiển thị theo loại file (extension) — change type đã thể hiện qua tags/màu */
function renderChangeIcon(change: ChangeEntry) {
  return getFileIcon(change.path, 16);
}

/** Trả về icon phù hợp dựa vào phần mở rộng file */
function getFileIcon(filePath: string, size: number) {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? '';
  const style = { color: "var(--color-warning)", flexShrink: 0 as const };

  // TypeScript / JavaScript
  if (['ts', 'tsx', 'mts', 'cts'].includes(ext)) return <IconBrandTypescript size={size} style={{ ...style, color: '#3178c6' }} />;
  if (['js', 'jsx', 'mjs', 'cjs'].includes(ext)) return <IconBrandTypescript size={size} style={{ ...style, color: '#f0db4f' }} />;
  
  // Markup & Style
  if (['html', 'htm'].includes(ext)) return <IconBrandHtml5 size={size} style={{ ...style, color: '#e44d26' }} />;
  if (['css', 'scss', 'sass', 'less'].includes(ext)) return <IconBrandCss3 size={size} style={{ ...style, color: '#264de4' }} />;
  
  // Data & Config
  if (ext === 'json') return <IconJson size={size} style={{ ...style, color: '#a8b1c2' }} />;
  if (['yaml', 'yml', 'toml', 'ini', 'env'].includes(ext)) return <IconSettings size={size} style={style} />;
  if (ext === 'md' || ext === 'mdx') return <IconMarkdown size={size} style={{ ...style, color: '#083fa1' }} />;
  
  // Images
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico'].includes(ext)) return <IconPhoto size={size} style={{ ...style, color: '#9b59b6' }} />;
  
  // Database
  if (['sql', 'sqlite', 'db'].includes(ext)) return <IconDatabase size={size} style={style} />;
  
  // Lock files / Package
  if (filePath.includes('lock') || filePath.includes('.lock')) return <IconLock size={size} style={{ ...style, color: '#a8b1c2' }} />;
  if (filePath === 'package.json' || filePath.endsWith('/package.json')) return <IconPackage size={size} style={{ ...style, color: '#cb3837' }} />;
  
  // Code files
  if (['py', 'go', 'rs', 'java', 'c', 'cpp', 'h', 'rb', 'php', 'sh', 'bash', 'zsh'].includes(ext)) return <IconFileCode size={size} style={style} />;
  
  // Text-like
  if (['txt', 'log', 'csv'].includes(ext)) return <IconFileText size={size} style={style} />;

  // Default
  return <IconEdit size={size} style={style} />;
}
