export function Mark({ size = 42 }: { size?: number }) {
  return (
    <svg className="logo-mark" width={size} height={size} viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="cinefinAmb" x1="16" y1="16" x2="84" y2="84" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFD27A" />
          <stop offset="0.55" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#C2610C" />
        </linearGradient>
      </defs>
      <path
        d="M80.097,22.900 A40.5,40.5 0 1 0 80.097,77.100 L70.436,68.401 A27.5,27.5 0 1 1 70.436,31.599 Z"
        fill="url(#cinefinAmb)"
      />
      <path
        d="M43,35 L69,50 L43,65 Z"
        fill="url(#cinefinAmb)"
        stroke="url(#cinefinAmb)"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo({ size = 42, word = true }: { size?: number; word?: boolean }) {
  return (
    <span className="logo">
      <Mark size={size} />
      {word ? <span className="logo-word">cinefin</span> : null}
    </span>
  );
}
