interface CardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function Card({ title, value, description, icon, className = '' }: CardProps) {
  return (
    <div className={`card-premium p-6 flex items-start justify-between gap-4 ${className}`}>
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-3 text-3xl font-bold text-primary">{value}</p>
        {description && (
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {icon && (
        <div className="icon-accent rounded-lg p-3 flex-shrink-0">
          {icon}
        </div>
      )}
    </div>
  );
}
