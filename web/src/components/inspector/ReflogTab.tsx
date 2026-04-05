import { Card, Flex, List, Tag, Typography } from "antd";
import type { ReflogTabProps } from "./types";

/**
 * Tab reflog bằng AntD List.
 */
export function ReflogTab({ history }: ReflogTabProps) {
  return (
    <div>
      <Flex vertical gap="middle">
        <Card title="Thống kê reflog">
          <Flex gap="small" wrap="wrap">
            <Tag>Total {history?.reflogStats.totalEntries ?? 0}</Tag>
            {Object.entries(history?.reflogStats.actionCounts ?? {}).map(([action, count]) => (
              <Tag key={action} color="blue">
                {action}: {count}
              </Tag>
            ))}
          </Flex>
        </Card>

        <Card title="Reflog entries">
          <List
            dataSource={history?.reflog ?? []}
            locale={{ emptyText: "Reflog trống." }}
            renderItem={(entry) => (
              <List.Item>
                <Flex vertical gap={4}>
                  <Flex gap="small" wrap="wrap">
                    <Tag>{entry.action}</Tag>
                    <Typography.Text type="secondary">
                      {new Date(entry.timestamp).toLocaleString("vi-VN")}
                    </Typography.Text>
                  </Flex>
                  <Typography.Text>
                    {entry.reason ?? `${entry.fromSnapshotId ?? "-"} -> ${entry.toSnapshotId ?? "-"}`}
                  </Typography.Text>
                  {entry.metadata ? (
                    <Typography.Text type="secondary">
                      {Object.entries(entry.metadata)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")}
                    </Typography.Text>
                  ) : null}
                </Flex>
              </List.Item>
            )}
          />
        </Card>
      </Flex>
    </div>
  );
}
