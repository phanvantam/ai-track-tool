import { Button, Card, Flex, List, Tag, Typography } from "antd";
import { IconRefresh } from "@tabler/icons-react";
import type { HistoryTabProps } from "./types";
import { countBranchNodes, countChildSnapshots, shortId } from "./helpers";

/**
 * Tab history bằng AntD Card/List.
 */
export function HistoryTab({
  history,
  historyLoading,
  selectedSnapshotId,
  onSelectSnapshot,
  onRefreshHistory,
  onOpenDrawer,
}: HistoryTabProps) {
  const selectedSnapshot =
    history?.snapshots.find((snapshot) => snapshot.snapshotId === selectedSnapshotId) ??
    history?.snapshots.find((snapshot) => snapshot.isActive) ??
    null;

  return (
    <div style={{ height: 'calc(100vh - 200px)', overflow: 'auto', padding: 16 }}>
      <Flex vertical gap="middle">
        <Flex justify="space-between" align="center">
          <Flex vertical gap={2}>
            <Typography.Text type="secondary">Snapshot history</Typography.Text>
            <Typography.Text>Bấm một mốc để mở drawer chi tiết.</Typography.Text>
          </Flex>

          <Button size="small" icon={<IconRefresh size={14} />} onClick={onRefreshHistory} loading={historyLoading}>
            Tải lại
          </Button>
        </Flex>

        <Card size="small">
          <Flex justify="space-between" align="start">
            <Flex vertical gap={2}>
              <Typography.Text type="secondary">Sơ đồ mốc</Typography.Text>
              <Typography.Text>Bấm một node để mở chi tiết mốc.</Typography.Text>
            </Flex>

            <Flex gap="small" wrap="wrap">
              <Tag>{history?.snapshots.length ?? 0} mốc</Tag>
              {countBranchNodes(history?.snapshots ?? []) > 0 ? (
                <Tag color="cyan">{countBranchNodes(history?.snapshots ?? [])} điểm tách nhánh</Tag>
              ) : null}
            </Flex>
          </Flex>

          <List
            size="small"
            dataSource={history?.snapshots.slice(0, 20) ?? []}
            locale={{ emptyText: "Chưa có history." }}
            renderItem={(snapshot) => {
              const childCount = countChildSnapshots(history?.snapshots ?? [], snapshot.snapshotId);
              const isSelected = snapshot.snapshotId === selectedSnapshot?.snapshotId;

              return (
                <List.Item style={{ padding: '8px 0' }}>
                  <Card
                    hoverable
                    size="small"
                    style={{ 
                      width: '100%',
                      borderColor: isSelected ? '#1677ff' : undefined 
                    }}
                    onClick={() => {
                      onSelectSnapshot(snapshot.snapshotId);
                      onOpenDrawer();
                    }}
                  >
                    <Flex vertical gap="small">
                      <Flex justify="space-between" align="start">
                        <Flex vertical gap={4}>
                          <Flex gap="small" wrap="wrap">
                            <Typography.Text strong>{shortId(snapshot.snapshotId)}</Typography.Text>
                            {snapshot.isActive ? <Tag color="purple">hiện tại</Tag> : null}
                            {isSelected && !snapshot.isActive ? <Tag color="blue">đang xem</Tag> : null}
                            {snapshot.tags.slice(0, 2).map((tag) => (
                              <Tag key={tag} color="blue">
                                {tag}
                              </Tag>
                            ))}
                          </Flex>
                          <Typography.Text type="secondary">
                            {new Date(snapshot.createdAt).toLocaleString("vi-VN")}
                          </Typography.Text>
                        </Flex>
                      </Flex>

                      <Flex gap="small" wrap="wrap">
                        {snapshot.parentSnapshotId ? (
                          <Tag>cha {shortId(snapshot.parentSnapshotId)}</Tag>
                        ) : (
                          <Tag>mốc gốc</Tag>
                        )}
                        <Tag>{snapshot.fileCount} file</Tag>
                        {childCount > 1 ? (
                          <Tag color="cyan">{childCount} nhánh con</Tag>
                        ) : childCount === 1 ? (
                          <Tag>1 mốc con</Tag>
                        ) : (
                          <Tag>mốc lá</Tag>
                        )}
                      </Flex>

                      <Typography.Paragraph ellipsis={{ rows: 1 }}>
                        {snapshot.note?.content || snapshot.summary || "Không có mô tả cho mốc này."}
                      </Typography.Paragraph>
                    </Flex>
                  </Card>
                </List.Item>
              );
            }}
          />
        </Card>
      </Flex>
    </div>
  );
}
