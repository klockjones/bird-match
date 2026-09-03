type OperatorTopBarProps = {
  name?: string | null;
};

export function OperatorTopBar({ name }: OperatorTopBarProps) {
  return (
    <div className="operator-topbar">
      <div className="operator-topbar-user">
        <span className="operator-topbar-name">{name || "운영자"}</span>
      </div>
      <form action="/auth/logout" method="post">
        <button type="submit" className="operator-topbar-logout">로그아웃</button>
      </form>
    </div>
  );
}
