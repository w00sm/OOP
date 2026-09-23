import { useEffect, useRef } from "react";

declare global {
  interface Window {
    google: any;
  }
}

type GoogleUser = {
  name: string;
  email: string;
  picture?: string;
};

type GoogleLoginButtonProps = {
  onLogin: (user: GoogleUser) => void;
};

export default function GoogleLoginButton({ onLogin }: GoogleLoginButtonProps) {
  const buttonRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const initGoogle = () => {
      if (!window.google || !buttonRef.current) {
        setTimeout(initGoogle, 300);
        return;
      }

      window.google.accounts.id.initialize({
        client_id: "855498572976-r0toq7jnv1ubu9og60lb8a4qek1jitns.apps.googleusercontent.com",
        callback: (response: any) => {
          console.log("구글 로그인 응답:", response);

          const base64Url = response.credential.split(".")[1];
          const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
          const payload = JSON.parse(
            decodeURIComponent(
              atob(base64)
                .split("")
                .map((c) => {
                  return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
                })
                .join("")
            )
          );

          const user: GoogleUser = {
            name: payload.name,
            email: payload.email,
            picture: payload.picture,
          };

          console.log("로그인 사용자:", user);

          localStorage.setItem("loginUser", JSON.stringify(user));
          onLogin(user);
        },
      });

      buttonRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 250,
      });
    };

    initGoogle();
  }, [onLogin]);

  return <div className="google-login-wrap" ref={buttonRef}></div>;
}