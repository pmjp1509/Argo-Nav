/**
 * Single source of truth for stacking order. Every floating/overlay component
 * uses these instead of ad-hoc z-index values, so nothing ever overlaps wrongly.
 *
 * Order (low → high):
 *   base content → Leaflet (internal 200–1000) → sidebar → topbar
 *   → map overlays → AI drawer → dropdowns → dialogs → toasts → tooltips
 */
export const LAYER = {
  sidebar: 30,
  topbar: 40,
  mapOverlay: 1050, // above Leaflet controls (~1000), below the AI drawer
  drawer: 1100,
  dropdown: 1200, // profile menu, popovers — always above the drawer
  dialog: 1300, // command palette, mobile nav
  toast: 1400,
  tooltip: 1500,
} as const;
