import { jsPDF } from 'jspdf';
import type { Client, Project, Settings } from '../types';
import type { QuoteLine } from './quotation';
import { hoursRange, quoteRange } from './quotation';

export const DEFAULT_TAX_NOTE = 'Imports abans d’impostos. Els impostos aplicables no estan inclosos.';
export const DEFAULT_ESTIMATE_NOTE = 'L’import és una estimació variable segons les hores finalment dedicades. No és un preu tancat.';
export const DEFAULT_CONDITIONS = 'La dedicació i l’import final dependran de l’abast definitiu i del temps realment necessari. Qualsevol ampliació de l’abast es pressupostarà per separat.';

export interface QuotePDFOptions {
  quoteNumber: string;
  issueDate: string;
  validUntil?: string;
  showHours: boolean;
  showHourlyRates: boolean;
  conditions: string;
  observations: string;
  taxNote: string;
  estimateNote: string;
}

const displayDate = (date: string): string => {
  const [year, month, day] = date.split('-');
  return year && month && day ? `${day}/${month}/${year}` : date;
};

/** Keep output inside jsPDF's standard Helvetica character repertoire. */
const safe = (value: string) => value.replace(/[\u2010-\u2015]/g, '-').replace(/\u00a0/g, ' ').replace(/\u2022/g, '-');

export function generateQuotePDF(
  client: Client, project: Project, lines: QuoteLine[], settings: Settings, options: QuotePDFOptions,
) {
  if (!lines.length) throw new Error('No hi ha tasques pressupostades.');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  const left = 16;
  const right = width - 16;
  const content = right - left;
  const dark: [number, number, number] = [35, 78, 112];
  let y = 18;

  const pageBreak = (needed: number) => {
    if (y + needed > height - 20) {
      doc.addPage();
      y = 20;
    }
  };
  const setDark = () => doc.setTextColor(37, 51, 65);
  const lineText = (text: string, x: number, maxWidth: number, size = 9, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lineHeight = size < 9 ? 4 : 5;
    const parts: string[] = [];
    for (const line of safe(text).split(/\r?\n/)) {
      if (!line) { parts.push(''); continue; }
      parts.push(...doc.splitTextToSize(line, maxWidth));
    }
    parts.forEach(part => {
      pageBreak(lineHeight);
      if (part) doc.text(part, x, y);
      y += lineHeight;
    });
  };

  // Simple, typographic header rather than illustration-heavy template.
  doc.setFillColor(...dark);
  doc.rect(left, y, 2, 19, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...dark);
  doc.text('ACnora', left + 6, y + 7);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(99, 110, 121);
  doc.text('PRESSUPOST COMERCIAL', left + 6, y + 14);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  setDark();
  doc.text(safe(options.quoteNumber), right, y + 6, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(displayDate(options.issueDate), right, y + 12, { align: 'right' });
  y += 26;
  doc.setDrawColor(222, 229, 235);
  doc.line(left, y, right, y);
  y += 10;

  const f = settings.freelancer;
  const leftBlock = [f.name || 'Emissor no configurat', f.taxId && `NIF: ${f.taxId}`, f.address, f.email, f.phone].filter(Boolean).join('\n');
  const rightBlock = [client.nom, client.email, client.telefon].filter(Boolean).join('\n');
  const addressStart = y;
  setDark();
  lineText('EMISSOR', left, 83, 8, true);
  lineText(leftBlock, left, 82, 9);
  const leftEnd = y;
  y = addressStart;
  lineText('CLIENT', left + 94, 82, 8, true);
  lineText(rightBlock, left + 94, 80, 9);
  y = Math.max(leftEnd, y) + 5;
  if (options.validUntil) {
    lineText(`Validesa de l'oferta fins al ${displayDate(options.validUntil)}`, left, content, 8);
    y += 3;
  }
  pageBreak(22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...dark);
  doc.text(safe(project.nom).slice(0, 100), left, y);
  y += 7;
  setDark();
  if (project.descripcio?.trim()) lineText(project.descripcio, left, content, 9);
  y += 8;

  // Explicit newlines from the multi-line task description must survive PDF layout.
  const wrapPreserveLines = (value: string, maxWidth: number): string[] => {
    const lines: string[] = [];
    for (const raw of safe(value).split(/\r?\n/)) {
      if (!raw.trim()) { lines.push(' '); continue; }
      lines.push(...doc.splitTextToSize(raw, maxWidth));
    }
    return lines;
  };

  const number = (v: number) => new Intl.NumberFormat('ca-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(v);
  const currency = settings.currency;
  // No dedicated hours/tariff columns when the entire quotation is fixed-price.
  const showHours = options.showHours && lines.some(line => line.hasTimeEstimate);
  const showHourlyRates = options.showHourlyRates && lines.some(line => line.hasTimeEstimate);
  const amt = (min: number, max: number) => quoteRange(min, max, currency);
  const colAmount = right;
  const colRate = right - 53;
  const colHours = right - (showHourlyRates ? 83 : 53);
  const titleWidth = showHours && showHourlyRates ? 81 : 113;
  const drawHeader = () => {
    pageBreak(12);
    doc.setFillColor(238, 243, 247);
    doc.rect(left, y - 2, content, 10, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...dark);
    doc.setFontSize(8);
    doc.text('TASCA / DESCRIPCIÓ', left + 2, y + 4);
    if (showHours) doc.text('HORES', colHours - 3, y + 4, { align: 'right' });
    if (showHourlyRates) doc.text('TARIFA', colRate, y + 4, { align: 'right' });
    doc.text('IMPORT ESTIMAT', colAmount - 1, y + 4, { align: 'right' });
    y += 12;
  };
  drawHeader();

  const showBlockHeadings = lines.some(line => !!line.task.blocId);
  let previousBlockKey: string | null = null;
  lines.forEach((line, index) => {
    const blockKey = line.task.blocId || '';
    if (showBlockHeadings && blockKey !== previousBlockKey) {
      pageBreak(20);
      doc.setFillColor(246, 249, 252);
      doc.rect(left, y - 2, content, 9, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...dark);
      const sectionTitle = safe(line.blocNom || 'Tasques sense bloc');
      doc.text(doc.splitTextToSize(sectionTitle, content - 8)[0] || sectionTitle, left + 3, y + 3.5);
      y += 11;
    }
    previousBlockKey = blockKey;
    const rowTitle = wrapPreserveLines(line.task.nom, Math.max(40, titleWidth));
    const rowDesc = line.task.descripcio ? wrapPreserveLines(line.task.descripcio, Math.max(40, titleWidth)) : [];
    const textHeight = Math.max(7, rowTitle.length * 4.3 + (rowDesc.length ? rowDesc.length * 3.7 + 1 : 0) + 3);
    if (y + textHeight > height - 20) {
      doc.addPage();
      y = 20;
      drawHeader();
    }
    const top = y;
    if (index % 2 === 1) {
      doc.setFillColor(249, 251, 253);
      doc.rect(left, top - 2, content, textHeight, 'F');
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setDark();
    doc.text(rowTitle, left + 2, top + 2.5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(99, 110, 121);
    if (rowDesc.length) doc.text(rowDesc, left + 2, top + rowTitle.length * 4.3 + 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setDark();
    if (showHours && line.hasTimeEstimate) doc.text(hoursRange(line.minHours, line.maxHours), colHours - 3, top + 2.5, { align: 'right' });
    if (showHourlyRates) {
      if (line.hasTimeEstimate) doc.text(line.hourlyRate === null ? 'Diverses' : `${number(line.hourlyRate)} ${currency}/h`, colRate, top + 2.5, { align: 'right' });
      else doc.text('Preu fix', colRate, top + 2.5, { align: 'right' });
    }
    // Fit amounts to the allocated right-hand column; if needed render on 2 lines.
    const display = amt(line.minAmount, line.maxAmount);
    const amountWidth = showHourlyRates ? 51 : showHours ? 52 : 98;
    const amountParts = doc.splitTextToSize(safe(display), amountWidth);
    doc.text(amountParts, colAmount - 1, top + 2.5, { align: 'right' });
    y = top + Math.max(textHeight, amountParts.length * 4 + 3);
    if (line.manualPrice !== undefined) {
      pageBreak(6);
      doc.setFontSize(7); doc.setTextColor(93, 108, 120);
      doc.text('Preu acordat per aquest servei', left + 5, y + 2);
      y += 5;
    }
    // Show the per-rate breakdown only when there is more than one rate band.
    // Never reveal internal hours or hourly rates when the PDF options hide them.
    if (line.trams.length > 1) {
      y += 2;
      line.trams.forEach((tram, index) => {
        pageBreak(8);
        const label = safe(tram.concepte || `Tram ${index + 1}`);
        const details = [
          !tram.isFixedPrice && showHours ? hoursRange(tram.horesMin, tram.horesMax) : '',
          !tram.isFixedPrice && showHourlyRates ? `${number(tram.tarifa)} ${currency}/h` : '',
        ].filter(Boolean).join('  ·  ');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(93, 108, 120);
        const detailText = `${label}${details ? ': ' + details : ''}`;
        const parts = wrapPreserveLines(detailText, content - 8 - (showHourlyRates || showHours ? 49 : 37));
        doc.text(parts, left + 5, y + 2);
        // For an overridden task, component amounts would not add up to the agreed price.
        if (line.manualPrice === undefined) doc.text(safe(amt(tram.minAmount, tram.maxAmount)), colAmount - 1, y + 2, { align: 'right' });
        y += Math.max(4, parts.length * 3.3);
      });
      y += 2;
    }
    doc.setDrawColor(234, 238, 242);
    doc.line(left, y - 1, right, y - 1);
  });

  const totalMin = lines.reduce((sum, line) => sum + line.minAmount, 0);
  const totalMax = lines.reduce((sum, line) => sum + line.maxAmount, 0);
  const hourMin = lines.reduce((sum, line) => sum + line.minHours, 0);
  const hourMax = lines.reduce((sum, line) => sum + line.maxHours, 0);
  pageBreak(29);
  y += 5;
  doc.setFillColor(...dark);
  doc.rect(left, y, content, 18, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL ESTIMAT', left + 5, y + 7);
  if (showHours && hourMax > 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(hoursRange(hourMin, hourMax), left + 5, y + 13);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(safe(amt(totalMin, totalMax)), right - 4, y + 11, { align: 'right' });
  y += 25;
  setDark();
  // Every commercial clause is editable in the quote editor; preserve explicit line breaks.
  if (options.taxNote.trim()) lineText(options.taxNote.trim(), left, content, 8);
  if (options.estimateNote.trim() && (totalMin !== totalMax || options.estimateNote !== DEFAULT_ESTIMATE_NOTE)) {
    lineText(options.estimateNote.trim(), left, content, 8);
  }
  if (options.conditions.trim()) {
    y += 5;
    pageBreak(12);
    lineText('CONDICIONS', left, content, 9, true);
    lineText(options.conditions.trim(), left, content, 9);
  }
  if (options.observations.trim()) {
    y += 5;
    pageBreak(12);
    lineText('OBSERVACIONS ADDICIONALS', left, content, 9, true);
    lineText(options.observations.trim(), left, content, 9);
  }

  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setDrawColor(222, 229, 235);
    doc.line(left, height - 16, right, height - 16);
    doc.setTextColor(115, 126, 136);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('ACnora · Pressupost', left, height - 11);
    doc.text(`${i} / ${pages}`, right, height - 11, { align: 'right' });
  }
  const cleanFilename = (options.quoteNumber || project.nom).normalize('NFKD').replace(/[^a-zA-Z0-9-_]/g, '-').slice(0, 70);
  // Save exact bytes of the original document so edits and future template changes
  // never change a previously issued proposal.
  return {
    filename: `pressupost_${cleanFilename}.pdf`,
    pdfDataUri: doc.output('datauristring'),
  };
}
