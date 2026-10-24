/**
 * Internal links. The site is served under `base` from astro.config.mjs (the
 * GitHub Pages project path). Astro adds it to its own asset URLs; hand-written
 * paths get it here.
 */

// No trailing slash, so '/jowsai-website' + '/designs/ivory/' joins cleanly ('' without a base).
const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** `path` is site-relative and starts with '/', e.g. `/designs/ivory/`. */
export function url(path: `/${string}`): string {
  return `${base}${path}`;
}
