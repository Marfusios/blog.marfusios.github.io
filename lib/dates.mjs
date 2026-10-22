const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad = (n) => String(n).padStart(2, '0');

/** Dates are calendar dates stored as UTC midnight, so always format in UTC. */
export function formatDate(d, style) {
  const day = d.getUTCDate();
  const month = MONTHS[d.getUTCMonth()];
  const year = d.getUTCFullYear();
  if (style === 'short') return `${day} ${month.slice(0, 3)}`;
  if (style === 'long') return `${day} ${month} ${year}`;
  if (style === 'iso') return `${year}-${pad(d.getUTCMonth() + 1)}-${pad(day)}`;
  throw new Error(`Unknown date style "${style}"`);
}
