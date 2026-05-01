interface CardProps {
  children: React.ReactNode;
  className?: string;
  gold?: boolean;
}

export function Card({ children, className = '', gold = false }: CardProps) {
  return (
    <div
      className={`bg-academy-card rounded-lg border ${
        gold ? 'border-academy-gold' : 'border-academy-border'
      } p-5 ${className}`}
    >
      {children}
    </div>
  );
}

export function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-academy-gold text-xs font-semibold uppercase tracking-widest mb-2">
      {children}
    </p>
  );
}
