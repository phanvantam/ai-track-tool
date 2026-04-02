import React from "react";
import { Modal, TextInput, Group, Text, Stack, Box, Badge } from "@mantine/core";
import { IconSearch, IconFile, IconFolder, IconBolt } from "@tabler/icons-react";
import type { CommandSection } from "../hooks/useCommandPalette";
import styles from "./CommandPalette.module.css";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  results: CommandSection[];
  selectedIndex: number;
}

/**
 * CommandPalette component - Modal search interface cho commands, files, sessions.
 * Mở với Ctrl+K, điều hướng với Arrow keys, chọn với Enter.
 */
export function CommandPalette({
  isOpen,
  onClose,
  searchQuery,
  onSearchChange,
  results,
  selectedIndex,
}: CommandPaletteProps) {
  // Flatten all items để track selected index
  const allItems = results.flatMap((s) => s.items);

  const getIconForSection = (section: string) => {
    switch (section) {
      case "Files":
        return <IconFile size={16} />;
      case "Sessions":
        return <IconFolder size={16} />;
      case "Actions":
        return <IconBolt size={16} />;
      default:
        return null;
    }
  };

  return (
    <Modal
      opened={isOpen}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconSearch size={18} />
          <span>Command Palette</span>
        </Group>
      }
      centered
      size="lg"
      classNames={{
        content: styles.modalContent,
        header: styles.modalHeader,
        body: styles.modalBody,
      }}
    >
      <Stack gap="md">
        <TextInput
          placeholder="Tìm files, sessions, actions... (Esc để đóng)"
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          autoFocus
          classNames={{
            input: styles.searchInput,
          }}
        />

        <Box className={styles.resultsList}>
          {allItems.length === 0 ? (
            <Text c="dimmed" ta="center" py="lg">
              Không tìm thấy kết quả
            </Text>
          ) : (
            results.map((section) => (
              <div key={section.section}>
                <Group gap="xs" mb="xs">
                  {getIconForSection(section.section)}
                  <Badge size="sm" variant="light">
                    {section.section}
                  </Badge>
                </Group>

                <Stack gap="xs" mb="lg">
                  {section.items.map((item, itemIndex) => {
                    // Tính toán global index
                    const globalIndex = results
                      .slice(0, results.indexOf(section))
                      .reduce((acc, s) => acc + s.items.length, 0) + itemIndex;

                    return (
                      <Box
                        key={item.id}
                        className={`${styles.commandItem} ${
                          globalIndex === selectedIndex ? styles.selected : ""
                        }`}
                        onClick={() => item.action()}
                      >
                        <Group gap="xs" justify="space-between">
                          <Text size="sm">{item.label}</Text>
                          {item.icon && (
                            <Badge size="xs" variant="default">
                              {item.icon}
                            </Badge>
                          )}
                        </Group>
                      </Box>
                    );
                  })}
                </Stack>
              </div>
            ))
          )}
        </Box>

        <Text size="xs" c="dimmed">
          ↑↓ để di chuyển · Enter để chọn · Esc để đóng
        </Text>
      </Stack>
    </Modal>
  );
}
