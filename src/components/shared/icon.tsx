import type { HTMLAttributes } from "react";

interface IconProps extends HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number;
}

export function Icon({ name, size = 20, className, ...props }: IconProps) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className ?? ""}`}
      style={{ fontSize: size }}
      {...props}
    >
      {name}
    </span>
  );
}
