import { AppShell, Group, Text, Title } from "@mantine/core";
import type { ReactNode } from "react";
import layoutStyles from "../styles/layout.module.css";

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
      <AppShell.Header className={layoutStyles.appHeader}>
        <Group h="100%" px="lg" justify="space-between">
          <Group gap="sm">
            <Text size="sm" fw={700} tt="uppercase" c="violet.4" className={layoutStyles.logoText}>
              AI Track
            </Text>
            <Title order={4} fw={600} className={layoutStyles.appTitle}>
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

      {sidebar ? <AppShell.Navbar className={layoutStyles.appSidebar}>{sidebar}</AppShell.Navbar> : null}

      <AppShell.Main className={layoutStyles.appMain}>
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
