import { Collapse, Flex, List, Modal, Tag, Typography } from "antd";
import {
  IconCamera,
  IconCheck,
  IconFileText,
  IconHistory,
  IconQrcode,
  IconRestore,
  IconTimeline,
} from "@tabler/icons-react";

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const features = [
  {
    icon: <IconQrcode size={18} />,
    title: "Quản lý project/session",
    description: "Thêm, xóa, tạm dừng, tiếp tục theo dõi project. Mỗi project là một session riêng biệt.",
  },
  {
    icon: <IconCamera size={18} />,
    title: "Tạo mốc (snapshot)",
    description:
      'Bấm "Đặt lại snapshot" trên toolbar để chụp trạng thái hiện tại thành một mốc mới. Mốc được lưu toàn bộ metadata, hash file, nội dung.',
  },
  {
    icon: <IconFileText size={18} />,
    title: "Xem thay đổi (diff)",
    description:
      "Sidebar hiển thị danh sách file thay đổi so với mốc đang active. Click file để xem diff chi tiết dạng unified.",
  },
  {
    icon: <IconCheck size={18} />,
    title: "Rollback từng file",
    description:
      "Click chuột phải hoặc chọn file rồi bấm rollback để khôi phục file đó về trạng thái của mốc hiện tại. Cũng có thể rollback cả folder hoặc toàn bộ changes.",
  },
  {
    icon: <IconHistory size={18} />,
    title: "Lịch sử mốc (snapshot history)",
    description:
      "Tab \"Lịch sử\" hiển thị toàn bộ mốc đã tạo, cây nhánh, tag, ghi chú. Click vào mốc để xem chi tiết trong drawer.",
  },
  {
    icon: <IconRestore size={18} />,
    title: "Khôi phục về mốc cũ (restore)",
    description:
      "Trong drawer chi tiết mốc, bấm \"Khôi phục về mốc này\" để đưa workspace về trạng thái đã chụp. Thao tác này ghi đè toàn bộ file trên disk.",
  },
  {
    icon: <IconTimeline size={18} />,
    title: "Reflog, FSCK, GC",
    description:
      "Tab Health kiểm tra toàn vẹn dữ liệu (FSCK), dọn dẹp snapshot cũ (GC). Tab Reflog xem lịch sử thao tác.",
  },
];

/** Giải thích chi tiết quy trình restore */
const restoreGuide = [
  {
    key: "1",
    label: "Bước 1: Chọn mốc muốn khôi phục",
    children: (
      <Typography.Text>
        Mở tab <strong>Lịch sử</strong> ở sidebar phải → click vào mốc bất kỳ. Drawer chi tiết sẽ mở ra.
      </Typography.Text>
    ),
  },
  {
    key: "2",
    label: "Bước 2: Xem trước thay đổi",
    children: (
      <Typography.Text>
        Chuyển sang tab <strong>So sánh</strong> trong drawer. Danh sách file sẽ hiển thị:<br />
        • <Tag color="green" bordered={false} style={{ margin: '2px 0' }}>+N</Tag> file sẽ được <strong>thêm</strong> (có trong mốc chọn, không có ở mốc hiện tại)<br />
        • <Tag color="gold" bordered={false} style={{ margin: '2px 0' }}>~N</Tag> file sẽ bị <strong>sửa</strong> (nội dung khác nhau giữa 2 mốc)<br />
        • <Tag color="red" bordered={false} style={{ margin: '2px 0' }}>-N</Tag> file sẽ bị <strong>xóa</strong> (có ở mốc hiện tại nhưng không có trong mốc chọn)<br />
        Click vào file để xem diff chi tiết.
      </Typography.Text>
    ),
  },
  {
    key: "3",
    label: 'Bước 3: Bấm "Khôi phục về mốc này"',
    children: (
      <Typography.Text>
        Ở tab <strong>Tổng quan</strong>, bấm nút <strong>"Khôi phục về mốc này"</strong>.
        Một hộp thoại xác nhận sẽ hiện lên cảnh báo:<br />
        • Workspace hiện tại sẽ bị ghi đè.<br />
        • Mốc active sẽ chuyển sang mốc được chọn.<br />
        • Danh sách thay đổi sẽ về 0.<br />
        Nếu cần giữ trạng thái hiện tại, hãy tạo mốc mới trước khi khôi phục.
      </Typography.Text>
    ),
  },
];



/**
 * Modal hướng dẫn sử dụng chính.
 * Bao gồm: tính năng chính, quy trình restore, phím tắt.
 */
export function GuideModal({ isOpen, onClose }: GuideModalProps) {
  return (
    <Modal
      open={isOpen}
      onCancel={onClose}
      title="Hướng dẫn sử dụng AI Track Tool"
      footer={null}
      centered
      destroyOnHidden
      width={640}
    >
      <Flex vertical gap="large" style={{ maxHeight: '70vh', overflow: 'auto', paddingRight: 4 }}>
        {/* Tính năng chính */}
        <div>
          <Typography.Title level={5} style={{ marginBottom: 8 }}>Tính năng chính</Typography.Title>
          <List
            size="small"
            dataSource={features}
            renderItem={(item) => (
              <List.Item style={{ padding: '6px 0' }}>
                <List.Item.Meta
                  avatar={<div style={{ display: 'flex', alignItems: 'center', paddingTop: 2 }}>{item.icon}</div>}
                  title={<Typography.Text strong style={{ fontSize: 13 }}>{item.title}</Typography.Text>}
                  description={<Typography.Text type="secondary" style={{ fontSize: 12 }}>{item.description}</Typography.Text>}
                />
              </List.Item>
            )}
          />
        </div>

        {/* Hướng dẫn restore chi tiết */}
        <div>
          <Typography.Title level={5} style={{ marginBottom: 8 }}>
            <IconRestore size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            Khôi phục về mốc cũ (restore)
          </Typography.Title>
          <Collapse
            items={restoreGuide}
            defaultActiveKey={["1", "2", "3"]}
            bordered={false}
            size="small"
          />
        </div>
      </Flex>
    </Modal>
  );
}
