type IconName = 'chevron-down' | 'chevron-right' | 'check' | 'alert' | 'info' | 'arrow-right' | 'menu' | 'close' | 'search' | 'external' | 'plus' | 'mic' | 'arrow-up' | 'file' | 'grip' | 'more' | 'store' | 'truck' | 'box'

const paths: Record<IconName, React.ReactNode> = {
  'chevron-down': <path d="M3.5 6 8 10.5 12.5 6" />,
  check: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
  alert: <><path d="M8 2.5 14 13.5H2L8 2.5Z" /><path d="M8 6.5v3.2M8 11.6v.1" /></>,
  info: <><circle cx="8" cy="8" r="6" /><path d="M8 7.2v3.8M8 5v.1" /></>,
  'arrow-right': <path d="M3 8h10M9 4l4 4-4 4" />,
  'chevron-right': <path d="M6 3.5 10.5 8 6 12.5" />,
  menu: <path d="M2.5 4.5h11M2.5 8h11M2.5 11.5h11" />,
  close: <path d="M4 4l8 8M12 4l-8 8" />,
  search: <><circle cx="7" cy="7" r="4.25" /><path d="m10.2 10.2 3.3 3.3" /></>,
  store: <><path d="M2.5 6.5 3.5 3h9l1 3.5" /><path d="M2.5 6.5h11c0 1.1-.9 2-2 2s-1.8-.9-1.8-2c0 1.1-.8 2-1.7 2s-1.7-.9-1.7-2c0 1.1-.8 2-1.8 2s-2-.9-2-2Z" /><path d="M3.5 8.5v4.5h9V8.5M6.5 13v-2.5h3V13" /></>,
  truck: <><path d="M1.5 4h8v7h-8zM9.5 6.5h3l2 2.5v2h-5" /><circle cx="4.5" cy="12" r="1.3" /><circle cx="11.5" cy="12" r="1.3" /></>,
  box: <><path d="M2.5 5 8 2.5 13.5 5v6L8 13.5 2.5 11z" /><path d="M2.5 5 8 7.5 13.5 5M8 7.5v6" /></>,
  grip: <><circle cx="6" cy="4" r=".9" /><circle cx="10" cy="4" r=".9" /><circle cx="6" cy="8" r=".9" /><circle cx="10" cy="8" r=".9" /><circle cx="6" cy="12" r=".9" /><circle cx="10" cy="12" r=".9" /></>,
  more: <><circle cx="3.5" cy="8" r=".9" /><circle cx="8" cy="8" r=".9" /><circle cx="12.5" cy="8" r=".9" /></>,
  plus: <path d="M8 3v10M3 8h10" />,
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
