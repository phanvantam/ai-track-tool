import { Alert, Button, Card, Empty, Flex, Modal, Popconfirm, Progress, Tag, Tooltip, Typography, message } from "antd";
import { IconArrowsMaximize, IconArrowsMinimize, IconCopy, IconFile, IconFileText, IconRestore } from "@tabler/icons-react";
import { useState } from "react";
import type { ChangeEntry } from "../api";

interface DiffPanelProps {
  selectedChange: ChangeEntry | null;
  diff: string;
  /** Chế độ xem toàn bộ file */
  fullContext: boolean;
  /** Toggle xem toàn bộ file */
  onToggleFullContext: () => void;
  onRollback: () => void;
  canRollback: boolean;
  loading: boolean;
}

/**
 * Panel hiển thị nội dung diff.
 * Hỗ trợ: copy, fullscreen, khôi phục, xem toàn bộ file, progress bar.
 */
export function DiffPanel({ selectedChange, diff, fullContext, onToggleFullContext, onRollback, canRollback, loading }: DiffPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  /** Copy diff trực tiếp, không cần xác nhận. */
  async function handleCopy() {
    await navigator.clipboard.writeText(diff);
    void message.success("Đã copy diff");
  }

  /** Nội dung diff dùng chung cho cả Card và Modal fullscreen */
  function renderDiffContent() {
    const lines = diff.split("\n");
    const lineInfos = computeLineNumbers(lines);

    return (
      <div className="diff-container">
        {lines.map((line, index) => {
          const info = lineInfos[index];
          const cls = getDiffLineClass(line);
          const isContentLine = cls === "" || cls === "diff-added" || cls === "diff-removed";

          return (
            <pre key={index} className={`diff-line ${cls}`}>
              {isContentLine ? (
                <>
                  <span className="diff-line-num diff-line-num-old">{info?.oldLine ?? ""}</span>
                  <span className="diff-line-num diff-line-num-new">{info?.newLine ?? ""}</span>
                  <span className="diff-line-content">{line || " "}</span>
                </>
              ) : (
                <span className="diff-line-full">{line || " "}</span>
              )}
            </pre>
          );
        })}
      </div>
    );
  }

  /** Các nút thao tác trên thanh tiêu đề */
  function renderActions() {
    if (!selectedChange) return null;

    return (
      <Flex gap="small" style={{ flexShrink: 0 }}>
        {/* Nút xem toàn bộ file */}
        {!selectedChange.diffSkipped && !selectedChange.isBinary && (
          <Tooltip title={fullContext ? "Chỉ xem thay đổi" : "Xem toàn bộ file"}>
            <Button 
              size="small" 
              icon={fullContext ? <IconFileText size={16} /> : <IconFile size={16} />}
              onClick={onToggleFullContext}
              type={fullContext ? "primary" : "default"}
            />
          </Tooltip>
        )}

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
        {/* Tổng số dòng file */}
        {selectedChange.totalLines !== undefined && selectedChange.totalLines > 0 && (
          <Tag style={{ margin: 0, fontSize: 11 }}>
            {selectedChange.totalLines} dòng
          </Tag>
        )}
        <Typography.Text 
          strong 
          ellipsis 
          style={{ color: 'var(--text-primary)', marginLeft: 4 }}
        >
          {selectedChange.path}
        </Typography.Text>
        {selectedChange.isBinary ? <Tag style={{ marginLeft: 8 }}>binary</Tag> : null}
        {fullContext && <Tag color="blue" style={{ marginLeft: 8, fontSize: 10 }}>toàn bộ file</Tag>}
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
        {/* Thanh tiến trình khi đang loading (khôi phục file) */}
        {loading && (
          <div className="diff-progress-bar">
            <Progress 
              percent={100} 
              showInfo={false} 
              status="active" 
              strokeColor={{ from: 'var(--accent-primary)', to: 'var(--accent-secondary)' }}
              size={[undefined as unknown as number, 3]}
            />
          </div>
        )}

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
              {/* Toggle xem toàn bộ file trong fullscreen */}
              {selectedChange && !selectedChange.diffSkipped && !selectedChange.isBinary && (
                <Tooltip title={fullContext ? "Chỉ xem thay đổi" : "Xem toàn bộ file"}>
                  <Button 
                    size="small" 
                    icon={fullContext ? <IconFileText size={16} /> : <IconFile size={16} />}
                    onClick={onToggleFullContext}
                    type={fullContext ? "primary" : "default"}
                  />
                </Tooltip>
              )}
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
        {/* Thanh tiến trình khi đang loading trong fullscreen */}
        {loading && (
          <div className="diff-progress-bar">
            <Progress 
              percent={100} 
              showInfo={false} 
              status="active" 
              strokeColor={{ from: 'var(--accent-primary)', to: 'var(--accent-secondary)' }}
              size={[undefined as unknown as number, 3]}
            />
          </div>
        )}
        {selectedChange && renderDiffContent()}
      </Modal>
    </>
  );
}

interface LineInfo {
  oldLine: number | "";
  newLine: number | "";
}

/**
 * Parse diff output, dựa vào @@ hunk header để tính số dòng cũ (snapshot) / mới (hiện tại).
 * - Context line (bắt đầu bằng " "): tăng cả oldLine và newLine
 * - Added (bắt đầu bằng "+"): chỉ tăng newLine
 * - Removed (bắt đầu bằng "-"): chỉ tăng oldLine
 * - Header / meta: không hiển thị số dòng
 */
function computeLineNumbers(lines: string[]): LineInfo[] {
  const result: LineInfo[] = [];
  let oldLine = 0;
  let newLine = 0;

  for (const line of lines) {
    // Parse hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1]!, 10);
      newLine = parseInt(hunkMatch[2]!, 10);
      result.push({ oldLine: "", newLine: "" });
      continue;
    }

    // Header lines (Index:, ===, +++, ---)
    if (
      line.startsWith("Index:") ||
      line.startsWith("===") ||
      line.startsWith("+++") ||
      line.startsWith("---")
    ) {
      result.push({ oldLine: "", newLine: "" });
      continue;
    }

    // Added line: chỉ hiện số dòng mới
    if (line.startsWith("+")) {
      result.push({ oldLine: "", newLine: newLine });
      newLine++;
      continue;
    }

    // Removed line: chỉ hiện số dòng cũ
    if (line.startsWith("-")) {
      result.push({ oldLine: oldLine, newLine: "" });
      oldLine++;
      continue;
    }

    // Context line (hoặc dòng trống cuối): hiện cả hai
    if (oldLine > 0 || newLine > 0) {
      result.push({ oldLine: oldLine, newLine: newLine });
      oldLine++;
      newLine++;
    } else {
      result.push({ oldLine: "", newLine: "" });
    }
  }

  return result;
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
