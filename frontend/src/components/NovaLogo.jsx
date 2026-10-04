import React, { useId } from "react";
import "./NovaLogo.css";

const SIZE_MAP = {
  xs: 20,
  sm: 24,
  md: 30,
  lg: 38,
};

export function NovaSymbol({
  size = 28,
  title = "Nova",
  decorative = false,
  className = "",
}) {
  const reactId = useId();
  const gradientId = `nova-symbol-amber-${reactId.replace(/:/g, "")}`;

  const ariaProps = decorative
    ? { "aria-hidden": true }
    : { role: "img", "aria-label": title };

  return (
    <svg
      className={`nova-brand__mark ${className}`.trim()}
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      focusable="false"
      {...ariaProps}
    >
      <defs>
        <linearGradient
          id={gradientId}
          x1="11"
          y1="8"
          x2="53"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#FFC07D" />
          <stop offset="0.52" stopColor="#ED9A5A" />
          <stop offset="1" stopColor="#D97A3C" />
        </linearGradient>
      </defs>

      <path
        d="M27.9 7.7c1.1-3.6 6.2-3.6 7.3 0l2.1 6.9a17.6 17.6 0 0 0 11.7 11.7l6.9 2.1c3.6 1.1 3.6 6.2 0 7.3L49 37.8a17.6 17.6 0 0 0-11.7 11.7l-2.1 6.9c-1.1 3.6-6.2 3.6-7.3 0l-2.1-6.9a17.6 17.6 0 0 0-11.7-11.7l-6.9-2.1c-3.6-1.1-3.6-6.2 0-7.3l6.9-2.1a17.6 17.6 0 0 0 11.7-11.7l2.1-6.9Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="4.3"
        strokeLinejoin="round"
      />

      <path
        d="M48.8 6.5c.6-2 3.4-2 4 0l.7 2.2a5.7 5.7 0 0 0 3.8 3.8l2.2.7c2 .6 2 3.4 0 4l-2.2.7a5.7 5.7 0 0 0-3.8 3.8l-.7 2.2c-.6 2-3.4 2-4 0l-.7-2.2a5.7 5.7 0 0 0-3.8-3.8l-2.2-.7c-2-.6-2-3.4 0-4l2.2-.7a5.7 5.7 0 0 0 3.8-3.8l.7-2.2Z"
        fill={`url(#${gradientId})`}
      />
    </svg>
  );
}

export default function NovaLogo({
  size = "md",
  subtitle,
  iconOnly = false,
  className = "",
}) {
  const symbolSize = SIZE_MAP[size] || SIZE_MAP.md;
  const rootClassName = [
    "nova-brand",
    `nova-brand--${SIZE_MAP[size] ? size : "md"}`,
    iconOnly ? "nova-brand--icon-only" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (iconOnly) {
    return (
      <span className={rootClassName} aria-label="Nova">
        <NovaSymbol size={symbolSize} decorative />
      </span>
    );
  }

  return (
    <span
      className={rootClassName}
      aria-label={subtitle ? `Nova â€” ${subtitle}` : "Nova"}
    >
      <NovaSymbol size={symbolSize} decorative />

      <span className="nova-brand__copy">
        <span className="nova-brand__word">Nova</span>

        {subtitle && (
          <span className="nova-brand__subtitle">{subtitle}</span>
        )}
      </span>
    </span>
  );
}
