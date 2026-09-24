const paths = {
  shield: 'M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6l7-3z',
  shieldCheck: 'M12 3l7 3v5.5c0 4.5-3 7.8-7 9.5-4-1.7-7-5-7-9.5V6l7-3z M9 12l2 2 4-4',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  alert: 'M12 8v5 M12 16.5v.01 M12 3a9 9 0 100 18 9 9 0 000-18z',
  lock: 'M6 11h12v10H6z M8.5 11V8a3.5 3.5 0 017 0v3',
  chart: 'M4 20h16 M7 16l4-5 3 3 5-7',
  arrowLeft: 'M19 12H5 M11 18l-6-6 6-6',
  printer: 'M7 9V3h10v6 M7 17H5a2 2 0 01-2-2v-4a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2h-2 M7 14h10v7H7z',
  plus: 'M12 5v14 M5 12h14',
  chevronDown: 'M6 9l6 6 6-6',
  file: 'M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5z M14 3v5h5 M9 13h6 M9 17h4',
  calculator: 'M6 3h12a1 1 0 011 1v16a1 1 0 01-1 1H6a1 1 0 01-1-1V4a1 1 0 011-1z M8 7h8v3H8z M8.5 14h.01 M12 14h.01 M15.5 14h.01 M8.5 17.5h.01 M12 17.5h.01 M15.5 17.5h.01',
  logout: 'M15 4h3a2 2 0 012 2v12a2 2 0 01-2 2h-3 M10 17l5-5-5-5 M15 12H4',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 100 6 3 3 0 000-6z',
  eyeOff: 'M3 3l18 18 M10.6 5.1A10.4 10.4 0 0112 5c6.5 0 10 7 10 7a17 17 0 01-3.2 4.1 M6.6 6.6A17 17 0 002 12s3.5 7 10 7a9.7 9.7 0 005.4-1.6 M9.9 9.9a3 3 0 004.2 4.2',
  zap: 'M13 2L4 14h7l-1 8 9-12h-7l1-8z',
  layers: 'M12 3l9 5-9 5-9-5 9-5z M3 13l9 5 9-5',
  menu: 'M4 7h16 M4 12h16 M4 17h16',
  x: 'M6 6l12 12 M18 6L6 18',
  help: 'M12 3a9 9 0 100 18 9 9 0 000-18z M9.5 9.5a2.5 2.5 0 014.6 1.3c0 1.7-2.1 2-2.1 3.4 M12 17h.01',
  arrowUpRight: 'M7 17L17 7 M8 7h9v9',
} as const

export type IconName = keyof typeof paths

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d={paths[name]} />
    </svg>
  )
}
