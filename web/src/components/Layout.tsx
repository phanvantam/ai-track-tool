import { AppShell, Badge, Container, Group, Stack, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface LayoutProps {
  header: ReactNode;
  toolbar: ReactNode;
  children: ReactNode;
}

export function Layout({ header, toolbar, children }: LayoutProps) {
  return (
    <AppShell padding="md" header={{ height: 214 }}>
      <AppShell.Header className="shell-header">
        <Container size="xl" h="100%" py="md">
          <Stack gap="md" h="100%" justify="center">
            <Group justify="space-between" align="flex-start">
              <Stack gap={4}>
                <Text size="xs" fw={700} tt="uppercase" c="violet.2">
                  AI Track
                </Text>
                <Title order={2} c="white">
                  Theo dõi thay đổi AI bằng giao diện web
                </Title>
                <Text c="gray.3" size="sm">
                  Xem diff, rollback và quản lý nhiều project trong cùng một màn hình.
                </Text>
              </Stack>
              <Badge radius="xl" variant="light" color="violet">
                Local only
              </Badge>
            </Group>
            {header}
            {toolbar}
          </Stack>
        </Container>
      </AppShell.Header>
      <AppShell.Main>
        <Container size="xl">{children}</Container>
      </AppShell.Main>
    </AppShell>
  );
}
