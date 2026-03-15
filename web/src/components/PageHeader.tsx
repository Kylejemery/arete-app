interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-arete-text">{title}</h1>
      {subtitle && <p className="text-arete-muted text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
