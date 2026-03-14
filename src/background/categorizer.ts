/**
 * Smart categorization based on the URL's hostname.
 *
 * Maps well-known domains to content types.
 * Falls back to "Webpage" when no match is found or when the feature is disabled.
 */

import { DOMAIN_CATEGORY_MAP } from "./domain-categories";

/**
 * Determine the content type of a URL.
 * @param url Full URL string
 * @param enabled Whether smart categorization is enabled
 */
export function categorize(url: string, enabled = true): string {
  if (!enabled) return "Webpage";

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, "");

    // Direct match
    if (DOMAIN_CATEGORY_MAP[hostname]) {
      return DOMAIN_CATEGORY_MAP[hostname];
    }

    // Check if hostname ends with any known domain (handles subdomains)
    for (const [domain, category] of Object.entries(DOMAIN_CATEGORY_MAP)) {
      if (hostname === domain || hostname.endsWith(`.${domain}`)) {
        return category;
      }
    }
  } catch {
    // Invalid URL — fall through
  }

  return "Webpage";
}
