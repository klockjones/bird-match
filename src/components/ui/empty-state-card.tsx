type EmptyStateCardProps = {
  message: string;
};

export function EmptyStateCard({ message }: EmptyStateCardProps) {
  return <div className="empty-card">{message}</div>;
}
