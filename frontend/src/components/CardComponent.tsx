import type { ReactNode } from "react";

interface CardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  className?: string;
}

export function CardComponent({
  title,
  value,
  description,
  icon,
  className = "",
}: CardProps) {
  return (
    <div className={`card-premium flex items-start justify-between gap-4 p-6 ${className}`}>
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <p className="mt-3 text-3xl font-bold text-primary">{value}</p>
        {description ? (
          <p className="mt-2 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>

      {icon ? (
        <div className="icon-accent flex-shrink-0 rounded-lg p-3">{icon}</div>
      ) : null}
    </div>
  );
}
