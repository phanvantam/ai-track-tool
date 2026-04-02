import { useEffect, useState, type ChangeEvent } from "react";
import { Button, Card, Flex, Input, Tag, Typography } from "antd";
import { IconDeviceFloppy, IconTag, IconTrash } from "@tabler/icons-react";
import type { SessionHistoryView } from "../../api";
import type { ConfirmDialogState } from "./types";

interface SnapshotDrawerMetadataTabProps {
  selectedSnapshot: SessionHistoryView["snapshots"][0];
  onCreateTag: (snapshotId: string, tag: string) => void;
  onDeleteTag: (tag: string) => void;
  onSaveNote: (snapshotId: string, content: string) => void;
  onDeleteNote: (snapshotId: string) => void;
  onOpenConfirm: (state: ConfirmDialogState) => void;
}

/**
 * Tab tag và note bằng AntD.
 */
export function SnapshotDrawerMetadataTab({
  selectedSnapshot,
  onCreateTag,
  onDeleteTag,
  onSaveNote,
  onDeleteNote,
  onOpenConfirm,
}: SnapshotDrawerMetadataTabProps) {
  const [tagInput, setTagInput] = useState("");
  const [noteDraft, setNoteDraft] = useState(selectedSnapshot?.note?.content ?? "");

  useEffect(() => {
    setTagInput("");
    setNoteDraft(selectedSnapshot?.note?.content ?? "");
  }, [selectedSnapshot?.snapshotId, selectedSnapshot?.note?.content]);

  return (
    <Flex vertical gap="middle">
      <Card title="Tags">
        <Flex vertical gap="middle">
          <Flex gap="small" wrap="wrap">
            {selectedSnapshot.tags.length === 0 ? <Typography.Text type="secondary">Chưa có tag.</Typography.Text> : null}
            {selectedSnapshot.tags.map((tag) => (
              <Tag
                key={tag}
                color="blue"
                closeIcon={<IconTrash size={12} />}
                onClose={(event) => {
                  event.preventDefault();
                  onOpenConfirm({
                    title: "Xác nhận xóa tag",
                    description: `Tag ${tag} sẽ bị gỡ khỏi mốc đã chọn.`,
                    warnings: [
                      "Tag này sẽ biến mất khỏi history UI.",
                      "Reflog vẫn ghi lại hành động xóa tag.",
                      "Nếu cần lại, bạn phải tạo tag mới thủ công.",
                    ],
                    confirmLabel: "Xóa tag",
                    confirmColor: "red",
                    onConfirm: () => onDeleteTag(tag),
                  });
                }}
              >
                {tag}
              </Tag>
            ))}
          </Flex>

          <Flex gap="small" align="end">
            <div>
              <Typography.Text type="secondary">Tag mới</Typography.Text>
              <Input
                placeholder="release-v1"
                value={tagInput}
                onChange={(event: ChangeEvent<HTMLInputElement>) => setTagInput(event.currentTarget.value)}
              />
            </div>
            <Button icon={<IconTag size={14} />} disabled={!tagInput.trim()} onClick={() => onCreateTag(selectedSnapshot.snapshotId, tagInput.trim())}>
              Gắn tag
            </Button>
          </Flex>
        </Flex>
      </Card>

      <Card title="Note">
        <Flex vertical gap="middle">
          <Input.TextArea
            placeholder="Ghi chú cho mốc này"
            autoSize={{ minRows: 6 }}
            value={noteDraft}
            onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setNoteDraft(event.currentTarget.value)}
          />
          <Flex justify="end" gap="small">
            <Button
              icon={<IconTrash size={14} />}
              disabled={!selectedSnapshot.note}
              onClick={() =>
                onOpenConfirm({
                  title: "Xác nhận xóa note",
                  description: "Note của mốc này sẽ bị xóa.",
                  warnings: [
                    "Nội dung ghi chú hiện tại sẽ mất.",
                    "History mốc vẫn giữ nguyên.",
                    "Bạn có thể tạo note mới sau đó nếu cần.",
                  ],
                  confirmLabel: "Xóa note",
                  confirmColor: "red",
                  onConfirm: () => onDeleteNote(selectedSnapshot.snapshotId),
                })
              }
            >
              Xóa note
            </Button>
            <Button type="primary" icon={<IconDeviceFloppy size={14} />} onClick={() => onSaveNote(selectedSnapshot.snapshotId, noteDraft.trim())}>
              Lưu note
            </Button>
          </Flex>
        </Flex>
      </Card>
    </Flex>
  );
}
