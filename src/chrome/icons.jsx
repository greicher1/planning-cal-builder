// The chrome's icon set: a handful of 16×16 stroke glyphs, drawn here as plain geometry.
//
// Deliberately NOT @tabler/icons-react or any icon package: the app inlines everything into one
// file, and a dependency would bring a build-graph's worth of icons to use nine. Every glyph is
// currentColor stroke so it inherits its label's ink, and every one is aria-hidden -- the label
// text beside it is the accessible name.
//
// The three sidebar TAB icons live as raw SVG in src/index.html (the tab strip is static-skeleton
// markup the engine wires at evaluation time); these are their React-side siblings for the card
// headers. Keep the two families visually consistent: 16 viewBox, stroke 1.6, round caps.

const base = {
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': 'true',
  focusable: 'false',
}

export function IconTv(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="4.5" width="12" height="8.5" rx="1.5" />
      <path d="M5.5 1.5 8 4.5 10.5 1.5" />
    </svg>
  )
}

export function IconMapPin(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 14.5C8 14.5 3.5 10.6 3.5 7a4.5 4.5 0 1 1 9 0c0 3.6-4.5 7.5-4.5 7.5Z" />
      <circle cx="8" cy="7" r="1.6" />
    </svg>
  )
}

export function IconCalendarDot(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 1.5v3M10.5 1.5v3" />
      <circle cx="8" cy="10" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  )
}

export function IconFolder(props) {
  return (
    <svg {...base} {...props}>
      <path d="M1.5 4.5a1 1 0 0 1 1-1h3.2l1.6 2h6.2a1 1 0 0 1 1 1v5.5a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1Z" />
    </svg>
  )
}

export function IconFilePlus(props) {
  return (
    <svg {...base} {...props}>
      <path d="M9 1.5H4.5a1 1 0 0 0-1 1v11a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1V5Z" />
      <path d="M9 1.5V5h3.5" />
      <path d="M8 8v3.4M6.3 9.7h3.4" />
    </svg>
  )
}

export function IconFloppy(props) {
  return (
    <svg {...base} {...props}>
      <path d="M2.5 3.5a1 1 0 0 1 1-1h7.6l2.4 2.4v8.6a1 1 0 0 1-1 1h-9a1 1 0 0 1-1-1Z" />
      <path d="M5 2.5V6h5V2.5" />
      <path d="M4.5 14.5V10h7v4.5" />
    </svg>
  )
}

export function IconCopyPlus(props) {
  return (
    <svg {...base} {...props}>
      <rect x="5.5" y="5.5" width="8" height="8" rx="1.2" />
      <path d="M10.5 2.5h-7a1 1 0 0 0-1 1v7" />
    </svg>
  )
}

export function IconTable(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M2 6h12M6.5 6v7.5" />
    </svg>
  )
}

export function IconShare(props) {
  return (
    <svg {...base} {...props}>
      <path d="M7 3.5H3.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9" />
      <path d="M9.5 2.5h4v4M13.2 2.8 8 8" />
    </svg>
  )
}

export function IconRows(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
      <path d="M2 6.2h12M2 9.9h12" />
    </svg>
  )
}

export function IconCalendarPlain(props) {
  return (
    <svg {...base} {...props}>
      <rect x="2.5" y="3.5" width="11" height="10" rx="1.5" />
      <path d="M2.5 6.5h11M5.5 1.5v3M10.5 1.5v3" />
    </svg>
  )
}

export function IconDownload(props) {
  return (
    <svg {...base} {...props}>
      <path d="M8 2v7.5M5 6.7 8 9.7l3-3" />
      <path d="M2.5 12.8h11" />
    </svg>
  )
}
