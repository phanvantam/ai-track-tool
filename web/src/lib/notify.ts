import { message } from "antd";

interface NotifyPayload {
  color?: string;
  message: string;
}

/**
 * Hiển thị thông báo (toast) ở giữa phía trên màn hình.
 */
export const notifications = {
  show({ color, message: msg }: NotifyPayload) {
    if (color === "green") {
      void message.success(msg);
      return;
    }

    if (color === "red") {
      void message.error(msg);
      return;
    }

    if (color === "yellow" || color === "orange") {
      void message.warning(msg);
      return;
    }

    void message.info(msg);
  },
};
