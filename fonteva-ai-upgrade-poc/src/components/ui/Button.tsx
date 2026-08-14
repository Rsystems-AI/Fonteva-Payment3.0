import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/util";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "success" | "outline";
  size?: "xs" | "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = "primary", size = "md", className, children, ...rest },
  ref,
) {
  const base = "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed focus-ring shadow-soft";
  const sizes = {
    xs: "h-7 px-2.5 text-[11.5px]",
    sm: "h-8 px-3 text-[12.5px]",
    md: "h-10 px-4 text-[13px]",
    lg: "h-11 px-5 text-[14px]",
  }[size];
  const variants = {
    primary: "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white shadow-indigo-200/60",
    secondary: "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800",
    outline: "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700",
    ghost: "text-slate-600 hover:text-slate-900 hover:bg-slate-100",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-rose-200/60",
    success: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200/60",
  }[variant];
  return (
    <button ref={ref} className={cn(base, sizes, variants, className)} {...rest}>
      {children}
    </button>
  );
});
