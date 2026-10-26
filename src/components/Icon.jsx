// Small built-in icon set. The "icon" column in Google Sheets picks one of these names.
const PATHS = {
  home: <path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10" />,
  reports: <path d="M4 20h16M7 20v-8M12 20V5M17 20v-5" />,
  services: <path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" />,
  settings: (
    <>
      <path d="M4 6h8M18 6h2M4 12h2M12 12h8M4 18h10M20 18h0" />
      <circle cx="15" cy="6" r="2.2" />
      <circle cx="9" cy="12" r="2.2" />
      <circle cx="17" cy="18" r="2.2" />
    </>
  ),
  logout: <path d="M9 4H5v16h4M16 8l4 4-4 4M20 12H9" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20v-1a5 5 0 015-5h3a5 5 0 015 5v1M16 4.5a3.5 3.5 0 010 7M21.5 20v-1a5 5 0 00-3.5-4.8" />
    </>
  ),
  docs: <path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" />,
  support: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" />
    </>
  ),
  calendar: <path d="M4 6h16v14H4zM4 10h16M8 3v4M16 3v4" />,
  bell: <path d="M6 16v-5a6 6 0 1112 0v5l2 2H4zM10 21h4" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="M6 6l12 12M18 6L6 18" />,
  chevronLeft: <path d="M15 5l-7 7 7 7" />,
  chevronRight: <path d="M9 5l7 7-7 7" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: <path d="M3 3l18 18M10.6 6.2A10 10 0 0112 6c6.5 0 10 6 10 6a17 17 0 01-3.2 3.9M6.6 7.6A17 17 0 002 12s3.5 6 10 6a10 10 0 004.2-.9M9.9 9.9a3 3 0 004.2 4.2" />,
  shield: <path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M9 12l2 2 4-4" />,
  layers: <path d="M12 3l9 5-9 5-9-5zM3 13l9 5 9-5" />,
  bolt: <path d="M13 3L5 14h6l-1 7 8-11h-6z" />,
  alert: <path d="M12 4l9 16H3zM12 10v4M12 17h.01" />,
  default: <rect x="4" y="4" width="16" height="16" rx="3" />,
};

export default function Icon({ name, size = 24, className = '' }) {
  const content = PATHS[name] || PATHS.default;
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {content}
    </svg>
  );
}
