type IconName = 'chevron-down' | 'chevron-right' | 'chevron-left' | 'check' | 'alert' | 'info' | 'arrow-right' | 'menu' | 'close' | 'search' | 'external' | 'plus' | 'minus' | 'mic' | 'arrow-up' | 'file' | 'grip' | 'more' | 'question' | 'copy' | 'list-bullet' | 'list-number' | 'trend-up' | 'arrow-down' | 'mic-off' | 'captions' | 'phone-down' | 'calendar' | 'bell' | 'chat'

const paths: Record<IconName, React.ReactNode> = {
  'chevron-down': <path d="M3.5 6 8 10.5 12.5 6" />,
  check: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
  alert: <><path d="M8 2.5 14 13.5H2L8 2.5Z" /><path d="M8 6.5v3.2M8 11.6v.1" /></>,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.2v3.8M8 5v.1" /></>,
  'arrow-right': <path d="M3 8h10M9 4l4 4-4 4" />,
  'chevron-right': <path d="M6 3.5 10.5 8 6 12.5" />,
  'chevron-left': <path d="M10 3.5 5.5 8 10 12.5" />,
  menu: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  search: <><circle cx="7" cy="7" r="4.25" /><path d="m10.2 10.2 3.3 3.3" /></>,
  question: <><circle cx="8" cy="8" r="6" /><path d="M6.3 6.2a1.8 1.8 0 0 1 3.5.5c0 1.2-1.8 1.5-1.8 2.6M8 11.4v.1" /></>,
  grip: <><circle cx="6" cy="4" r=".9" /><circle cx="10" cy="4" r=".9" /><circle cx="6" cy="8" r=".9" /><circle cx="10" cy="8" r=".9" /><circle cx="6" cy="12" r=".9" /><circle cx="10" cy="12" r=".9" /></>,
  more: <><circle cx="3.5" cy="8" r=".9" /><circle cx="8" cy="8" r=".9" /><circle cx="12.5" cy="8" r=".9" /></>,
  copy: <><rect x="5.5" y="5.5" width="8" height="8" rx="1.5" /><path d="M10.5 3.5v-.5a1 1 0 0 0-1-1H3.5a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h.5" /></>,
  'list-bullet': <><path d="M6.5 4.5h7M6.5 8h7M6.5 11.5h7" /><circle cx="3.2" cy="4.5" r=".8" /><circle cx="3.2" cy="8" r=".8" /><circle cx="3.2" cy="11.5" r=".8" /></>,
  'list-number': <><path d="M6.5 4.5h7M6.5 8h7M6.5 11.5h7" /><path d="M2.6 3.4 3.4 3v3M2.4 9.3c.2-.5 1.6-.6 1.6.2 0 .6-1.6 1.2-1.6 1.9h1.7" /></>,
  'trend-up': <><path d="M2 11.5 6 7.5l2.5 2.5L14 4.5" /><path d="M10 4.5h4v4" /></>,
  'arrow-down': <path d="M8 3v10M4 9l4 4 4-4" />,
  plus: <path d="M8 3v10M3 8h10" />,
  minus: <path d="M3.5 8h9" />,
  'mic-off': <><rect x="6" y="2" width="4" height="7.5" rx="2" /><path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2M2.5 2.5l11 11" /></>,
  captions: <><rect x="1.8" y="3.5" width="12.4" height="9" rx="1.6" /><path d="M4.5 7h3M9 7h2.5M4.5 9.5h2M8 9.5h3.5" /></>,
  'phone-down': <path d="M1.8 9.4c3.5-3.1 8.9-3.1 12.4 0l-1.3 1.8-2.6-.7-.3-1.7a7.3 7.3 0 0 0-4 0l-.3 1.7-2.6.7z" />,
  bell: <><path d="M12 6.2a4 4 0 0 0-8 0c0 4.3-1.8 5.3-1.8 5.3h11.6S12 10.5 12 6.2Z" /><path d="M6.8 13.7a1.4 1.4 0 0 0 2.4 0" /></>,
  chat: <><path d="M14 7.8c0 3-2.7 5.4-6 5.4a6.6 6.6 0 0 1-2.4-.5L2.3 13.6l1.1-2.6A5.1 5.1 0 0 1 2 7.8c0-3 2.7-5.3 6-5.3s6 2.4 6 5.3Z" /><path d="M5.4 7.9h.01M8 7.9h.01M10.6 7.9h.01" /></>,
  calendar: <><rect x="2.5" y="3.5" width="11" height="10" rx="1.5" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></>,
  mic: <><rect x="6" y="2" width="4" height="7.5" rx="2" /><path d="M3.5 7.5a4.5 4.5 0 0 0 9 0M8 12v2" /></>,
  'arrow-up': <path d="M8 13V3M4 7l4-4 4 4" />,
  file: <><path d="M4 1.8h5l3 3v9.4H4z" /><path d="M9 1.8v3h3" /></>,
  external: <path d="M9.5 2.5h4v4M13.5 2.5 8 8M11.5 9.5v3a1 1 0 0 1-1 1h-7a1 1 0 0 1-1-1v-7a1 1 0 0 1 1-1h3" />,
}

/** Small, quiet line icons. Decorative unless given a label. */
export function Icon({ name, size = 16, label }: { name: IconName; size?: number; label?: string }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor"
      strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true}
    >
      {paths[name]}
    </svg>
  )
}
