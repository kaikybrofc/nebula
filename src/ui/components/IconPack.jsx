function IconBase({ children, className = '', size = 20 }) {
  return (
    <svg
      className={`ui-icon ${className}`.trim()}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function SettingsIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.5 12a1.5 1.5 0 0 0 1.1 1.44l.02.01a1.8 1.8 0 0 1 .44 3.1l-.08.08a1.8 1.8 0 0 1-3.1-.44l-.01-.02A1.5 1.5 0 0 0 16.44 15a1.5 1.5 0 0 0-1.44 1.1l-.01.02a1.8 1.8 0 0 1-3.1.44l-.08-.08a1.8 1.8 0 0 1 .44-3.1l.02-.01A1.5 1.5 0 0 0 9 12a1.5 1.5 0 0 0-1.1-1.44l-.02-.01a1.8 1.8 0 0 1-.44-3.1l.08-.08a1.8 1.8 0 0 1 3.1.44l.01.02A1.5 1.5 0 0 0 12 9a1.5 1.5 0 0 0 1.44-1.1l.01-.02a1.8 1.8 0 0 1 3.1-.44l.08.08a1.8 1.8 0 0 1-.44 3.1l-.02.01A1.5 1.5 0 0 0 19.5 12Z" />
    </IconBase>
  );
}

export function LeaderboardIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M6 19V9" />
      <path d="M12 19V5" />
      <path d="M18 19v-7" />
    </IconBase>
  );
}

export function TrophyIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 5h8v2a4 4 0 0 1-8 0V5Z" />
      <path d="M10 15h4" />
      <path d="M12 11v4" />
      <path d="M9 19h6" />
      <path d="M8 7H6a2 2 0 0 0 2 2" />
      <path d="M16 7h2a2 2 0 0 1-2 2" />
    </IconBase>
  );
}

export function SplitIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="8.5" cy="12" r="3.2" />
      <circle cx="15.5" cy="12" r="3.2" />
      <path d="M12 5v14" />
    </IconBase>
  );
}

export function EjectIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="8" cy="12" r="3.2" />
      <path d="M13 12h7" />
      <path d="m17 8 4 4-4 4" />
    </IconBase>
  );
}

export function FullscreenIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M8 3H3v5" />
      <path d="M16 3h5v5" />
      <path d="M3 16v5h5" />
      <path d="M21 16v5h-5" />
    </IconBase>
  );
}

export function MinimapIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="16" height="16" rx="2.6" />
      <circle cx="12" cy="12" r="1.6" />
      <path d="M12 4v3" />
      <path d="M12 17v3" />
      <path d="M4 12h3" />
      <path d="M17 12h3" />
    </IconBase>
  );
}

export function SoundIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M5 10v4h3l4 3V7l-4 3H5Z" />
      <path d="M16.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.8 6.2a8.5 8.5 0 0 1 0 11.6" />
    </IconBase>
  );
}

export function HelpIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.7 2.7 0 1 1 4.76 1.74c-.64.73-1.26 1.22-1.26 2.06" />
      <circle cx="12" cy="16.8" r="0.7" fill="currentColor" stroke="none" />
    </IconBase>
  );
}
