import { useState } from "react";
import GoogleLoginButton from "../GoogleLoginButton";
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

  const [lowestPriceAlarm, setLowestPriceAlarm] = useState(true);
  const [scheduleAlarm, setScheduleAlarm] = useState(true);
  const [pushAlarm, setPushAlarm] = useState(true);
  const [nightPushAlarm, setNightPushAlarm] = useState(false);

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
            <button
              type="button"
              className="mypage-bell-button"
              onClick={onOpenNotification}
            >
              ♧
            </button>
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
                <div className="mypage-profile-icon">👤</div>
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
                <span className="mypage-menu-icon">♙</span>
                내 정보
              </span>
              <span className="mypage-menu-arrow">›</span>
            </button>

            <button
              type="button"
              className="mypage-menu-item"
              onClick={() => setMyPageView("alarm")}
            >
              <span className="mypage-menu-left">
                <span className="mypage-menu-icon">♧</span>
                알림 설정
              </span>
              <span className="mypage-menu-arrow">›</span>
            </button>

            <button
              type="button"
              className="mypage-menu-item"
              onClick={() => setMyPageView("notice")}
            >
              <span className="mypage-menu-left">
                <span className="mypage-menu-icon">▤</span>
                공지사항
              </span>
              <span className="mypage-menu-arrow">›</span>
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
              ‹
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
              ‹
            </button>
            <h1>알림 설정</h1>
          </div>

          <div className="alarm-card">
            <div>
              <h2>최저가 알림</h2>
              <p>관심 영양제의 최저가 정보를 알려드립니다</p>
            </div>
            <button
              type="button"
              className={`switch ${lowestPriceAlarm ? "on" : ""}`}
              onClick={() => setLowestPriceAlarm(!lowestPriceAlarm)}
            >
              <span></span>
            </button>
          </div>

          <div className="alarm-card">
            <div>
              <h2>복용 스케줄 알림</h2>
              <p>영양제 복용 시간을 알려드립니다</p>
            </div>
            <button
              type="button"
              className={`switch ${scheduleAlarm ? "on" : ""}`}
              onClick={() => setScheduleAlarm(!scheduleAlarm)}
            >
              <span></span>
            </button>
          </div>

          <div className="alarm-card">
            <div>
              <h2>푸시 알림</h2>
              <p>앱의 모든 푸시 알림을 받습니다</p>
            </div>
            <button
              type="button"
              className={`switch ${pushAlarm ? "on" : ""}`}
              onClick={() => setPushAlarm(!pushAlarm)}
            >
              <span></span>
            </button>
          </div>

          <div className="alarm-card">
            <div>
              <h2>야간 푸시 알림</h2>
              <p>밤 10시부터 아침 8시까지 알림을 받습니다</p>
            </div>
            <button
              type="button"
              className={`switch ${nightPushAlarm ? "on" : ""}`}
              onClick={() => setNightPushAlarm(!nightPushAlarm)}
            >
              <span></span>
            </button>
          </div>
        </>
      )}

      {myPageView === "notice" && (
        <>
          <div className="mypage-sub-header">
            <button type="button" className="mypage-back" onClick={goMain}>
              ‹
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