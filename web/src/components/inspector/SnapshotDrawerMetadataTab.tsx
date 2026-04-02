/**
 * SnapshotDrawerMetadataTab - Tab "Tag & note" trong SnapshotDrawer
 * Hiển thị: tags (add/delete), note (save/delete)
 */

import { useState, useEffect } from "react";
import {
  ActionIcon,
  Badge,
  Button,
  Group,
  Stack,
  Text,
  TextInput,
  Textarea,
} from "@mantine/core";
import {
  IconDeviceFloppy,
  IconTag,
  IconTrash,
} from "@tabler/icons-react";

import type { SessionHistoryView } from "../../api";
import type { ConfirmDialogState } from "./types";
import cardStyles from "../../styles/components/card.module.css";

interface SnapshotDrawerMetadataTabProps {
  selectedSnapshot: SessionHistoryView["snapshots"][0];
  onCreateTag: (snapshotId: string, tag: string) => void;
  onDeleteTag: (tag: string) => void;
  onSaveNote: (snapshotId: string, content: string) => void;
  onDeleteNote: (snapshotId: string) => void;
  onOpenConfirm: (state: ConfirmDialogState) => void;
}

export function SnapshotDrawerMetadataTab({
  selectedSnapshot,
  onCreateTag,
  onDeleteTag,
  onSaveNote,
  onDeleteNote,
  onOpenConfirm,
}: SnapshotDrawerMetadataTabProps) {
  const [tagInput, setTagInput] = useState("");
  const [noteDraft, setNoteDraft] = useState(
    selectedSnapshot?.note?.content ?? ""
  );

  // Reset state khi snapshot thay đổi
  useEffect(() => {
    setTagInput("");
    setNoteDraft(selectedSnapshot?.note?.content ?? "");
  }, [selectedSnapshot?.snapshotId, selectedSnapshot?.note?.content]);

  return (
    <Stack gap="md">
      {/* Tags Card */}
      <div className={cardStyles.inspectorCard}>
        <Stack gap="sm">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Tags
          </Text>
          <Group gap="xs" wrap="wrap">
            {selectedSnapshot.tags.length === 0 ? (
              <Text size="xs" c="dimmed">
                Chưa có tag.
              </Text>
            ) : null}
            {selectedSnapshot.tags.map((tag) => (
              <Badge
                key={tag}
                rightSection={
                  <ActionIcon
                    size={12}
                    variant="transparent"
                    color="blue"
                    onClick={() =>
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
                      })
                    }
                  >
                    <IconTrash size={10} stroke={2} />
                  </ActionIcon>
                }
                size="sm"
                variant="light"
                color="blue"
              >
                {tag}
              </Badge>
            ))}
          </Group>

          <Group align="flex-end" wrap="nowrap">
            <TextInput
              label="Tag mới"
              placeholder="release-v1"
              value={tagInput}
              onChange={(event) => setTagInput(event.currentTarget.value)}
              className={cardStyles.inspectorGrow}
            />
            <Button
              leftSection={<IconTag size={14} stroke={1.8} />}
              disabled={!tagInput.trim()}
              onClick={() =>
                onCreateTag(selectedSnapshot.snapshotId, tagInput.trim())
              }
            >
              Gắn tag
            </Button>
          </Group>
        </Stack>
      </div>

      {/* Note Card */}
      <div className={cardStyles.inspectorCard}>
        <Stack gap="sm">
          <Text size="xs" fw={700} tt="uppercase" c="dimmed">
            Note
          </Text>
          <Textarea
            label="Ghi chú"
            placeholder="Ghi chú cho mốc này"
            minRows={6}
            value={noteDraft}
            onChange={(event) => setNoteDraft(event.currentTarget.value)}
          />
          <Group justify="flex-end">
            <Button
              variant="default"
              disabled={!selectedSnapshot.note}
              leftSection={<IconTrash size={14} stroke={1.8} />}
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
            <Button
              leftSection={<IconDeviceFloppy size={14} stroke={1.8} />}
              onClick={() =>
                onSaveNote(selectedSnapshot.snapshotId, noteDraft.trim())
              }
            >
              Lưu note
            </Button>
          </Group>
        </Stack>
      </div>
    </Stack>
  );
}
