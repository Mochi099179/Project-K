import type { HTMLAttributes } from "react";

export function Card({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`rounded-[1.3rem] border border-border bg-card ${className}`}
      {...props}
    />
  );
}
