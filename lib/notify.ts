import toast from "react-hot-toast";

export type NotificationType = "success" | "error" | "warn" | "info";

export const notify = (message: string, type: NotificationType = "info") => {
  const baseStyle = {
    fontWeight: "500",
    borderRadius: "12px",
    fontSize: "14px",
    padding: "12px 16px",
  };

  switch (type) {
    case "success":
      return toast.success(message, {
        duration: 4000,
        position: "bottom-right",
        style: {
          ...baseStyle,
          background: "#000000",
          color: "#F2F2F2",
          border: "1px solid #B6B09F",
        },
      });

    case "error":
      return toast.error(message, {
        duration: 5000,
        position: "bottom-right",
        style: {
          ...baseStyle,
          background: "#EF4444",
          color: "#FFFFFF",
        },
      });

    case "warn":
      return toast(message, {
        duration: 4000,
        position: "bottom-right",
        icon: "⚠️",
        style: {
          ...baseStyle,
          background: "#F59E0B",
          color: "#FFFFFF",
        },
      });

    case "info":
    default:
      return toast(message, {
        duration: 3000,
        position: "bottom-right",
        icon: "ℹ️",
        style: {
          ...baseStyle,
          background: "#B6B09F",
          color: "#000000",
        },
      });
  }
};