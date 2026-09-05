type IconProps = {
  className?: string;
};

const commonProps = {
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

export function CalendarIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <line x1="3" y1="10" x2="21" y2="10" />
      <line x1="8" y1="3" x2="8" y2="7" />
      <line x1="16" y1="3" x2="16" y2="7" />
    </svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <circle cx="9" cy="8" r="3" />
      <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M15.5 20c0-2.4 1.6-4.2 3.5-4.6" />
    </svg>
  );
}

export function BracketIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M4 6v4a2 2 0 0 0 2 2h4" />
      <path d="M20 6v4a2 2 0 0 1-2 2h-4" />
      <line x1="10" y1="12" x2="14" y2="12" />
      <line x1="12" y1="12" x2="12" y2="19" />
      <circle cx="4" cy="6" r="1.4" />
      <circle cx="20" cy="6" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </svg>
  );
}

export function ChecklistIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M4 6.5l1.4 1.4L8 5.2" />
      <line x1="11" y1="6.5" x2="20" y2="6.5" />
      <path d="M4 12.5l1.4 1.4 2.6-2.7" />
      <line x1="11" y1="12.5" x2="20" y2="12.5" />
      <path d="M4 18.5l1.4 1.4 2.6-2.7" />
      <line x1="11" y1="18.5" x2="20" y2="18.5" />
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <svg {...commonProps} className={className}>
      <path d="M12 3l7 3v5c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-3z" />
      <path d="M9 12l2 2 4-4" />
    </svg>
  );
}
