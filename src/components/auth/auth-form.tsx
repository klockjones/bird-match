"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/browser";

export function AuthForm() {
  const router = useRouter();
  const supabase = createClient();

  const [loginMessage, setLoginMessage] = useState("");
  const [signupMessage, setSignupMessage] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);

  async function handleLoginSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("loginEmail") ?? "");
    const password = String(formData.get("loginPassword") ?? "");

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoginMessage(error ? error.message : "로그인되었습니다. 대시보드로 이동합니다.");

    if (!error) {
      router.push("/dashboard");
      router.refresh();
    }

    setLoginLoading(false);
  }

  async function handleSignupSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSignupLoading(true);
    setSignupMessage("");

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("signupName") ?? "");
    const email = String(formData.get("signupEmail") ?? "");
    const password = String(formData.get("signupPassword") ?? "");
    const passwordConfirm = String(formData.get("signupPasswordConfirm") ?? "");

    if (password !== passwordConfirm) {
      setSignupMessage("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
      setSignupLoading(false);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
        emailRedirectTo: typeof window === "undefined" ? undefined : `${window.location.origin}/auth/callback`,
      },
    });

    setSignupMessage(error ? error.message : "회원가입 요청이 접수되었습니다. 이메일 인증 후 로그인하세요.");
    setSignupLoading(false);
  }

  return (
    <div className="auth-sections">
      <section className="surface-subcard" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>로그인</h2>
          <p className="surface-copy">기존 운영 계정으로 바로 시작합니다.</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="auth-form" noValidate>
          <label className="form-field">
            <span className="form-label">이메일</span>
            <input
              name="loginEmail"
              type="email"
              defaultValue=""
              required
              autoComplete="email"
              inputMode="email"
              placeholder="name@example.com"
            />
          </label>

          <label className="form-field">
            <span className="form-label">비밀번호</span>
            <input
              name="loginPassword"
              type="password"
              defaultValue=""
              required
              minLength={8}
              autoComplete="current-password"
              placeholder="비밀번호를 입력하세요"
            />
          </label>

          <button type="submit" disabled={loginLoading} className="primary-button">
            {loginLoading ? "처리 중..." : "로그인"}
          </button>

          {loginMessage ? <p className="form-message">{loginMessage}</p> : null}
        </form>
      </section>

      <section className="surface-subcard" style={{ display: "grid", gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20 }}>회원가입</h2>
          <p className="surface-copy">새 운영 계정을 만들 때는 비밀번호를 두 번 입력해 검증합니다.</p>
        </div>

        <form onSubmit={handleSignupSubmit} className="auth-form" noValidate>
          <label className="form-field">
            <span className="form-label">이름</span>
            <input
              name="signupName"
              type="text"
              defaultValue=""
              required
              autoComplete="name"
              placeholder="이름을 입력하세요"
            />
          </label>

          <label className="form-field">
            <span className="form-label">이메일</span>
            <input
              name="signupEmail"
              type="email"
              defaultValue=""
              required
              autoComplete="email"
              inputMode="email"
              placeholder="name@example.com"
            />
          </label>

          <label className="form-field">
            <span className="form-label">비밀번호</span>
            <input
              name="signupPassword"
              type="password"
              defaultValue=""
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="8자 이상 비밀번호"
            />
          </label>

          <label className="form-field">
            <span className="form-label">비밀번호 확인</span>
            <input
              name="signupPasswordConfirm"
              type="password"
              defaultValue=""
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="비밀번호를 한 번 더 입력하세요"
            />
          </label>

          <button type="submit" disabled={signupLoading} className="primary-button">
            {signupLoading ? "처리 중..." : "회원가입"}
          </button>

          {signupMessage ? <p className="form-message">{signupMessage}</p> : null}
        </form>
      </section>
    </div>
  );
}
