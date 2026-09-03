export type AppUserItem = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "staff";
  created_at: string;
};

export type EventStaffItem = {
  id: string;
  role: "owner" | "staff" | "viewer";
  created_at: string;
  user: AppUserItem;
};
