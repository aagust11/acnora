import type { IssuedQuote, LocalDatabase } from '../types';

/** An offer remains valid THROUGH the stated date, not until that day's midnight. */
export function isQuoteExpired(quote: IssuedQuote, today: string): boolean {
  return quote.status === 'pendent' && Boolean(quote.validUntil) && quote.validUntil < today;
}

/** No background service is available on a static GitHub Pages site. Run on open and while open. */
export function pruneExpiredQuotes(database: LocalDatabase, today: string): LocalDatabase {
  const active = database.issuedQuotes.filter(q => !isQuoteExpired(q, today));
  return active.length === database.issuedQuotes.length ? database : { ...database, issuedQuotes: active };
}

/** PDF data is immutable once generated; acceptance changes only its administrative status. */
export function markQuoteAccepted(quote: IssuedQuote, acceptedAt: string): IssuedQuote {
  if (quote.status === 'acceptat') return quote;
  return { ...quote, status: 'acceptat', acceptedAt };
}

export function downloadIssuedQuote(quote: IssuedQuote) {
  if (!/^data:application\/pdf(?:;[^,]*)?;base64,/i.test(quote.pdfDataUri || '')) throw new Error('El PDF històric no és vàlid.');
  const link = document.createElement('a');
  link.href = quote.pdfDataUri;
  link.download = quote.filename || `pressupost_${quote.reference}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
