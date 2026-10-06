// The app's signature 7px chamfer, shared so every "action" control (table
// row actions, bulk-action bars) matches the same cut corners used on
// search/filter inputs instead of plain rounded corners.
export const CHAMFER = "[clip-path:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)]";

// A `border` never renders on a clip-path's diagonal corners (a recurring
// issue in this app) -- the `outline` Button variant depends entirely on
// its border for definition, so any chamfered outline button needs a
// filled background standing in for that border instead.
export const CHAMFER_OUTLINE = `${CHAMFER} bg-surface-alt border-transparent hover:bg-brand-50`;
