import { Bell } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";

type NotificationBellProps = {
  onClick: () => void;
  className?: string;
};

// 상단 알림 버튼 (안 읽은 알림 개수 배지 포함)
export default function NotificationBell({
  onClick,
  className = "top-bell-button",
}: NotificationBellProps) {
  const { unreadCount } = useNotifications();

  return (
    <button
      type="button"
      className={`${className} bell-with-badge`}
      aria-label={unreadCount > 0 ? `알림 ${unreadCount}개` : "알림"}
      onClick={onClick}
    >
      <Bell size={22} strokeWidth={2} />
      {unreadCount > 0 && (
        <span className="bell-badge">{unreadCount > 9 ? "9+" : unreadCount}</span>
      )}
    </button>
  );
}
