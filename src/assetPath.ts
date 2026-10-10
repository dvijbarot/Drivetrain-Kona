/** Resolve locally hosted assets for root sites and GitHub Pages project paths. */
export function assetPath(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\/+/, '');
}
