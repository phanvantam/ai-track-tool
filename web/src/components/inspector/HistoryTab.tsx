import { Button, Card, Empty, Flex, List, Tag, Typography } from "antd";
import { IconHistory, IconRefresh, IconCircleCheck, IconGitCommit, IconGitBranch, IconClock } from "@tabler/icons-react";
import type { HistoryTabProps } from "./types";
import { countBranchNodes, shortId } from "./helpers";

/**
 * Tab lịch sử snapshot — 100% AntD components.
 * Dùng List + Card thay vì Timeline để tránh CSS constraint của AntD Timeline.
 */
export function HistoryTab({
  history,
  historyLoading,
  selectedSnapshotId,
  onSelectSnapshot,
  onRefreshHistory,
  onOpenDrawer,
}: HistoryTabProps) {
  const snapshots = history?.snapshots ?? [];
  const activeSnapshot = snapshots.find(s => s.isActive);
  const branchCount = countBranchNodes(snapshots);

  return (
    <Flex vertical gap="middle" style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'auto' }}>
      {/* Header - Tinh chỉnh giao diện cao cấp hơn */}
      <Flex
        justify="space-between"
        align="center"
        style={{
          background: 'var(--bg-inset)',
          padding: '10px 16px',
          borderRadius: '12px',
          border: '1px solid var(--border-subtle, #f0f0f0)',
          marginBottom: 4
        }}
      >
        <Flex gap="middle" align="center" wrap="wrap">
          <Flex align="center" gap={6}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 32,
              height: 32,
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              color: 'var(--accent-primary)',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <IconHistory size={18} />
            </div>
            <Flex vertical gap={0}>
              <Typography.Text strong style={{ fontSize: 13, lineHeight: 1.2 }}>
                {snapshots.length}
              </Typography.Text>
              <Typography.Text type="secondary" style={{ fontSize: 11, lineHeight: 1.2 }}>
                mốc lịch sử
              </Typography.Text>
            </Flex>
          </Flex>

          <Flex gap="small" wrap="wrap">
            {branchCount > 0 && (
              <Tag
                icon={<IconGitBranch size={12} style={{ verticalAlign: 'middle' }} />}
                color="blue"
                bordered={false}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  color: 'var(--accent-primary)',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                {branchCount} nhánh
              </Tag>
            )}
            {activeSnapshot && (
              <Tag
                icon={<IconCircleCheck size={12} style={{ verticalAlign: 'middle' }} />}
                color="success"
                bordered={false}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  color: 'var(--color-success)',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Active: <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 'bold' }}>{shortId(activeSnapshot.snapshotId)}</span>
                </span>
              </Tag>
            )}
          </Flex>
        </Flex>
        <Button
          size="small"
          type="text"
          icon={<IconRefresh size={14} />}
          onClick={onRefreshHistory}
          loading={historyLoading}
          className="hover-lift"
          style={{ borderRadius: '6px' }}
        >
          Làm mới
        </Button>
      </Flex>

      {/* Danh sách snapshot */}
      {snapshots.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có dữ liệu lịch sử" />
      ) : (
        <List
          dataSource={snapshots}
          split={false}
          renderItem={(snapshot) => {
            const isSelected = snapshot.snapshotId === selectedSnapshotId;
            const isActive = snapshot.isActive;
            const date = new Date(snapshot.createdAt);
            const stats = snapshot.diffStats;

            return (
              <List.Item style={{ padding: 0, border: 'none', marginBottom: '10px' }}>
                <Card
                  hoverable
                  size="small"
                  onClick={() => { onSelectSnapshot(snapshot.snapshotId); onOpenDrawer(); }}
                  style={{
                    width: '100%',
                    borderLeft: isActive
                      ? '4px solid var(--color-success)'
                      : isSelected
                        ? '4px solid var(--accent-primary)'
                        : '4px solid transparent',
                    background: isSelected ? 'var(--accent-glow)' : undefined,
                  }}
                >
                  <Flex vertical gap={6}>
                    {/* Dòng 1: Icon + ID + Tags + Thời gian */}
                    <Flex align="center" justify="space-between" gap="small" wrap="wrap">
                      <Flex align="center" gap="small" wrap="wrap">
                        {isActive
                          ? <IconCircleCheck size={22} color="var(--color-success)" />
                          : <IconGitCommit size={18} color="var(--text-muted)" />
                        }
                        <Typography.Text strong style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                          {shortId(snapshot.snapshotId)}
                        </Typography.Text>
                        {isActive && <Tag color="success" bordered={false}>ACTIVE</Tag>}
                        {snapshot.tags.map(tag => (
                          <Tag key={tag} color="blue" bordered={false}>{tag}</Tag>
                        ))}
                      </Flex>
                      <Typography.Text type="secondary" style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <IconClock size={12} />
                        {date.toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                        {' · '}
                        {date.toLocaleDateString("vi-VN")}
                      </Typography.Text>
                    </Flex>

                    {/* Dòng 2: Mô tả */}
                    <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                      {snapshot.note?.content || snapshot.summary || "Không có mô tả."}
                    </Typography.Text>

                    {/* Dòng 3: Stats */}
                    <Flex gap="small" align="center">
                      <Tag style={{ margin: 0 }}>{snapshot.fileCount} files</Tag>
                      {stats && (stats.added > 0 || stats.modified > 0 || stats.deleted > 0) && (
                        <Flex gap={6}>
                          {stats.added > 0 && <Tag color="green" bordered={false} style={{ margin: 0 }}>+{stats.added}</Tag>}
                          {stats.modified > 0 && <Tag color="gold" bordered={false} style={{ margin: 0 }}>~{stats.modified}</Tag>}
                          {stats.deleted > 0 && <Tag color="red" bordered={false} style={{ margin: 0 }}>-{stats.deleted}</Tag>}
                        </Flex>
                      )}
                    </Flex>
                  </Flex>
                </Card>
              </List.Item>
            );
          }}
        />
      )}
    </Flex>
  );
}
