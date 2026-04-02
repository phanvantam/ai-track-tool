import { useEffect, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { ActionIcon, Button, Group, Modal, Progress, Stack, Text, TextInput, Tooltip } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import { IconAlertTriangle, IconFolderPlus, IconHelpCircle, IconInfoCircle } from "@tabler/icons-react";

import { addSession, getConfig, getDiff, getState, pauseSession, refreshSession, removeSession, resetSnapshot, resumeSession, rollback, subscribeSessions, updateConfig, type ConfigPayload, type SessionState } from "./api";
import { DiffPanel } from "./components/DiffPanel";
import { FileTree } from "./components/FileTree";
import { Layout } from "./components/Layout";
import { ProjectToolbar } from "./components/ProjectToolbar";

export default function App() {
  const [sessions, setSessions] = useState<SessionState[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedPathType, setSelectedPathType] = useState<"file" | "folder" | null>(null);
  const [diffText, setDiffText] = useState("");
  const [newPath, setNewPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [addingSession, setAddingSession] = useState(false);
  const [addProjectOpened, setAddProjectOpened] = useState(false);
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [addProgress, setAddProgress] = useState(12);
  const [config, setConfig] = useState<ConfigPayload | null>(null);
  const [storageDirInput, setStorageDirInput] = useState("");
  const [savingConfig, setSavingConfig] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [removeConfirmOpened, setRemoveConfirmOpened] = useState(false);
  const [rollbackConfirmOpened, setRollbackConfirmOpened] = useState(false);
  const [rollbackAllProgress, setRollbackAllProgress] = useState(0);
  const [guideOpened, setGuideOpened] = useState(false);

  async function loadSessions() {
    const payload = await getState();
    setSessions(payload.sessions);
    setActiveSessionId((current) => {
      if (current && payload.sessions.some((session) => session.id === current)) {
        return current;
      }

      return payload.sessions[0]?.id ?? null;
    });
  }

  async function loadConfig() {
    setConfigLoading(true);
    setConfigError(null);

    try {
      const payload = await getConfig();
      setConfig(payload);
      setStorageDirInput(payload.config.storageDir ?? "");
    } catch (error) {
      setConfigError(error instanceof Error ? error.message : "Không tải được cấu hình từ backend.");
    } finally {
      setConfigLoading(false);
    }
  }

  useEffect(() => {
    void loadSessions();
    void loadConfig();
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

  useEffect(() => {
    if (settingsOpened && !config && !configLoading) {
      void loadConfig();
    }
  }, [settingsOpened, config, configLoading]);

  useEffect(() => {
    if (!addingSession) {
      setAddProgress(12);
      return;
    }

    const timer = window.setInterval(() => {
      setAddProgress((current) => (current >= 92 ? current : Math.min(current + 9, 92)));
    }, 180);

    return () => {
      window.clearInterval(timer);
    };
  }, [addingSession]);

  const activeSession = sessions.find((session) => session.id === activeSessionId) ?? null;
  const selectedChange = selectedPathType === "file"
    ? activeSession?.changes.find((change) => change.path === selectedPath) ?? null
    : null;
  const selectedFolderChanges = selectedPathType === "folder" && activeSession && selectedPath
    ? activeSession.changes.filter((change) => change.path === selectedPath || change.path.startsWith(`${selectedPath}/`) || change.oldPath === selectedPath || change.oldPath?.startsWith(`${selectedPath}/`))
    : [];

  useEffect(() => {
    if (!activeSession || !selectedPath || selectedPathType !== "file") {
      setDiffText("");
      return;
    }

    void getDiff(activeSession.id, selectedPath)
      .then(setDiffText)
      .catch((error: Error) => {
        setDiffText(error.message);
      });
  }, [activeSession, selectedPath, selectedPathType]);

  useEffect(() => {
    if (!activeSession || !selectedPath) {
      setSelectedPathType(null);
      return;
    }

    const nextType = activeSession.changes.some((change) => change.path === selectedPath) ? "file" : "folder";
    setSelectedPathType(nextType);
  }, [activeSession, selectedPath]);

  async function handleAddSession() {
    if (!newPath) {
      return;
    }

    setAddingSession(true);

    try {
      const session = await addSession(newPath);
      setAddProgress(100);
      await loadSessions();
      setActiveSessionId(session.id);
      setNewPath("");
      setAddProjectOpened(false);
      notifications.show({ color: "green", message: "Đã thêm project mới." });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setAddingSession(false);
    }
  }

  async function handleSaveConfig() {
    setSavingConfig(true);

    try {
      const payload = await updateConfig(storageDirInput.trim() || null);
      setConfig(payload);
      setConfigError(null);
      setSettingsOpened(false);
      notifications.show({ color: "green", message: "Đã cập nhật cấu hình lưu trữ." });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setSavingConfig(false);
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

    setRollbackConfirmOpened(false);
    setLoading(true);

    try {
      await rollback(activeSession.id, selectedPath);
      await loadSessions();
      notifications.show({ color: "green", message: `Đã khôi phục ${selectedPath}` });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  function handleRollbackClick() {
    setRollbackConfirmOpened(true);
  }

  async function handleRollbackAll() {
    if (!activeSession || activeSession.changes.length === 0) {
      return;
    }

    setLoading(true);
    setRollbackAllProgress(0);

    try {
      const totalFiles = activeSession.changes.length;
      
      // Rollback tất cả files theo thứ tự
      for (let i = 0; i < totalFiles; i++) {
        const change = activeSession.changes[i];
        await rollback(activeSession.id, change.path);
        setRollbackAllProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
      
      await loadSessions();
      notifications.show({ color: "green", message: `Đã khôi phục tất cả ${totalFiles} file` });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setLoading(false);
      setRollbackAllProgress(0);
    }
  }

  async function handleRollbackFolder() {
    if (!activeSession || !selectedPath || selectedPathType !== "folder" || selectedFolderChanges.length === 0) {
      return;
    }

    setLoading(true);

    try {
      for (const change of selectedFolderChanges) {
        await rollback(activeSession.id, change.path);
      }
      await loadSessions();
      notifications.show({ color: "green", message: `Đã khôi phục thư mục ${selectedPath}` });
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
      notifications.show({ color: "green", message: "Đã áp dụng thay đổi, tạo baseline mới." });
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

  async function handlePause() {
    if (!activeSession) {
      return;
    }

    setLoading(true);

    try {
      await pauseSession(activeSession.id);
      await loadSessions();
      notifications.show({ color: "green", message: "Đã tạm dừng theo dõi project." });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  async function handleResume() {
    if (!activeSession) {
      return;
    }

    setLoading(true);

    try {
      await resumeSession(activeSession.id);
      await loadSessions();
      notifications.show({ color: "green", message: "Đã tiếp tục theo dõi project." });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemove() {
    if (!activeSession) {
      return;
    }

    setRemoveConfirmOpened(false);
    setLoading(true);

    try {
      await removeSession(activeSession.id);
      await loadSessions();
      notifications.show({ color: "green", message: "Đã xóa project khỏi danh sách." });
    } catch (error) {
      notifications.show({ color: "red", message: error instanceof Error ? error.message : "unknown" });
    } finally {
      setLoading(false);
    }
  }

  function handleRemoveClick() {
    setRemoveConfirmOpened(true);
  }

  const headerActions = (
    <Group gap="xs" wrap="nowrap">
      <Tooltip label="Hướng dẫn sử dụng" position="bottom">
        <ActionIcon variant="light" size="lg" radius="md" onClick={() => setGuideOpened(true)} aria-label="Mở hướng dẫn sử dụng">
          <IconHelpCircle size={18} stroke={1.8} />
        </ActionIcon>
      </Tooltip>
      <ProjectToolbar
        sessions={sessions}
        activeSessionId={activeSessionId}
        loading={loading}
        onSessionChange={setActiveSessionId}
        onAddProject={() => setAddProjectOpened(true)}
        onSettings={() => setSettingsOpened(true)}
        onRefresh={() => void handleRefresh()}
        onPause={() => void handlePause()}
        onResume={() => void handleResume()}
        onRemove={handleRemoveClick}
      />
    </Group>
  );

  const mainContent = !activeSession ? (
    <div className="empty-state-fullscreen">
      <Stack gap="xl" align="center">
        <div className="empty-state-icon">
          <IconFolderPlus size={64} stroke={1.5} />
        </div>
        <Stack gap="sm" align="center">
          <Text size="xl" fw={700}>
            Chưa có project nào
          </Text>
          <Text c="dimmed" size="sm" ta="center" maw={400}>
            Thêm project đầu tiên để bắt đầu theo dõi thay đổi code của bạn
          </Text>
        </Stack>
        <Button size="md" leftSection={<IconFolderPlus size={18} />} onClick={() => setAddProjectOpened(true)}>
          Thêm project đầu tiên
        </Button>
      </Stack>
    </div>
  ) : (
    <FileTree
      session={activeSession}
      changes={activeSession.changes}
      selectedPath={selectedPath}
      selectedPathType={selectedPathType}
      selectedFolderChangeCount={selectedFolderChanges.length}
      onSelect={(path, type) => {
        setSelectedPath(path);
        setSelectedPathType(type);
      }}
      onResetSnapshot={() => void handleResetSnapshot()}
      onRollbackAll={() => void handleRollbackAll()}
      onRollbackFolder={() => void handleRollbackFolder()}
      loading={loading}
      rollbackAllProgress={rollbackAllProgress}
    />
  );

  return (
    <>
      <Layout headerActions={headerActions}>
        {mainContent}
        <DiffPanel selectedChange={selectedChange} diff={diffText} onRollback={handleRollbackClick} canRollback={!!selectedChange} loading={loading} />
      </Layout>

      <Modal opened={guideOpened} onClose={() => setGuideOpened(false)} title="Hướng dẫn sử dụng" centered radius="md" size="lg" classNames={{ content: "project-modal", header: "project-modal-header", title: "project-modal-title" }}>
        <Stack gap="lg">
          <div className="guide-card">
            <Text fw={600} mb={6}>Bắt đầu nhanh</Text>
            <Stack gap={6}>
              <Text size="sm">Chọn project ở thanh trên cùng.</Text>
              <Text size="sm">Chọn file hoặc thư mục ở cột bên trái.</Text>
              <Text size="sm">Xem chi tiết thay đổi ở khung bên phải.</Text>
              <Text size="sm">Dùng nút làm mới khi muốn quét lại trạng thái hiện tại.</Text>
            </Stack>
          </div>

          <div className="guide-card">
            <Text fw={600} mb={6}>Cách đọc diff</Text>
            <Stack gap={6}>
              <Text size="sm"><Text component="span" fw={600} c="green.3">Dòng bắt đầu bằng `+`</Text> là nội dung mới thêm.</Text>
              <Text size="sm"><Text component="span" fw={600} c="red.3">Dòng bắt đầu bằng `-`</Text> là nội dung cũ bị xóa.</Text>
              <Text size="sm"><Text component="span" fw={600} c="violet.3">`@@`</Text> cho biết vị trí khối thay đổi trong file.</Text>
              <Text size="sm"><Text component="span" fw={600} c="blue.3">`---` và `+++`</Text> là tên file trước và sau khi sửa.</Text>
            </Stack>
          </div>

          <div className="guide-card">
            <Text fw={600} mb={6}>Ví dụ dễ hiểu</Text>
            <Stack gap={6}>
              <Text size="sm">Nếu thấy `+s` ở cuối file, nghĩa là vừa thêm ký tự `s`.</Text>
              <Text size="sm">Nếu thấy `-abc`, nghĩa là dòng `abc` đã bị xóa.</Text>
              <Text size="sm">`\ No newline at end of file` nghĩa là file không có dòng trống cuối cùng.</Text>
            </Stack>
          </div>

          <div className="guide-card">
            <Text fw={600} mb={6}>Lưu ý khi khôi phục</Text>
            <Stack gap={6}>
              <Text size="sm">Khôi phục sẽ ghi đè file hiện tại bằng snapshot cũ.</Text>
              <Text size="sm">Thao tác này không nên dùng nếu bạn chưa kiểm tra kỹ diff.</Text>
              <Text size="sm">Nếu chưa chắc, chỉ xem diff và tự sửa tay.</Text>
            </Stack>
          </div>
        </Stack>
      </Modal>

      <Modal opened={addProjectOpened} onClose={() => { if (!addingSession) { setAddProjectOpened(false); } }} title="Thêm dự án mới" centered radius="md" classNames={{ content: "project-modal", header: "project-modal-header", title: "project-modal-title" }}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Nhập đường dẫn tuyệt đối tới thư mục cần theo dõi.
          </Text>
          <TextInput value={newPath} onChange={(event: ChangeEvent<HTMLInputElement>) => setNewPath(event.currentTarget.value)} onKeyDown={handlePathInputKeyDown} placeholder="/duong/dan/project" disabled={addingSession} autoFocus />
          {addingSession ? (
            <Stack gap={6}>
              <Group justify="space-between" gap="xs">
                <Text size="xs" c="dimmed">
                  Đang tạo session và quét thay đổi
                </Text>
                <Text size="xs" fw={600}>
                  {addProgress}%
                </Text>
              </Group>
              <Progress value={addProgress} radius="xl" size="sm" animated className="project-progress" />
            </Stack>
          ) : null}
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setAddProjectOpened(false)} disabled={addingSession}>
              Hủy
            </Button>
            <Button loading={addingSession} onClick={() => void handleAddSession()}>
              Thêm dự án
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={settingsOpened} onClose={() => { if (!savingConfig) { setSettingsOpened(false); } }} title="Cấu hình lưu trữ" centered radius="md" size="lg" classNames={{ content: "project-modal", header: "project-modal-header", title: "project-modal-title" }}>
        <Stack gap="md">
          <Text size="sm" c="dimmed">
            Bỏ trống để dùng thư mục tạm hệ thống. Đường dẫn này áp dụng cho snapshot mới.
          </Text>
          <TextInput value={storageDirInput} onChange={(event: ChangeEvent<HTMLInputElement>) => setStorageDirInput(event.currentTarget.value)} placeholder={config?.defaults.tempStorageDir ?? "Đang tải..."} disabled={savingConfig || configLoading} />
          <div className="config-summary">
            <Text size="xs" c="dimmed">Temp mặc định</Text>
            <Text size="sm">{configLoading ? "Đang tải..." : config?.defaults.tempStorageDir ?? "Không tải được"}</Text>
            <Text size="xs" c="dimmed" mt="sm">Đang hiệu lực</Text>
            <Text size="sm">{configLoading ? "Đang tải..." : config?.defaults.effectiveStorageDir ?? "Không tải được"}</Text>
            <Text size="xs" c="dimmed" mt="sm">File cấu hình</Text>
            <Text size="sm">{configLoading ? "Đang tải..." : config?.defaults.configFilePath ?? "Không tải được"}</Text>
            {configError ? (
              <>
                <Text size="xs" c="red.3" mt="sm">Lỗi tải cấu hình</Text>
                <Text size="sm">{configError}</Text>
              </>
            ) : null}
          </div>
          <Group justify="flex-end">
            <Button variant="subtle" onClick={() => void loadConfig()} loading={configLoading} disabled={savingConfig}>
              Tải lại
            </Button>
            <Button variant="default" onClick={() => setSettingsOpened(false)} disabled={savingConfig}>
              Hủy
            </Button>
            <Button loading={savingConfig} onClick={() => void handleSaveConfig()}>
              Lưu cấu hình
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={removeConfirmOpened} onClose={() => setRemoveConfirmOpened(false)} title="Xác nhận Xóa Project" centered radius="md" size="md">
        <Stack gap="md">
          <Group gap="sm" align="flex-start">
            <IconAlertTriangle size={24} stroke={1.8} style={{ color: '#ef4444', flexShrink: 0, marginTop: 2 }} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                Bạn có chắc muốn xóa project này?
              </Text>
              <Text size="sm" c="dimmed">
                Project: <Text component="span" c="white" fw={500}>{activeSession?.targetPath}</Text>
              </Text>
            </Stack>
          </Group>
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #ef4444' }}>
            <Group gap={6} mb={6}>
              <IconInfoCircle size={16} stroke={1.8} style={{ color: '#f87171' }} />
              <Text size="xs" fw={600} c="red.4">
                LƯU Ý
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              • Project sẽ bị xóa khỏi danh sách theo dõi<br />
              • File watcher sẽ dừng ngay lập tức<br />
              • Snapshot và lịch sử thay đổi vẫn được giữ trong storage<br />
              • Bạn có thể thêm lại project này sau nếu cần
            </Text>
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRemoveConfirmOpened(false)} disabled={loading}>
              Hủy
            </Button>
            <Button color="red" onClick={() => void handleRemove()} loading={loading}>
              Xác nhận Xóa
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={rollbackConfirmOpened} onClose={() => setRollbackConfirmOpened(false)} title="Xác nhận Khôi phục File" centered radius="md" size="md">
        <Stack gap="md">
          <Group gap="sm" align="flex-start">
            <IconAlertTriangle size={24} stroke={1.8} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            <Stack gap="xs" style={{ flex: 1 }}>
              <Text size="sm" fw={600}>
                Bạn có chắc muốn khôi phục file này về phiên bản cũ?
              </Text>
              <Text size="sm" c="dimmed">
                File: <Text component="span" c="white" fw={500}>{selectedPath}</Text>
              </Text>
            </Stack>
          </Group>
          <div style={{ background: 'rgba(245, 158, 11, 0.1)', padding: '12px', borderRadius: '6px', borderLeft: '3px solid #f59e0b' }}>
            <Group gap={6} mb={6}>
              <IconAlertTriangle size={16} stroke={1.8} style={{ color: '#fbbf24' }} />
              <Text size="xs" fw={600} c="yellow.4">
                CẢNH BÁO
              </Text>
            </Group>
            <Text size="xs" c="dimmed">
              • File hiện tại sẽ bị ghi đè bằng phiên bản từ snapshot<br />
              • Thay đổi này KHÔNG THỂ hoàn tác<br />
              • Hãy đảm bảo bạn đã backup code quan trọng<br />
              • Chỉ file này bị ảnh hưởng, các file khác không đổi
            </Text>
          </div>
          <Group justify="flex-end">
            <Button variant="default" onClick={() => setRollbackConfirmOpened(false)} disabled={loading}>
              Hủy
            </Button>
            <Button color="red" onClick={() => void handleRollback()} loading={loading}>
              Khôi phục
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
