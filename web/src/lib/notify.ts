import { notification } from "antd";

interface NotifyPayload {
  color?: string;
  message: string;
}

/**
 * Mapping màu cũ sang API thông báo AntD.
 */
export const notifications = {
  show({ color, message }: NotifyPayload) {
    if (color === "green") {
      notification.success({ message, placement: "topRight" });
      return;
    }

    if (color === "red") {
      notification.error({ message, placement: "topRight" });
      return;
    }

    if (color === "yellow" || color === "orange") {
      notification.warning({ message, placement: "topRight" });
      return;
    }

    notification.info({ message, placement: "topRight" });
  },
};
