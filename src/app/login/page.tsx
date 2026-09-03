import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function LoginPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="page-shell" style={{ maxWidth: 560 }}>
      <section className="surface-card" style={{ display: "grid", gap: 16 }}>
        <div>
          <p className="matchboard-eyebrow" style={{ color: "#1d4ed8", opacity: 1 }}>Bird Match Admin</p>
          <h1 style={{ margin: "8px 0 0" }}>운영진 로그인</h1>
          <p className="surface-copy">운영진 계정으로 로그인해 매치보드를 관리합니다.</p>
        </div>
        <AuthForm />
      </section>
    </main>
  );
}
