import { useEffect, useState } from "react";
import NotificationBell from "../NotificationBell";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Megaphone,
  UserRound,
} from "lucide-react";
import GoogleLoginButton from "../GoogleLoginButton";
import { useNotifications } from "../../hooks/useNotifications";
import {
  notify,
  requestPermission,
  updateSettings,
  type NotificationSettings,
} from "../../services/notificationService";
import {
  disableServerPush,
  enableServerPush,
  getPushStatus,
  type PushStatus,
} from "../../services/pushService";

const PUSH_STATUS_TEXT: Record<PushStatus, string> = {
  "not-configured": "Firebase 설정값(firebaseConfig·VAPID 키)을 넣으면 사용할 수 있어요.",
  "dev-mode": "개발 모드(npm run dev)에서는 사용할 수 없어요. 배포 주소에서 켜 주세요.",
  unsupported: "이 브라우저는 푸시를 지원하지 않아요. 아이폰은 홈 화면에 추가한 앱에서 켜 주세요.",
  denied: "알림이 차단되어 있어요. 브라우저 설정에서 알림을 허용해 주세요.",
  off: "앱을 완전히 종료해도 복용·가격·재구매 알림을 받아요. (최대 5~15분 늦을 수 있어요)",
  on: "켜져 있어요. 앱을 종료해도 서버가 알림을 보내드려요.",
};
import "../styles/MyPageTab.css";

type MyPageView = "main" | "info" | "alarm" | "notice";

type Notice = {
  id: number;
  title: string;
  date: string;
  content: string;
};

type LoginUser = {
  name: string;
  email: string;
  picture?: string;
};

type MyPageTabProps = {
  onOpenNotification: () => void;
};

export default function MyPageTab({ onOpenNotification }: MyPageTabProps) {
  const currentYear = new Date().getFullYear();

  const [myPageView, setMyPageView] = useState<MyPageView>("main");
  const [modalMessage, setModalMessage] = useState("");

  const [loginUser, setLoginUser] = useState<LoginUser | null>(() => {
    const saved = localStorage.getItem("loginUser");
    return saved ? JSON.parse(saved) : null;
  });

  const [profileName, setProfileName] = useState(() => {
    const saved = localStorage.getItem("loginUser");
    return saved ? JSON.parse(saved).name : "";
  });

  const [profileEmail, setProfileEmail] = useState(() => {
    const saved = localStorage.getItem("loginUser");
    return saved ? JSON.parse(saved).email : "";
  });

  const [profileGender, setProfileGender] = useState<"남성" | "여성">("남성");
  const [profileBirthYear, setProfileBirthYear] = useState("1990");

  const { settings, permission } = useNotifications();
  const [pushStatus, setPushStatus] = useState<PushStatus | null>(null);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getPushStatus().then((status) => {
      if (!cancelled) setPushStatus(status);
    });
    return () => {
      cancelled = true;
    };
  }, [permission]);

  const toggleServerPush = async () => {
    if (pushBusy || !pushStatus) return;
    setPushBusy(true);
    try {
      setPushStatus(
        pushStatus === "on" ? await disableServerPush() : await enableServerPush()
      );
    } catch (error) {
      console.error("서버 푸시 설정 오류:", error);
      setModalMessage("푸시 설정에 실패했어요. 잠시 후 다시 시도해 주세요.");
    } finally {
      setPushBusy(false);
    }
  };

  const toggleSetting = (key: keyof NotificationSettings) => {
    updateSettings({ [key]: !settings[key] });
  };

  const handleRequestPermission = async () => {
    const result = await requestPermission();
    if (result === "denied") {
      setModalMessage(
        "알림이 차단되어 있어요. 브라우저 주소창 왼쪽 자물쇠 아이콘 → 알림 → 허용으로 바꿔주세요."
      );
    }
  };

  const sendTestNotification = async () => {
    if (permission === "default") await requestPermission();
    await notify({
      type: "test",
      title: "Fit Vita 테스트 알림",
      body: "알림이 잘 도착했어요! 복용 시간과 최저가 소식을 이렇게 알려드릴게요.",
    });
  };

  const alarmItems: {
    key: keyof NotificationSettings;
    title: string;
    desc: string;
  }[] = [
    {
      key: "schedule",
      title: "복용 스케줄 알림",
      desc: "영양제 복용 시간을 알려드립니다",
    },
    {
      key: "price",
      title: "최저가·목표가 알림",
      desc: "찜한 영양제가 90일 최저가이거나 목표가 이하가 되면 알려드립니다",
    },
    {
      key: "restock",
      title: "재구매 알림",
      desc: "남은 영양제가 7일분 이하가 되면 알려드립니다",
    },
    {
      key: "push",
      title: "푸시 알림",
      desc: "휴대폰·PC 알림으로도 받습니다 (끄면 앱 안 알림 목록에만 쌓여요)",
    },
    {
      key: "night",
      title: "야간 푸시 알림",
      desc: "밤 10시~아침 8시에도 가격·재구매 알림을 받습니다 (복용 알림은 항상 울려요)",
    },
  ];

  const goMain = () => {
    setMyPageView("main");
  };

  const handleGoogleLogin = (user: LoginUser) => {
    setLoginUser(user);
    setProfileName(user.name);
    setProfileEmail(user.email);
  };

  const handleLogout = () => {
    localStorage.removeItem("loginUser");
    setLoginUser(null);
    setProfileName("");
    setProfileEmail("");
  };

  const handleSaveProfile = () => {
    const profile = {
      name: profileName,
      email: profileEmail,
      gender: profileGender,
      birthYear: profileBirthYear,
    };

    localStorage.setItem("userHealthProfile", JSON.stringify(profile));
    setModalMessage("내 정보가 저장되었습니다.");
  };

  const notices: Notice[] = [
    {
      id: 1,
      title: "봄맞이 영양제 특가 이벤트",
      date: "2026.04.10",
      content: "봄철 건강관리를 위한 영양제 최대 30% 할인 진행 중입니다.",
    },
    {
      id: 2,
      title: "신규 제품 입고 안내",
      date: "2026.04.05",
      content: "[종근당] 프리미엄 루테인 지아잔틴이 새롭게 입고되었습니다.",
    },
    {
      id: 3,
      title: "배송 정책 변경 안내",
      date: "2026.04.01",
      content: "4월 1일부터 30,000원 이상 구매 시 무료배송이 적용됩니다.",
    },
    {
      id: 4,
      title: "앱 업데이트 안내",
      date: "2026.03.28",
      content: "영양제 추천 기능이 개선되었습니다. 더욱 정확한 맞춤 추천을 받아보세요.",
    },
    {
      id: 5,
      title: "개인정보 처리방침 변경",
      date: "2026.03.20",
      content: "개인정보 처리방침이 일부 변경되었습니다. 자세한 내용은 설정에서 확인하세요.",
    },
    {
      id: 6,
      title: "서비스 점검 안내",
      date: "2026.03.15",
      content:
        "3월 16일 새벽 2시~4시 서비스 점검이 진행됩니다. 이용에 참고 부탁드립니다.",
    },
  ];

  return (
    <div className="mypage-section">
      {myPageView === "main" && (
        <>
          <div className="mypage-header">
            <h1>마이페이지</h1>
            <NotificationBell onClick={onOpenNotification} className="mypage-bell-button" />
          </div>

          {loginUser ? (
            <div className="mypage-profile-card">
              {loginUser.picture ? (
                <img
                  src={loginUser.picture}
                  alt="프로필"
                  className="mypage-profile-image"
                />
              ) : (
                <div className="mypage-profile-icon">
                  <UserRound size={26} color="white" />
                </div>
              )}

              <div>
                <div className="mypage-profile-name">{loginUser.name}님</div>
                <div className="mypage-profile-desc">
                  건강한 하루 되세요!
                </div>
              </div>
            </div>
          ) : (
            <div className="mypage-login-card">
              <p>로그인 후 마이페이지를 이용할 수 있어요.</p>
              <GoogleLoginButton onLogin={handleGoogleLogin} />
            </div>
          )}

          <div className="mypage-menu-list">
            <button
              type="button"
              className="mypage-menu-item"
              onClick={() => setMyPageView("info")}
            >
              <span className="mypage-menu-left">
                <span className="mypage-menu-icon"><UserRound size={18} /></span>
                내 정보
              </span>
              <span className="mypage-menu-arrow"><ChevronRight size={20} /></span>
            </button>

            <button
              type="button"
              className="mypage-menu-item"
              onClick={() => setMyPageView("alarm")}
            >
              <span className="mypage-menu-left">
                <span className="mypage-menu-icon"><Bell size={18} /></span>
                알림 설정
              </span>
              <span className="mypage-menu-arrow"><ChevronRight size={20} /></span>
            </button>

            <button
              type="button"
              className="mypage-menu-item"
              onClick={() => setMyPageView("notice")}
            >
              <span className="mypage-menu-left">
                <span className="mypage-menu-icon"><Megaphone size={18} /></span>
                공지사항
              </span>
              <span className="mypage-menu-arrow"><ChevronRight size={20} /></span>
            </button>
          </div>

          {loginUser && (
            <button
              type="button"
              className="mypage-logout"
              onClick={handleLogout}
            >
              ↪ 로그아웃
            </button>
          )}
        </>
      )}

      {myPageView === "info" && (
        <>
          <div className="mypage-sub-header">
            <button type="button" className="mypage-back" onClick={goMain}>
              <ChevronLeft size={28} />
            </button>
            <h1>내 정보</h1>
          </div>

          <div className="mypage-form-card">
            <h2>기본 정보</h2>

            <label>이름</label>
            <input
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="이름을 입력하세요"
            />

            <label>이메일</label>
            <input
              value={profileEmail}
              onChange={(e) => setProfileEmail(e.target.value)}
              placeholder="이메일을 입력하세요"
            />
          </div>

          <div className="mypage-form-card">
            <h2>건강 정보</h2>

            <label>성별</label>
            <div className="mypage-gender-buttons">
              <button
                type="button"
                className={profileGender === "남성" ? "active" : ""}
                onClick={() => setProfileGender("남성")}
              >
                남성
              </button>
              <button
                type="button"
                className={profileGender === "여성" ? "active" : ""}
                onClick={() => setProfileGender("여성")}
              >
                여성
              </button>
            </div>

            <label>생년월일</label>
            <select
              value={profileBirthYear}
              onChange={(e) => setProfileBirthYear(e.target.value)}
            >
              {Array.from({ length: currentYear - 1947 + 1 }, (_, i) => {
                const year = currentYear - i;
                return (
                  <option key={year} value={year}>
                    {year}년생
                  </option>
                );
              })}
            </select>
          </div>

          <button
            type="button"
            className="mypage-save-button"
            onClick={handleSaveProfile}
          >
            저장하기
          </button>
        </>
      )}

      {myPageView === "alarm" && (
        <>
          <div className="mypage-sub-header">
            <button type="button" className="mypage-back" onClick={goMain}>
              <ChevronLeft size={28} />
            </button>
            <h1>알림 설정</h1>
          </div>

          <div className={`permission-card ${permission}`}>
            <div>
              <h2>
                {permission === "granted" && "알림 권한이 허용되어 있어요"}
                {permission === "default" && "알림 권한이 필요해요"}
                {permission === "denied" && "알림이 차단되어 있어요"}
                {permission === "unsupported" && "이 브라우저는 알림을 지원하지 않아요"}
              </h2>
              <p>
                {permission === "granted"
                  ? "앱이 열려 있거나 백그라운드에 있을 때 알림을 보내드려요."
                  : permission === "denied"
                    ? "브라우저 주소창 왼쪽 자물쇠 → 알림 → 허용으로 바꿔주세요."
                    : permission === "unsupported"
                      ? "아이폰은 홈 화면에 추가한 앱에서만 알림을 받을 수 있어요."
                      : "휴대폰·PC 알림으로 복용 시간을 놓치지 마세요."}
              </p>
            </div>
            {permission === "default" && (
              <button type="button" onClick={handleRequestPermission}>
                허용하기
              </button>
            )}
          </div>

          <div className="alarm-card server-push-card">
            <div>
              <h2>앱이 꺼져 있어도 알림 받기</h2>
              <p>{pushStatus ? PUSH_STATUS_TEXT[pushStatus] : "확인 중..."}</p>
            </div>
            <button
              type="button"
              aria-label={`서버 푸시 ${pushStatus === "on" ? "끄기" : "켜기"}`}
              className={`switch ${pushStatus === "on" ? "on" : ""}`}
              disabled={pushBusy || (pushStatus !== "on" && pushStatus !== "off")}
              onClick={toggleServerPush}
            >
              <span></span>
            </button>
          </div>

          {alarmItems.map((item) => (
            <div className="alarm-card" key={item.key}>
              <div>
                <h2>{item.title}</h2>
                <p>{item.desc}</p>
              </div>
              <button
                type="button"
                aria-label={`${item.title} ${settings[item.key] ? "끄기" : "켜기"}`}
                className={`switch ${settings[item.key] ? "on" : ""}`}
                onClick={() => toggleSetting(item.key)}
              >
                <span></span>
              </button>
            </div>
          ))}

          <button
            type="button"
            className="test-notification-button"
            onClick={sendTestNotification}
          >
            테스트 알림 보내기
          </button>
        </>
      )}

      {myPageView === "notice" && (
        <>
          <div className="mypage-sub-header">
            <button type="button" className="mypage-back" onClick={goMain}>
              <ChevronLeft size={28} />
            </button>
            <h1>공지사항</h1>
          </div>

          <div className="notice-list">
            {notices.map((notice) => (
              <div className="notice-card" key={notice.id}>
                <div className="notice-top">
                  <h2>{notice.title}</h2>
                  <span>{notice.date}</span>
                </div>
                <p>{notice.content}</p>
              </div>
            ))}
          </div>
        </>
      )}

      {modalMessage && (
        <div className="custom-modal-overlay">
          <div className="custom-modal-card">
            <p>{modalMessage}</p>
            <button type="button" onClick={() => setModalMessage("")}>
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}