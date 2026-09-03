export const EVENT_TYPES = ["general", "blue_white"] as const;
export const EVENT_STATUSES = ["draft", "published", "closed"] as const;

export type EventType = (typeof EVENT_TYPES)[number];
export type EventStatus = (typeof EVENT_STATUSES)[number];

export type EventListItem = {
  id: string;
  title: string;
  public_uuid: string;
  event_type: EventType;
  status: EventStatus;
  event_date: string | null;
  location: string | null;
  is_public: boolean;
  scoring_rule: string;
  team_label_1: string | null;
  team_label_2: string | null;
  created_at: string;
};

export type EventDetailItem = EventListItem & {
  updated_at: string;
};
