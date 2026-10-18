export function IconSearch({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="19" cy="19" r="11" stroke="currentColor" strokeWidth="2" />
      <path d="M28 28l8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconSettings({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 44 44" fill="none" aria-hidden>
      <circle cx="22" cy="22" r="6.5" stroke="currentColor" strokeWidth="2" />
      <path
        d="M22 8v-3M22 39v-3M8 22H5M39 22h-3M11.8 11.8 9.6 9.6M34.4 34.4 32.2 32.2M11.8 32.2 9.6 34.4M34.4 9.6 32.2 11.8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconKeyboard({ size = 30 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 30 30" fill="none" aria-hidden>
      <rect x="2.5" y="8" width="25" height="15" rx="3" stroke="currentColor" strokeWidth="2" />
      <path
        d="M7 13h2.2M12 13h2.2M17 13h2.2M22 13h1.4M7 18h16"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function IconInfo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="2" />
      <path d="M16 14.5v8M16 10v2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconReplay({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden>
      <path
        d="M7 14a7 7 0 1 0 2-4.9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M7 5.5V12h6.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function IconLock({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
      <rect x="4" y="10" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M7 10V7.5a4 4 0 0 1 8 0V10" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}
