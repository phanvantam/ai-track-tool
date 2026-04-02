import { Flex, Input, List, Modal, Tag, Typography } from "antd";
import { IconBolt, IconFile, IconFolder, IconSearch } from "@tabler/icons-react";
import type { CommandSection } from "../hooks/useCommandPalette";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  results: CommandSection[];
  selectedIndex: number;
}

/**
 * Command palette dùng AntD Modal/Input/List.
 */
export function CommandPalette({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  results,
  selectedIndex,
}: CommandPaletteProps) {
  const allItems = results.flatMap((section) => section.items);

  function getSectionIcon(section: string) {
    if (section === "Files") return <IconFile size={16} />;
    if (section === "Sessions") return <IconFolder size={16} />;
    return <IconBolt size={16} />;
  }

  return (
    <Modal open={isOpen} onCancel={onClose} title="Command Palette" footer={null} centered width={760} destroyOnHidden>
      <Flex vertical gap="middle">
        <Input
          placeholder="Tìm files, sessions, actions..."
          prefix={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          autoFocus
        />

        <div>
          {allItems.length === 0 ? (
            <Typography.Text type="secondary">Không tìm thấy kết quả</Typography.Text>
          ) : (
            results.map((section) => {
              let offset = 0;

              for (const entry of results) {
                if (entry.section === section.section) break;
                offset += entry.items.length;
              }

              return (
                <div key={section.section}>
                  <Flex align="center" gap="small">
                    {getSectionIcon(section.section)}
                    <Tag color="purple">{section.section}</Tag>
                  </Flex>

                  <List
                    dataSource={section.items}
                    renderItem={(item, itemIndex) => {
                      const globalIndex = offset + itemIndex;
                      const selected = globalIndex === selectedIndex;

                      return (
                        <List.Item
                          onClick={() => item.action()}
                        >
                          <Flex justify="space-between" align="center">
                            <Typography.Text>{item.label}</Typography.Text>
                            {item.icon ? <Tag>{item.icon}</Tag> : null}
                          </Flex>
                        </List.Item>
                      );
                    }}
                  />
                </div>
              );
            })
          )}
        </div>

        <Typography.Text type="secondary">↑↓ để di chuyển, Enter để chọn, Esc để đóng</Typography.Text>
      </Flex>
    </Modal>
  );
}
