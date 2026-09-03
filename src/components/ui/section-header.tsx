type SectionHeaderProps = {
  title: string;
  description?: string;
};

export function SectionHeader({ title, description }: SectionHeaderProps) {
  return (
    <div>
      <h2 style={{ marginBottom: 8 }}>{title}</h2>
      {description ? <p className="surface-copy" style={{ margin: 0 }}>{description}</p> : null}
    </div>
  );
}
