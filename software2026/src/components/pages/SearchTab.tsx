import { useState } from "react";
import type { Supplement } from "../Home";
import "../styles/SearchTab.css";

type SearchTabProps = {
  supplements: Supplement[];
  onOpenNotification: () => void;
};

export default function SearchTab({
  supplements,
  onOpenNotification,
}: SearchTabProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const searchedSupplements = supplements.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>검색</h1>
          <p>등록한 영양제를 빠르게 찾아보세요</p>
        </div>
        <button
          type="button"
          className="top-bell-button"
          onClick={onOpenNotification}
        >
          ♧
        </button>
      </div>

      <div className="search-section">
        <h2>영양제 검색</h2>

        <input
          type="text"
          placeholder="영양제 이름 검색"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />

        <div className="search-list">
          {searchQuery.trim() !== "" &&
            searchedSupplements.map((item) => (
              <div className="search-item" key={item.id}>
                <div>
                  <div className="name">{item.name}</div>
                  <div className="desc">{item.desc}</div>
                </div>
                <div className="time">{item.time}</div>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}