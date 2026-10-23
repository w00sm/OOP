import type { InputHTMLAttributes } from "react";
import { X } from "lucide-react";
import "./ClearableInput.css";

// 오른쪽 끝에 X가 있는 입력칸: 누르면 입력한 내용을 한 번에 지웁니다. (내용이 있을 때만 보임)

type ClearableInputProps = InputHTMLAttributes<HTMLInputElement> & {
  onClear: () => void;
  wrapperClassName?: string; // 입력칸을 감싸는 상자에 줄 클래스 (예: 가로 배치에서 늘어나게 "grow")
};

export default function ClearableInput({ onClear, wrapperClassName = "", ...inputProps }: ClearableInputProps) {
  const hasValue = String(inputProps.value ?? "") !== "";
  return (
    <div className={`clearable ${wrapperClassName}`}>
      <input {...inputProps} />
      {hasValue && !inputProps.disabled && (
        <button
          type="button"
          className="clear-input"
          aria-label="입력 지우기"
          // 입력칸에서 포커스가 빠지지 않게 (휴대폰 키보드가 내려가지 않도록)
          onMouseDown={(event) => event.preventDefault()}
          onClick={onClear}
        >
          <X size={13} strokeWidth={2.6} />
        </button>
      )}
    </div>
  );
}
