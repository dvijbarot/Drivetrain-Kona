/** Resolve local assets for both root hosting and a GitHub Pages project path. */
export function assetPath(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\/+/, '');
}
