// src/utils/hasPath.ts
export function hasPath(obj: any, path: string): boolean {
  if (!obj || !path) return false;

  return path.split('.').every((key) => {
    if (obj == null || typeof obj !== 'object') return false;
    obj = obj[key];
    return obj !== undefined;
  });
}
