import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { Alert, Badge, Button, Group, Paper, SegmentedControl, SimpleGrid, Stack, Tabs, Text, TextInput } from "@mantine/core";
import { notifications } from "@mantine/notifications";

import { addSession, getDiff, getState, refreshSession, resetSnapshot, rollback, subscribeSessions, type ChangeEntry, type SessionState } from "./api";
import { ChangeList } from "./components/ChangeList";
import { DiffPanel } from "./components/DiffPanel";
import { Layout } from "./components/Layout";
import { StatusBar } from "./components/StatusBar";

type FilterType = "all" | ChangeEntry["type"];

export default function App() {
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [diffText, setDiffText] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [newPath, setNewPath] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadSessions() {
    const payload = await getState();
    setSessions(payload.sessions);
    setActiveSessionId((current: string | null) => {
      if (current && payload.sessions.some((session) => session.id === current)) {
        return current;
      }

      return payload.sessions[0]?.id ?? null;
    });
  }

  useEffect(() => {
    void loadSessions();
    const unsubscribe = subscribeSessions(
      () => {
        void loadSessions();
      },
      (message) => {
        notifications.show({ color: "red", message });
      },
    );

    return unsubscribe;
  }, []);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const visibleChanges = activeSession
    ? activeSession.changes.filter((change) => (filter === "all" ? true : change.type === filter))
    : [];
  const selectedChange = visibleChanges.find((change) => change.path === selectedPath) ?? null;

  useEffect(() => {
    if (!visibleChanges.some((change: ChangeEntry) => change.path === selectedPath)) {
      setSelectedPath(visibleChanges[0]?.path ?? null);
    }
  }, [selectedPath, visibleChanges]);

  useEffect(() => {
    if (!activeSession || !selectedPath) {
      setDiffText("");
      return;
    }

    void getDiff(activeSession.id, selectedPath)
      .then(setDiffText)
      .catch((error: Error) => {
        setDiffText(error.message);
      });
  }, [activeSession, selectedPath]);

  async function handleAddSession() {
    if (!newPath) {
      return;
    }

    setLoading(true);

    try {
      const session = await addSession(newPath);
      await loadSessions();
      setActiveSessionId(session.id);
      setNewPath("");
      notifications.show({ color: "green", message: "Đã thêm project mới." });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRefresh() {
    if (!activeSession) {
      return;
    }

    setLoading(true);

    try {
      await refreshSession(activeSession.id);
      await loadSessions();
      notifications.show({ color: "green", message: "Đã refresh trạng thái project." });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  function handlePathInputKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void handleAddSession();
    }
  }

  async function handleRollback() {
    if (!activeSession || !selectedPath) {
      return;
    }

    setLoading(true);

    try {
      await rollback(activeSession.id, selectedPath);
      await loadSessions();
      notifications.show({ color: "green", message: `Đã rollback ${selectedPath}` });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  async function handleResetSnapshot() {
    if (!activeSession) {
      return;
    }

    setLoading(true);

    try {
      await resetSnapshot(activeSession.id);
      await loadSessions();
      notifications.show({ color: "green", message: "Đã tạo baseline mới." });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  const helperText = activeSession
    ? `Đang xem ${visibleChanges.length}/${activeSession.changeCount} thay đổi của project hiện tại.`
    : "Thêm project mới để bắt đầu theo dõi thay đổi.";

  const sessionTabs = sessions.map((session: SessionState) => ({
    id: session.id,
    label: session.targetPath.split("/").at(-1) ?? session.targetPath,
    changes: session.changeCount,
  }));

  return (
    <Layout
      header={<StatusBar session={activeSession} />}
      toolbar={
        <Stack gap="sm" w="100%">
          <Paper className="toolbar-card" radius="xl" p="sm" withBorder>
            <Tabs value={activeSessionId} onChange={setActiveSessionId}>
              <Tabs.List>
                {sessionTabs.map((session) => (
                  <Tabs.Tab key={session.id} value={session.id} rightSection={<Badge size="xs">{session.changes}</Badge>}>
                    {session.label}
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs>
          </Paper>
          <Paper className="toolbar-card" radius="xl" p="md" withBorder>
            <Group justify="space-between" align="flex-end" wrap="wrap">
              <Stack gap={6} maw={420}>
                <Text fw={700}>Quản lý project</Text>
                <Text size="sm" c="dimmed">
                  Thêm nhiều đường dẫn để theo dõi trong cùng một giao diện.
                </Text>
                <TextInput
                  value={newPath}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPath(event.currentTarget.value)}
                  onKeyDown={handlePathInputKeyDown}
                  placeholder="/duong/dan/toi/project"
                />
              </Stack>
              <Group gap="sm" align="center" wrap="wrap">
                <Button loading={loading} onClick={() => void handleAddSession()}>
                  Thêm project
                </Button>
                <SegmentedControl
                  data={[
                    { value: "all", label: "Tất cả" },
                    { value: "added", label: "Added" },
                    { value: "modified", label: "Modified" },
                    { value: "deleted", label: "Deleted" },
                  ]}
                  value={filter}
                  onChange={(value) => setFilter(value as FilterType)}
                />
                <Button variant="default" loading={loading} onClick={() => void handleRefresh()}>
                  Refresh
                </Button>
                <Button color="red" disabled={!selectedChange} loading={loading} onClick={() => void handleRollback()}>
                  Rollback
                </Button>
                <Button color="yellow" disabled={!activeSession} loading={loading} onClick={() => void handleResetSnapshot()}>
                  Reset baseline
                </Button>
              </Group>
            </Group>
          </Paper>
        </Stack>
      }
    >
      <Stack gap="md">
        <Alert color={activeSession?.lastError ? "red" : "blue"} radius="xl" variant="light">
          {activeSession?.lastError ?? helperText}
        </Alert>
        {!activeSession ? (
          <Paper className="empty-panel" radius="xl" p="xl" withBorder>
            <Stack gap={8}>
              <Text fw={700} size="lg">
                Chưa có project nào được mở
              </Text>
              <Text c="dimmed">
                Nhập đường dẫn project ở phần trên rồi bấm "Thêm project" để bắt đầu theo dõi thay đổi.
              </Text>
            </Stack>
          </Paper>
        ) : (
          <SimpleGrid cols={{ base: 1, lg: 2 }} spacing="md">
            <ChangeList changes={visibleChanges} selectedPath={selectedPath} onSelect={setSelectedPath} />
            <DiffPanel selectedChange={selectedChange} diff={diffText} />
          </SimpleGrid>
        )}
      </Stack>
    </Layout>
  );
}
