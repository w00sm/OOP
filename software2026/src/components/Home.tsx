import { useState } from "react";
import { ChevronLeft, Heart, House, Search, Sparkles, UserRound } from "lucide-react";
import "./Home.css";

import HomeTab from "./pages/HomeTab";
import SearchTab from "./pages/SearchTab";
import RecommendTab from "./pages/RecommendTab";
import WishTab from "./pages/WishTab";
import MyPageTab from "./pages/MyPageTab";
import { useWishlist } from "../hooks/useWishlist";
import InstallBanner from "./InstallBanner";
import { useAlertScheduler } from "../hooks/useAlertScheduler";
import { useNotifications } from "../hooks/useNotifications";
import { clearHistory, markAllRead, timeAgo } from "../services/notificationService";

export type Tab = "홈" | "검색" | "추천" | "찜" | "마이페이지";
export type TimeCategory = "아침" | "점심" | "저녁";

export type Supplement = {
  id: number;
  name: string;
  desc: string;
  time: string;
  timeCategory: TimeCategory;
  checked: boolean;
  stock?: number; // 남은 개수 (정·캡슐·포). 입력하면 재구매 알림에 사용
  dailyDose?: number; // 하루 복용 개수 (기본 1)
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("홈");
  const [showNotificationPage, setShowNotificationPage] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [recommendedIngredients, setRecommendedIngredients] = useState<string[]>([]);
  const wishlist = useWishlist();

  const [supplements, setSupplements] = useState<Supplement[]>(() => {
    const saved = localStorage.getItem("supplements");
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 1,
            name: "종합비타민",
            desc: "1정 · 식후 30분",
            time: "08:00",
            timeCategory: "아침",
            checked: true,
          },
          {
            id: 2,
            name: "비타민B",
            desc: "1정 · 식후",
            time: "09:00",
            timeCategory: "아침",
            checked: false,
          },
          {
            id: 3,
            name: "오메가3",
            desc: "1캡슐 · 식후",
            time: "13:00",
            timeCategory: "점심",
            checked: false,
          },
          {
            id: 4,
            name: "마그네슘",
            desc: "1정 · 취침 전",
            time: "22:00",
            timeCategory: "저녁",
            checked: false,
          },
        ];
  });

  const { history: notifications } = useNotifications();
  useAlertScheduler(supplements, wishlist.wishlist);

  const openAlarmPage = () => {
    setShowNotificationPage(true);
  };

  // 알림 화면을 닫을 때 읽음 처리 (열려 있는 동안은 새 알림이 강조되어 보임)
  const closeAlarmPage = () => {
    markAllRead();
    setShowNotificationPage(false);
  };

  // 추천탭에서 성분을 누르면 그 성분으로 검색탭을 엽니다.
  const goToSearch = (keyword: string) => {
    setSearchKeyword(keyword);
    setActiveTab("검색");
  };

  // 추천탭의 '맞춤 영양제 추천받기': 추천 성분 전체로 검색탭을 엽니다.
  const goToRecommendedSearch = (ingredients: string[]) => {
    setRecommendedIngredients(ingredients);
    setSearchKeyword("");
    setActiveTab("검색");
  };

  return (
    <div className="container">
      {activeTab === "홈" && <InstallBanner />}

      {activeTab === "홈" && (
        <HomeTab
          supplements={supplements}
          setSupplements={setSupplements}
          onOpenNotification={openAlarmPage}
        />
      )}

      {activeTab === "검색" && (
        <SearchTab
          keyword={searchKeyword}
          onKeywordChange={setSearchKeyword}
          recommendedIngredients={recommendedIngredients}
          onClearRecommended={() => setRecommendedIngredients([])}
          wishlist={wishlist}
          onOpenNotification={openAlarmPage}
        />
      )}

      {activeTab === "추천" && (
        <RecommendTab
          onOpenNotification={openAlarmPage}
          onSearch={goToSearch}
          onRecommend={goToRecommendedSearch}
        />
      )}

      {activeTab === "찜" && (
        <WishTab wishlist={wishlist} onOpenNotification={openAlarmPage} />
      )}

      {activeTab === "마이페이지" && (
        <MyPageTab onOpenNotification={openAlarmPage} />
      )}

      {showNotificationPage && (
        <div
          className="notification-page"
          style={{
            position: "fixed",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: 390,
            height: "100vh",
            zIndex: 99999,
            background: "#f7faf7",
            padding: "24px 20px 96px",
            overflowY: "auto",
          }}
        >
          <div className="mypage-sub-header">
            <button
              type="button"
              className="mypage-back"
              onClick={closeAlarmPage}
            >
              <ChevronLeft size={28} />
            </button>
            <h1>알림</h1>
            {notifications.length > 0 && (
              <button type="button" className="notification-clear" onClick={clearHistory}>
                모두 지우기
              </button>
            )}
          </div>

          <div className="notification-list">
            {notifications.length === 0 && (
              <div className="notification-empty">
                아직 받은 알림이 없어요.
                <br />
                복용 시간, 최저가, 재구매 시점이 되면 여기에 알려드려요.
              </div>
            )}
            {notifications.map((item) => (
              <div
                className={`notification-card ${item.read ? "" : "active"}`}
                key={item.id}
              >
                <div className="notification-top">
                  <h2>{item.title}</h2>
                  <span>{timeAgo(item.createdAt)}</span>
                </div>
                <p>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bottom-nav">
        <button
          className={activeTab === "홈" ? "active" : ""}
          onClick={() => {
            setActiveTab("홈");
            closeAlarmPage();
          }}
        >
          <span className="nav-icon"><House size={22} /></span>
          <span>홈</span>
        </button>

        <button
          className={activeTab === "검색" ? "active" : ""}
          onClick={() => {
            setActiveTab("검색");
            closeAlarmPage();
          }}
        >
          <span className="nav-icon"><Search size={22} /></span>
          <span>검색</span>
        </button>

        <button
          className={activeTab === "추천" ? "active" : ""}
          onClick={() => {
            setActiveTab("추천");
            closeAlarmPage();
          }}
        >
          <span className="nav-icon"><Sparkles size={22} /></span>
          <span>추천</span>
        </button>

        <button
          className={activeTab === "찜" ? "active" : ""}
          onClick={() => {
            setActiveTab("찜");
            closeAlarmPage();
          }}
        >
          <span className="nav-icon"><Heart size={22} /></span>
          <span>찜</span>
        </button>

        <button
          className={activeTab === "마이페이지" ? "active" : ""}
          onClick={() => {
            setActiveTab("마이페이지");
            closeAlarmPage();
          }}
        >
          <span className="nav-icon"><UserRound size={22} /></span>
          <span>마이페이지</span>
        </button>
      </div>
    </div>
  );
}