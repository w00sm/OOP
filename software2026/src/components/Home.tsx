import { useState } from "react";
import "./Home.css";

import HomeTab from "./pages/HomeTab";
import SearchTab from "./pages/SearchTab";
import RecommendTab from "./pages/RecommendTab";
import WishTab from "./pages/WishTab";
import MyPageTab from "./pages/MyPageTab";

export type Tab = "홈" | "검색" | "추천" | "찜" | "마이페이지";
export type TimeCategory = "아침" | "점심" | "저녁";

export type Supplement = {
  id: number;
  name: string;
  desc: string;
  time: string;
  timeCategory: TimeCategory;
  checked: boolean;
};

export type NotificationItem = {
  id: number;
  title: string;
  time: string;
  content: string;
  active: boolean;
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("홈");
  const [openNotification, setOpenNotification] = useState(false);

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

  const notifications: NotificationItem[] = [
    {
      id: 1,
      title: "복용 시간 알림",
      time: "1시간 전",
      content: "종합비타민 복용 시간입니다 (09:00)",
      active: true,
    },
    {
      id: 2,
      title: "최저가 알림",
      time: "3시간 전",
      content: "[종근당] 루테인 지아잔틴이 5,000원 할인 중입니다",
      active: true,
    },
    {
      id: 3,
      title: "복용 시간 알림",
      time: "어제",
      content: "칼슘 복용 시간입니다 (12:30)",
      active: false,
    },
    {
      id: 4,
      title: "건강 팁",
      time: "2일 전",
      content: "규칙적인 영양제 복용은 건강 관리의 시작입니다",
      active: false,
    },
    {
      id: 5,
      title: "최저가 알림",
      time: "3일 전",
      content: "[대웅제약] 비타민D 3000IU 특가 진행 중",
      active: false,
    },
  ];

  const openAlarmPage = () => {
    setActiveTab("마이페이지");
    setOpenNotification(true);
  };

  return (
    <div className="container">
      {activeTab === "홈" && (
        <HomeTab
          supplements={supplements}
          setSupplements={setSupplements}
          onOpenNotification={openAlarmPage}
        />
      )}

      {activeTab === "검색" && (
        <SearchTab
          supplements={supplements}
          onOpenNotification={openAlarmPage}
        />
      )}

      {activeTab === "추천" && (
        <RecommendTab onOpenNotification={openAlarmPage} />
      )}

      {activeTab === "찜" && <WishTab onOpenNotification={openAlarmPage} />}

      {activeTab === "마이페이지" && (
        <MyPageTab
          notifications={notifications}
          openNotification={openNotification}
          setOpenNotification={setOpenNotification}
        />
      )}

      <div className="bottom-nav">
        <button
          className={activeTab === "홈" ? "active" : ""}
          onClick={() => {
            setActiveTab("홈");
            setOpenNotification(false);
          }}
        >
          홈
        </button>

        <button
          className={activeTab === "검색" ? "active" : ""}
          onClick={() => {
            setActiveTab("검색");
            setOpenNotification(false);
          }}
        >
          검색
        </button>

        <button
          className={activeTab === "추천" ? "active" : ""}
          onClick={() => {
            setActiveTab("추천");
            setOpenNotification(false);
          }}
        >
          추천
        </button>

        <button
          className={activeTab === "찜" ? "active" : ""}
          onClick={() => {
            setActiveTab("찜");
            setOpenNotification(false);
          }}
        >
          찜
        </button>

        <button
          className={activeTab === "마이페이지" ? "active" : ""}
          onClick={() => {
            setActiveTab("마이페이지");
            setOpenNotification(false);
          }}
        >
          마이페이지
        </button>
      </div>
    </div>
  );
}