// Normalized base URL, always without a trailing slash.
// Use as: `${base}/books/some-id`
export const base = import.meta.env.BASE_URL.replace(/\/$/, '');
