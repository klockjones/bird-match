import { createSupabaseServerClient } from "@/lib/supabase/server";

type OperatorTopBarProps = {
  name?: string | null;
};

export async function OperatorTopBar({ name }: OperatorTopBarProps) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  if (user) {
    const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
    role = data?.role ?? null;
  }

  return (
    <div className="operator-topbar">
      <div className="operator-topbar-user">
        <span className="operator-topbar-name-row">
          <span className="operator-topbar-name">{name || "운영자"}</span>
          {role ? <span className={`role-chip ${role}`}>{role}</span> : null}
        </span>
      </div>
      <form action="/auth/logout" method="post">
        <button type="submit" className="operator-topbar-logout">로그아웃</button>
      </form>
    </div>
  );
}
