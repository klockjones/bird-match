export type PlayerItem = {
  id: string;
  name: string;
  gender: string | null;
  level: string | null;
  phone: string | null;
  memo: string | null;
  is_active: boolean;
  created_at: string;
};

export type EventPlayerItem = {
  id: string;
  team: string | null;
  seed: number | null;
  note: string | null;
  created_at: string;
  player: PlayerItem;
};
