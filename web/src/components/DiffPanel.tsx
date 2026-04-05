import { Alert, Button, Card, Empty, Flex, Modal, Popconfirm, Tag, Tooltip, Typography, message } from "antd";
import { IconArrowsMaximize, IconArrowsMinimize, IconCopy, IconRestore } from "@tabler/icons-react";
import { useState } from "react";
import type { ChangeEntry } from "../api";

interface DiffPanelProps {
  selectedChange: ChangeEntry | null;
  diff: string;
  onRollback: () => void;
  canRollback: boolean;
  loading: boolean;
}

/**
 * Panel hiển thị nội dung diff với khả năng copy, fullscreen và khôi phục file.
 */
export function DiffPanel({ selectedChange, diff, onRollback, canRollback, loading }: DiffPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  /** Copy diff trực tiếp, không cần xác nhận. */
  async function handleCopy() {
    await navigator.clipboard.writeText(diff);
    void message.success("Đã copy diff");
  }

  /** Nội dung diff dùng chung cho cả Card và Modal fullscreen */
  function renderDiffContent() {
    return (
      <div className="diff-container">
        {diff.split("\n").map((line, index) => (
          <pre 
            key={index}
            className={`diff-line ${getDiffLineClass(line)}`}
          >
            {line || " "}
          </pre>
        ))}
      </div>
    );
  }

  /** Các nút thao tác trên thanh tiêu đề */
  function renderActions() {
    if (!selectedChange) return null;

    return (
      <Flex gap="small" style={{ flexShrink: 0 }}>
        <Popconfirm
          title="Khôi phục file này?"
          description="Nội dung file sẽ được phục hồi từ snapshot. Không thể hoàn tác."
          onConfirm={onRollback}
          okText="Khôi phục"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
          placement="bottomRight"
        >
          <Tooltip title="Khôi phục file này">
            <Button size="small" danger icon={<IconRestore size={16} />} disabled={!canRollback} loading={loading} />
          </Tooltip>
        </Popconfirm>

        <Tooltip title="Copy diff">
          <Button size="small" icon={<IconCopy size={16} />} onClick={() => void handleCopy()} />
        </Tooltip>

        <Tooltip title={isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}>
          <Button 
            size="small" 
            icon={isFullscreen ? <IconArrowsMinimize size={16} /> : <IconArrowsMaximize size={16} />} 
            onClick={() => setIsFullscreen(true)} 
          />
        </Tooltip>
      </Flex>
    );
  }

  /** Thông tin file hiển thị trên thanh tiêu đề */
  function renderTitle() {
    if (!selectedChange) return null;

    return (
      <>
        {selectedChange.insertions !== undefined && selectedChange.insertions > 0 && (
          <span style={{ color: 'var(--color-success)', fontSize: 13, fontWeight: 700 }}>
            +{selectedChange.insertions}
          </span>
        )}
        {selectedChange.deletions !== undefined && selectedChange.deletions > 0 && (
          <span style={{ color: 'var(--color-danger)', fontSize: 13, fontWeight: 700 }}>
            -{selectedChange.deletions}
          </span>
        )}
        <Typography.Text 
          strong 
          ellipsis 
          style={{ color: 'var(--text-primary)', marginLeft: 4 }}
        >
          {selectedChange.path}
        </Typography.Text>
        {selectedChange.isBinary ? <Tag style={{ marginLeft: 8 }}>binary</Tag> : null}
      </>
    );
  }

  return (
    <>
      <Card 
        title={
          <Flex justify="space-between" align="center" style={{ padding: '10px 0' }}>
            <Flex align="center" gap="small" style={{ flex: 1, minWidth: 0 }}>
              {renderTitle()}
            </Flex>
            {renderActions()}
          </Flex>
        }
        style={{ height: '100%', background: 'var(--bg-secondary)', borderRadius: 0, border: 'none', display: 'flex', flexDirection: 'column' }}
        bodyStyle={{ padding: 0, flex: 1, overflow: 'hidden', borderRadius: 0, display: 'flex', flexDirection: 'column' }}
      >
        {!selectedChange ? (
          <Flex align="center" justify="center" style={{ height: '100%', opacity: 0.5 }}>
            <Empty 
              description="Chọn một file để xem thay đổi" 
              image={Empty.PRESENTED_IMAGE_SIMPLE} 
            />
          </Flex>
        ) : selectedChange.diffSkipped ? (
          <Flex align="center" justify="center" style={{ height: '100%', padding: 24 }}>
            <Alert
              type="warning"
              showIcon
              message="Không hiển thị diff"
              description={selectedChange.diffSkipped}
              style={{ maxWidth: 420 }}
            />
          </Flex>
        ) : (
          renderDiffContent()
        )}
      </Card>

      {/* Modal fullscreen để xem diff toàn màn hình */}
      <Modal
        open={isFullscreen}
        onCancel={() => setIsFullscreen(false)}
        title={
          <Flex justify="space-between" align="center" style={{ paddingRight: 32, marginBottom: 8 }}>
            <Flex align="center" gap="small" style={{ flex: 1, minWidth: 0 }}>
              {renderTitle()}
            </Flex>
            <Flex gap="small">
              <Tooltip title="Copy diff">
                <Button size="small" icon={<IconCopy size={16} />} onClick={() => void handleCopy()} />
              </Tooltip>
              <Tooltip title="Đóng">
                <Button size="small" icon={<IconArrowsMinimize size={16} />} onClick={() => setIsFullscreen(false)} />
              </Tooltip>
            </Flex>
          </Flex>
        }
        footer={null}
        width="95vw"
        style={{ top: 20 }}
        styles={{ body: { height: 'calc(90vh - 55px)', padding: 0, overflow: 'hidden' } }}
        destroyOnHidden
      >
        {selectedChange && renderDiffContent()}
      </Modal>
    </>
  );
}

function getDiffLineClass(line: string): string {
  if (line.startsWith("@@")) return "diff-meta";
  if (line.startsWith("+") && !line.startsWith("+++")) return "diff-added";
  if (line.startsWith("-") && !line.startsWith("---")) return "diff-removed";
  if (line.startsWith("Index:") || line.startsWith("===") || line.startsWith("+++") || line.startsWith("---")) {
    return "diff-header";
  }
  return "";
}
