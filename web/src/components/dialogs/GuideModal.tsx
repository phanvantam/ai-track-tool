import { Flex, List, Modal, Tag, Typography } from "antd";
import {
  IconCheck,
  IconFileText,
  IconHistory,
  IconQrcode,
  IconTimeline,
} from "@tabler/icons-react";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: <IconQrcode size={18} />,
    title: "Quản lý session",
    description: "Thêm, xóa, chuyển đổi giữa các dự án.",
  },
  {
    icon: <IconFileText size={18} />,
    title: "Xem diff",
    description: "Xem thay đổi file hiện tại so với snapshot lưu trữ.",
  },
  {
    icon: <IconHistory size={18} />,
    title: "Lịch sử snapshot",
    description: "Xem danh sách snapshot và so sánh giữa các version.",
  },
  {
    icon: <IconCheck size={18} />,
    title: "Restore và rollback",
    description: "Khôi phục hoặc quay lại snapshot trước đó.",
  },
  {
    icon: <IconTimeline size={18} />,
    title: "Reflog và health check",
    description: "Kiểm tra lịch hoạt động và tính toàn vẹn dữ liệu.",
  },
];

const shortcuts = [
  ["Ctrl+Shift+/", "Mở hướng dẫn"],
  ["Ctrl+K", "Mở command palette"],
  ["Ctrl+S", "Lưu cấu hình"],
  ["Ctrl+R", "Làm mới session"],
  ["Tab", "Điều hướng file tree"],
  ["Enter", "Chọn file hoặc item"],
  ["Esc", "Đóng modal hoặc palette"],
  ["Delete", "Xóa item đang chọn"],
];

/**
 * Hướng dẫn dùng AntD Modal/List.
 */
export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  return (
    <Modal open={isOpen} onCancel={onClose} title="Hướng dẫn sử dụng" footer={null} centered destroyOnHidden>
      <Flex vertical gap="large">
        <div>
          <Typography.Title level={5}>Tính năng chính</Typography.Title>
          <List
            dataSource={features}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  avatar={<div>{item.icon}</div>}
                  title={item.title}
                  description={item.description}
                />
              </List.Item>
            )}
          />
        </div>

        <div>
          <Typography.Title level={5}>Phím tắt</Typography.Title>
          <Flex vertical gap="small">
            {shortcuts.map(([key, description]) => (
              <Flex key={key} justify="space-between" align="center">
                <Tag>{key}</Tag>
                <Typography.Text type="secondary">{description}</Typography.Text>
              </Flex>
            ))}
          </Flex>
        </div>
      </Flex>
    </Modal>
  );
}
