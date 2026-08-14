import { cn } from "@/lib/util";
import { ReactNode } from "react";

export function Card({
  className,
  children,
  padded = true,
}: {
  className?: string;
  children: ReactNode;
  padded?: boolean;
}) {
  return <div className={cn("card", padded && "p-5", className)}>{children}</div>;
}

export function CardHeader({
  title,
  subtitle,
  right,
  icon,
  compact = false,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  icon?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-3", compact ? "mb-3" : "mb-4")}>
      {icon}
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-900 leading-tight">{title}</div>
        {subtitle && <div className="text-xs text-slate-500 mt-0.5">{subtitle}</div>}
      </div>
      {right && <div className="ml-auto shrink-0">{right}</div>}
    </div>
  );
}
