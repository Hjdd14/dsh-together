/**
 * Extra tool names this deployment treats as mutating, on top of the shipped list.
 *
 * Kept separate so a future profile-specific preset can add names without editing
 * the classifier. An empty set keeps the classifier's built-in list authoritative.
 */
export const DEFAULT_OVERRIDES = new Set()
