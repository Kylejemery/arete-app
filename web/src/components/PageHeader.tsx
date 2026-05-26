interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-4 md:mb-6">
      <h1 className="text-xl md:text-2xl font-bold text-arete-text">{title}</h1>
      {subtitle && <p className="text-arete-muted text-xs md:text-sm mt-1">{subtitle}</p>}
    </div>
  );
}
