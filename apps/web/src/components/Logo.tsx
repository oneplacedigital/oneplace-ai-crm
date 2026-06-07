/** Pipora brand lockup — diamond-cut infinity + wordmark (Ocean Pro). */

export function PiporaMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 140 90"
      width={size * 1.55}
      height={size}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="pip-loop" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#0EA5E9" />
          <stop offset="1" stopColor="#06B6D4" />
        </linearGradient>
      </defs>
      <g transform="translate(2,5)">
        <path
          d="M22 40 L48 24 L70 40 L92 24 L118 40 L92 56 L70 40 L48 56 Z"
          fill="none"
          stroke="url(#pip-loop)"
          strokeWidth="10"
          strokeLinejoin="miter"
        />
        <path d="M118 30 L128 40 L118 50 L108 40 Z" fill="#F59E0B" />
      </g>
    </svg>
  );
}

export function PiporaLogo({
  dark = false,
  markSize = 26,
}: {
  dark?: boolean;
  markSize?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <PiporaMark size={markSize} />
      <span
        className={`text-lg font-bold leading-none ${dark ? 'text-white' : 'text-ink-500'}`}
      >
        pipora<span className="text-brand">.ai</span>
      </span>
    </span>
  );
}
