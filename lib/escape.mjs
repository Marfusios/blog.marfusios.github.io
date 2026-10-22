const HTML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const XML = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' };

export const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => HTML[c]);
export const escapeXml = (s) => String(s).replace(/[&<>"']/g, (c) => XML[c]);
