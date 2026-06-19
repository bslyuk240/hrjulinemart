/**
 * Capture auth URL fragments before Supabase client init can strip them.
 * Imported first from main.jsx.
 */
const snapshot = {
  hash: typeof window !== 'undefined' ? window.location.hash : '',
  search: typeof window !== 'undefined' ? window.location.search : '',
};

export const getRecoveryUrlSnapshot = () => snapshot;
