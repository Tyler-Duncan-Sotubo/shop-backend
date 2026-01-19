export function slugify(input: string): string {
  if (!input) return '';

  return (
    input
      .toString()
      .trim()
      .toLowerCase()
      // Replace accents / unicode with closest ASCII equivalents
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      // Remove anything non alphanumeric or space
      .replace(/[^a-z0-9\s-]/g, '')
      // Replace whitespace with dashes
      .replace(/\s+/g, '-')
      // Collapse multiple dashes
      .replace(/-+/g, '-')
      // Remove starting/ending dash
      .replace(/^-+|-+$/g, '')
  );
}
