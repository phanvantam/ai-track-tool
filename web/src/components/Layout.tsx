import { AppShell, Group, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";

interface LayoutProps {
  sidebar?: ReactNode;
  headerActions?: ReactNode;
  children: ReactNode;
}

export function Layout({ sidebar, headerActions, children }: LayoutProps) {
  return (
    <AppShell
      padding={0}
      header={{ height: 56 }}
      navbar={sidebar ? { width: 300, breakpoint: "sm", collapsed: { desktop: false, mobile: true } } : undefined}
    >
      <AppShell.Header className="app-header">
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <Text size="sm" fw={700} tt="uppercase" c="violet.4" className="logo-text">
              AI Track
            </Text>
            <Title order={4} fw={600} className="app-title">
              Change Viewer
            </Title>
          </Group>
          <Group gap="sm" wrap="nowrap">
            {headerActions}
            <Text size="xs" c="dimmed">
              Local only
            </Text>
          </Group>
        </Group>
      </AppShell.Header>

      {sidebar ? <AppShell.Navbar className="app-sidebar">{sidebar}</AppShell.Navbar> : null}

      <AppShell.Main className="app-main">
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
