type SummaryCardProps = {
  label: string;
  value: string | number;
  meta?: string;
  className?: string;
};

export function SummaryCard({ label, value, meta, className }: SummaryCardProps) {
  return (
    <article className={className ?? "admin-summary-card"}>
      <span className="admin-summary-label">{label}</span>
      <span className="admin-summary-value">{value}</span>
      {meta ? <span className="event-overview-meta">{meta}</span> : null}
    </article>
  );
}
