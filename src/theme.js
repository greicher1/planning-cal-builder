// The chrome's design system, expressed as a Mantine theme.
//
// Every value here is settled in UI-CONVENTIONS.md §3 and was chosen against measurements of the
// existing app, not taste. Where a number looks arbitrary, the doc says why it is not. The two
// rules that govern the whole file:
//
//   1. ⛔ Nothing here may retint the FROZEN surface. UI-CONVENTIONS.md §2 finding 4 counted 39
//      places where frozen .sheet-* / .mv-* / @media print CSS reads a chrome neutral token —
//      including `border:2px solid var(--text)` on the waterfall's structural block borders. So
//      the tokens FORK: --text, --border-strong, --text-muted, --text-faint, --edit-accent,
//      --edit-accent-bg and --bg keep their literal values under their existing names in
//      legacy.css, and Mantine gets its own scale here. Do not "unify" them.
//   2. ⛔ Do not adopt Mantine's stock feedback colours. Measured: c="dimmed" (gray-6 #868e96) on
//      this app's ground is 3.07:1 where --text-faint is 4.98:1, and --text-faint carries a
//      comment recording that it was darkened from #9C988E specifically to reach AA. Mantine's
//      red-6 error ink is 3.28:1 against the app's 6.54:1, and <Alert color="yellow"
//      variant="light"> resolves to 2.69:1 against the current .gap-banner's 6.31:1. Taking the
//      defaults would regress contrast in four places and silently undo a documented fix.
import { defaultVariantColorsResolver } from '@mantine/core'

// Colour ramps. Each is interpolated between the app's real ground and its real ink, then the
// tested hexes are pinned exactly at the shades Mantine actually resolves.
const COLORS = {
  // primaryColor. Mantine's primaryShade default is {light:6}, and -filled / -filled-hover resolve
  // to 6 and 7 — which are exactly the two values the app already uses for --accent/--accent-hover.
  navy: ['#EAEEF2', '#D3DAE1', '#B4BFC9', '#8E9EAD', '#6C8093', '#4A6479',
         '#2C3E50', '#1C2833', '#141C24', '#0C1116'],

  // Mantine's light-mode globals read `gray` for dimmed, default-border, placeholder, disabled and
  // default-hover. Overriding the KEY (rather than adding a new name) is what makes every component
  // pick up the app's warm neutral with no per-component config; leaving Mantine's cool grey would
  // put a cool neutral beside the app's warm one on every surface.
  gray: ['#F7F6F3', '#EEECE5', '#E3E1DA', '#D9D7CE', '#C4C1B6', '#A5A197',
         '#726F68', '#5A5750', '#3E3C37', '#1E1D1B'],

  // Three semantic tuples replace 16 hand-tuned hexes. Amber alone appeared as three
  // near-identical triples plus two strays, two of whose borders differed by 8/255 in one channel.
  warn:   ['#FEF6E7', '#FBEBCB', '#F0D9A8', '#D2C2A1', '#C3B189', '#B5A072',
           '#A68F5A', '#977D43', '#896C2B', '#7A5B14'],   // ground/ink 5.86:1
  info:   ['#EDF4FD', '#DBE9FA', '#C3D9F2', '#A7BBD1', '#90A8C3', '#7896B4',
           '#6183A6', '#4A7097', '#325D89', '#1B4A7A'],   // ground/ink 8.22:1
  danger: ['#FDF2F2', '#F8DEDD', '#E9C6C4', '#E4AEAB', '#DC9794', '#D4817C',
           '#CC6A65', '#C3534D', '#BB3D36', '#B3261E'],   // ground/ink 5.96:1
}

// Mantine's stock `light` variant is rgba(shade[primaryShade], 0.1) over the surface, which is what
// produces the 2.69:1 alert measured above. For the three semantic tuples we resolve it explicitly
// to the exact ground/border/ink triple the app already ships and has already contrast-tested.
const SEMANTIC = new Set(['warn', 'info', 'danger'])

export function variantColorResolver(input) {
  if (input.variant === 'light' && SEMANTIC.has(input.color)) {
    const c = COLORS[input.color]
    return { background: c[0], hover: c[1], border: c[2], color: c[9] }
  }
  return defaultVariantColorsResolver(input)
}

export const theme = {
  // Not pure black (owner's ask, 29 Aug 2026): every "black" in the chrome is the warm near-black
  // the app's own scale already tops out at -- gray[9] = --text = #1E1D1B. Mantine derives its
  // default text ink and --mantine-color-black from this, so one line moves the whole chrome.
  black: '#1E1D1B',

  // ---- Type ---------------------------------------------------------------------------------
  // Sixteen distinct font-sizes and 34 half-pixel declarations collapse to six integer tokens. The
  // half-pixels were not doing perceptual work: .tb-btn 12 vs .side-tab-btn 12.5, input 13 vs
  // .phase-name-input 13.5, .phase-fields label 11 vs .tools-lbl 11.5 — three pairs that sit within
  // 200 px of each other on screen and read as identical.
  //
  // ⚠️ Keep the emoji families on the end. Mantine's own default carries them and the chrome
  // renders ✓ (U+2713) in flashSaveBtn — exactly the glyph they exist for.
  fontFamily:
    "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif,'Apple Color Emoji','Segoe UI Emoji'",
  // The system monospace stack rather than a second embedded family. The old stylesheet requested
  // IBM Plex Mono at weights 500 and 600 and ZERO of the eight mono sites set a font-weight — the
  // app was paying for two weights it never used, of a family it uses eight times.
  fontFamilyMonospace: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSizes: {
    xxs: '10px',  // dense metadata, popover hints, column headers. 9px retires — it was below the
                  // app's own smallest legible size everywhere else, and only two sites used it.
    xs:  '11px',  // field labels, hints, readouts, status
    sm:  '12px',  // dense controls — toolbar buttons, menu items, tabs
    md:  '14px',  // body default, input text
    lg:  '16px',  // section lead
    xl:  '20px',  // modal title
  },
  // Three weights, each with a meaning. ⚠️ Mantine's fontWeights.medium is 600, not 500, and the
  // app's interactive weight is 500 at eleven sites — so it is set explicitly here rather than
  // reached for through the token. 700 retires from the chrome; it survives in the frozen month
  // view, which is why Inter 500 and 700 must both be embedded.
  fontWeights: { normal: 400, medium: 500, semibold: 600 },
  lineHeights: { xs: '1.3', sm: '1.4', md: '1.5', lg: '1.55', xl: '1.6' },
  lineHeight: '1.5',  // unchanged from body today, so the fence has something to win with
  headings: { fontFamily: 'inherit', fontWeight: '600' },

  // ---- Colour -------------------------------------------------------------------------------
  colors: COLORS,
  primaryColor: 'navy',
  variantColorResolver,
  // Dark mode is a stated NON-GOAL, not a deferral: the grid and both exports are permanently
  // black-on-white documents that cannot invert, and the frozen CSS reads the chrome's neutrals
  // 39 times — so a dark palette would either leave the calendar a white slab in a dark shell or
  // change frozen output. See <MantineProvider forceColorScheme="light"> in main.jsx.
  autoContrast: false,

  // ---- Space, radius, elevation -------------------------------------------------------------
  // ⚠️ Mantine's own spacing scale starts at 10px and offers NOTHING between 0 and 10, while 71%
  // of this app's chrome spacing (147 of 206 occurrences) is 8px or smaller. It has to be
  // overridden, not extended.
  spacing: { xxs: '2px', xs: '4px', sm: '6px', md: '8px', lg: '12px', xl: '16px', xxl: '20px' },
  // Laddered by OBJECT SIZE, which is the part that was missing — not the values. Today 6px and
  // 8px each do double duty as both a container radius and a control radius, so the hierarchy
  // never reads. --radius was used at 2 of 56 radius sites.
  radius: {
    xs: '3px',   // swatches, chips
    sm: '5px',   // in-track segments, small text buttons
    md: '7px',   // every standalone control
    lg: '10px',  // every container that holds controls
    xl: '14px',  // the help modal, and nothing else
  },
  defaultRadius: 'md',
  // Five surfaces at the same conceptual elevation — file menu, tool popovers, note popover,
  // month-note popover, colour picker — currently carry THREE different shadows, and one sits at
  // z-index 200 against its peers' 60, above the help overlay. One md shadow for all five.
  shadows: {
    xs: '0 1px 2px rgba(0,0,0,.08)',
    sm: '0 2px 6px rgba(0,0,0,.08)',
    md: '0 8px 24px rgba(0,0,0,.12)',
    lg: '0 12px 32px rgba(0,0,0,.16)',
    xl: '0 18px 50px rgba(0,0,0,.30)',
  },

  // px, not rem. Mantine's rem() emits calc(<n>rem * var(--mantine-scale)), but theme values
  // themselves are written to CSS verbatim, so px strings survive. Leave scale at 1, and never
  // pass a bare NUMBER where a token is expected — numbers get rem()'d and scaled.
  scale: 1,

  // ⛔ MUST be false. theme.fontSmoothing defaults to true, which puts -webkit-font-smoothing:
  // antialiased on <body> — and that inherits straight into #table-wrap. Glyph METRICS are
  // unchanged, so measureTextPx and the 3.75px padding budget are safe, but the on-screen
  // appearance of the frozen waterfall would change, and the owner's instruction freezes the
  // waterfall editor's appearance too.
  fontSmoothing: false,

  // ---- Breakpoints --------------------------------------------------------------------------
  // Mantine's five names with the app's real measured numbers. The two measured wrap points land
  // within ~20px of Mantine's own defaults (lg 75em = 1200 vs measured ~1185; md 62em = 992 vs
  // measured ~1018), so adopting the names is an empirical fit rather than a convenience.
  breakpoints: { xs: '576px', sm: '768px', md: '1024px', lg: '1200px', xl: '1440px' },

  // ---- Component defaults -------------------------------------------------------------------
  components: {
    // ⚠️ THE DENSITY CONSTRAINT. The Phases tab already overflows its scroll container by 2× —
    // 2,019px of content in a 1,005px box — and the sidebar holds 35 date/number inputs plus 4
    // selects. Mantine's --input-height-sm is 36px against --input-height-xs 30px, and the app's
    // current input measures 30.0px. Taking Mantine's default would add +6px × 39 fields = +234px
    // to a panel that already scrolls twice its own height. Set once, here; never per call site.
    Input:            { defaultProps: { size: 'xs' } },
    InputWrapper:     { defaultProps: { size: 'xs' } },
    TextInput:        { defaultProps: { size: 'xs' } },
    NumberInput:      { defaultProps: { size: 'xs' } },
    NativeSelect:     { defaultProps: { size: 'xs' } },
    Textarea:         { defaultProps: { size: 'xs' } },
    Checkbox:         { defaultProps: { size: 'xs' } },
    SegmentedControl: { defaultProps: { size: 'xs' } },

    // ⚠️ Mantine gives Popover and Menu NO shadow at all by default — Popover.Dropdown renders
    // box-shadow: var(--popover-shadow, none) and `shadow` is absent from both components'
    // defaultProps. Modal is the only overlay that ships one. Without these two lines every
    // popover and menu in the app renders flat.
    Popover: { defaultProps: { shadow: 'md', radius: 'lg' } },
    Menu:    { defaultProps: { shadow: 'md', radius: 'lg' } },
    // ⚠️ padding must be explicit: Modal's header/body pad with the `md` SPACING token, which the
    // density scale above redefines to 8px — half of Mantine's stock 16px, and visibly cramped in
    // a 440px dialog (owner, 29 Aug 2026: warning modals need more side padding). xxl = 20px.
    Modal:   { defaultProps: { shadow: 'xl', radius: 'xl', padding: 'xxl' } },

    // Focus visibility cannot be forgotten per call site if it is set once here.
    Tooltip: { defaultProps: { events: { hover: true, focus: true, touch: false }, withArrow: true } },
  },
}
