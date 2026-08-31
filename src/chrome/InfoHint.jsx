// InfoHint — the small grey "i" that replaces the app's always-visible explanatory paragraphs.
//
// WHY (owner, 31 Aug 2026): every settings card and every calendar tool carried a two-to-three
// line description sitting permanently above its controls. Correct copy, but it cost the sidebar
// most of its vertical space and made the cards read as documentation rather than as controls. The
// text is worth keeping for the person meeting a field for the first time, and worth hiding from
// everyone who already knows what Region does.
//
// ⚠️ THIS IS FOR DESCRIPTIONS ONLY -- never for a warning, an error, or an empty state. Hiding
// "Locked — changing the Region would misplace your comment/hiatus edits" behind a hover would be
// a real regression: those appear precisely because something needs attention, and attention is
// the one thing a hover does not get. #union-lock-hint, #custom-hol-err and .snap-note stay
// visible. UI-CONVENTIONS.md §4 already separated those four jobs; this only takes the fourth.
//
// No new Mantine CSS import: HoverCard is built ON Popover (it uses PopoverStylesNames and
// PopoverCssVariables), and Popover.layer.css is already in main.jsx's list. That matters because
// that list's ORDER is derived from Mantine's own styles.layer.css and must never be sorted --
// see HANDOFF.md, the round-7 row about UnstyledButton winning over Button.

import { HoverCard, Text } from '@mantine/core'

// The trigger. A button, not a <span>: it has to be focusable to be reachable by keyboard, and
// HoverCard opens on focus as well as hover. type="button" because these sit inside a <form>-ish
// sidebar and a bare <button> would submit.
//
// ⛔ Do NOT give this an id. collectFieldValues() sweeps every input/select/textarea WITH AN ID
// into saved files and the undo stack; buttons are not swept, but the habit is what matters --
// transient chrome does not get ids in this codebase.
// position defaults to "right": every one of these sits in the sidebar or a toolbar popover, both
// of which are near the TOP of the window, so opening upwards put the card over the header. Right
// opens into the preview pane, which is the one direction with room. Mantine's floating middlewares
// flip it automatically when there isn't — verified at 900px, where it goes left.
export function InfoHint({ label, children, width = 260, position = 'right' }) {
  return (
    // zIndex 400, not Mantine's default 300: `.tools-menu` in legacy.css is ALSO 300, and four of
    // these hints live inside those popovers. Equal z-index leaves the winner to DOM order, which
    // happens to favour the portal today and would silently stop doing so the moment anything is
    // reordered — a hint that renders behind the thing it explains.
    <HoverCard width={width} shadow="md" radius="md" withinPortal position={position} withArrow
               zIndex={400} openDelay={120} closeDelay={60}>
      <HoverCard.Target>
        <button
          type="button"
          className="info-hint"
          aria-label={label ? `About ${label}` : 'More information'}
          // Hovering explains; clicking does nothing. Without this a click focuses the button and
          // leaves the card stuck open after the pointer has gone.
          onClick={(e) => e.currentTarget.blur()}
        >
          {/* Drawn, not imported: the house icon set is nine hand-written glyphs for exactly this
              reason (see icons.jsx). 16 viewBox, stroke 1.6, round caps — same family. */}
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
            <circle cx="8" cy="8" r="6.25" />
            <path d="M8 7.25v4" />
            <path d="M8 4.75h.01" />
          </svg>
        </button>
      </HoverCard.Target>
      <HoverCard.Dropdown>
        <Text size="xs" c="dimmed" className="info-hint-body">{children}</Text>
      </HoverCard.Dropdown>
    </HoverCard>
  )
}
