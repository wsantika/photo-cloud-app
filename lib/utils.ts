/**
 * Sanitize a file name by replacing special characters with hyphens.
 * Only allows alphanumeric characters, dots, and hyphens.
 */
export function sanitizeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9.-]/g, "-");
}

/**
 * Convert a text string into a URL-friendly slug.
 */
export function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}
