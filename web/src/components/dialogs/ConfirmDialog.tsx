import { Button, Flex, Modal, Typography } from "antd";
import { useState } from "react";
import type { ConfirmState } from "../../hooks";
import { IconAlertCircle, IconCheck, IconExclamationCircle, IconInfoCircle } from "@tabler/icons-react";

interface ConfirmDialogProps {
  confirmState: ConfirmState;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

/**
 * Dialog xác nhận được tùy chỉnh theo thiết kế hiện đại.
 * Hỗ trợ các trạng thái: success, error, warning, info.
 */
export function ConfirmDialog({ confirmState, onConfirm, onCancel }: ConfirmDialogProps) {
  const [internalLoading, setInternalLoading] = useState(false);

  async function handleConfirm() {
    setInternalLoading(true);
    try {
      await onConfirm();
    } finally {
      setInternalLoading(false);
    }
  }

  const isLoading = confirmState.loading || internalLoading;
  const { type = "info" } = confirmState;

  // Cấu hình icon và màu sắc dựa trên type
  const config = {
    success: {
      icon: <IconCheck size={36} />,
      color: "rgb(52, 199, 89)",
      bg: "rgba(52, 199, 89, 0.1)",
    },
    warning: {
      icon: <IconExclamationCircle size={36} />,
      color: "rgb(255, 159, 10)",
      bg: "rgba(255, 159, 10, 0.1)",
    },
    error: {
      icon: <IconAlertCircle size={36} />,
      color: "rgb(255, 69, 58)",
      bg: "rgba(255, 69, 58, 0.1)",
    },
    info: {
      icon: <IconInfoCircle size={36} />,
      color: "rgb(0, 122, 255)",
      bg: "rgba(0, 122, 255, 0.1)",
    },
  }[type];

  return (
    <Modal
      open={confirmState.isOpen}
      onCancel={onCancel}
      footer={null}
      centered
      destroyOnClose
      width={420}
      styles={{
        body: { padding: "32px 24px" }
      }}
      closable={false}
    >
      <Flex vertical align="center" gap={24}>
        {/* Icon status container */}
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: config.bg,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: config.color,
          }}
        >
          {config.icon}
        </div>

        {/* Text content */}
        <Flex vertical align="center" gap="small">
          <Typography.Title level={4} style={{ margin: 0, fontWeight: 600 }}>
            {confirmState.title}
          </Typography.Title>
          <Typography.Text type="secondary" style={{ textAlign: "center", fontSize: "14px" }}>
            {confirmState.message}
          </Typography.Text>
        </Flex>

        {/* Action buttons */}
        <Flex gap="small" style={{ width: "100%" }}>
          <Button
            size="large"
            block
            onClick={onCancel}
            disabled={isLoading}
            variant="outlined"
            style={{ fontWeight: 500 }}
          >
            Quay lại
          </Button>
          <Button
            size="large"
            block
            type="primary"
            danger={type === "error" || type === "warning"}
            onClick={() => void handleConfirm()}
            loading={isLoading}
            style={{ fontWeight: 500 }}
          >
            Xác nhận
          </Button>
        </Flex>
      </Flex>
    </Modal>
  );
}
