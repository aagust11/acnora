import { jsPDF } from 'jspdf';
import { TimeEntry, Client, Project, Task, Settings } from '../types';
import { formatDuration, formatCurrency, formatDate } from './timeUtils';

/**
 * Escapes fields to be CSV-safe.
 */
function escapeCSV(val: string | number | undefined): string {
  if (val === undefined || val === null) return '';
  let str = String(val);
  // Prevent spreadsheet applications from evaluating client-controlled labels as formulas.
  if (/^[\t\r\n ]*[=+@]/.test(str) || (/^[\t\r\n ]*-/.test(str) && !/^[\t\r\n ]*-?\d+(?:[.,]\d+)?$/.test(str))) {
    str = '\'' + str;
  }
  if (str.includes('"') || str.includes(';') || str.includes('\n') || str.includes(',')) {
    str = `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports entries to CSV format.
 * Semicolon is used as a separator for compatibility with Catalan/European Excel defaults which use commas for decimals.
 */
export function exportToCSV(
  entries: TimeEntry[],
  clients: Client[],
  projects: Project[],
  tasks: Task[],
  showAmounts: boolean,
  currency: string
): string {
  const headers = [
    'Data',
    'Client',
    'Projecte',
    'Tasca',
    'Descripció',
    'Inici',
    'Fi',
    'Durada (Minuts)',
    'Durada (Hores)',
    'Facturable',
    'Estat',
    'Origen',
    'Notes Internes'
  ];
  if (showAmounts) {
    headers.push('Tarifa Aplicada', 'Import Calculat');
  }

  const rows = entries.map(entry => {
    const client = clients.find(c => c.id === entry.clientId);
    const project = projects.find(p => p.id === entry.projecteId);
    const task = entry.tascaId ? tasks.find(t => t.id === entry.tascaId) : undefined;

    const row = [
      entry.data,
      client ? client.nom : 'Desconegut',
      project ? project.nom : 'Desconegut',
      task ? task.nom : '',
      entry.descripcio,
      entry.horaInici,
      entry.horaFi || '',
      entry.duradaMinuts,
      (entry.duradaMinuts / 60).toFixed(2).replace('.', ','),
      entry.facturable ? 'Sí' : 'No',
      entry.estat,
      entry.origen,
      entry.notes
    ];

    if (showAmounts) {
      row.push(
        entry.tarifaHorariaAplicada ? entry.tarifaHorariaAplicada.toFixed(2).replace('.', ',') : '0,00',
        entry.importCalculat ? entry.importCalculat.toFixed(2).replace('.', ',') : '0,00'
      );
    }

    return row.map(escapeCSV).join(';');
  });

  // UTF-8 BOM helps Excel detect character encoding
  return '\uFEFF' + [headers.join(';'), ...rows].join('\n');
}

/**
 * Exports to XML-based Excel Spreadsheet which Excel opens as a native spreadsheet keeping formatting and formulas.
 */
export function exportToExcel(
  entries: TimeEntry[],
  clients: Client[],
  projects: Project[],
  tasks: Task[],
  showAmounts: boolean,
  currency: string
): string {
  const tableHeaders = [
    'Data', 'Client', 'Projecte', 'Tasca', 'Descripció', 
    'Inici', 'Fi', 'Durada (Min)', 'Durada (Hores)', 'Facturable', 'Estat', 'Origen'
  ];
  if (showAmounts) {
    tableHeaders.push('Tarifa', 'Import');
  }

  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Registres de Temps</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
        th { background-color: #234e70; color: #ffffff; font-weight: bold; border: 1px solid #CBD5E1; padding: 6px; }
        td { border: 1px solid #E2E8F0; padding: 4px; font-family: sans-serif; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .header { font-size: 16px; font-weight: bold; color: #1E293B; margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="header">ACnora · Informe de temps - Generat el ${new Date().toLocaleDateString('ca')}</div>
      <table>
        <thead>
          <tr>
            ${tableHeaders.map(h => `<th>${h}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `;

  entries.forEach(entry => {
    const client = clients.find(c => c.id === entry.clientId);
    const project = projects.find(p => p.id === entry.projecteId);
    const task = entry.tascaId ? tasks.find(t => t.id === entry.tascaId) : undefined;

    const rowCells = [
      `<td>${entry.data}</td>`,
      `<td>${escapeHtml(client?.nom || 'Desconegut')}</td>`,
      `<td>${escapeHtml(project?.nom || 'Desconegut')}</td>`,
      `<td>${escapeHtml(task?.nom || '')}</td>`,
      `<td>${escapeHtml(entry.descripcio)}</td>`,
      `<td class="text-center">${entry.horaInici}</td>`,
      `<td class="text-center">${entry.horaFi || '-'}</td>`,
      `<td class="text-right">${entry.duradaMinuts}</td>`,
      `<td class="text-right">${(entry.duradaMinuts / 60).toFixed(2).replace('.', ',')}</td>`,
      `<td class="text-center">${entry.facturable ? 'Sí' : 'No'}</td>`,
      `<td>${entry.estat}</td>`,
      `<td>${entry.origen}</td>`
    ];

    if (showAmounts) {
      rowCells.push(
        `<td class="text-right">${(entry.tarifaHorariaAplicada || 0).toFixed(2).replace('.', ',')}</td>`,
        `<td class="text-right">${(entry.importCalculat || 0).toFixed(2).replace('.', ',')}</td>`
      );
    }

    html += `<tr>${rowCells.join('')}</tr>`;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Triggers a file download in the browser.
 */
export function downloadFile(content: string, fileName: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generates a clean PDF document using jsPDF.
 */
export function generatePDF(
  entries: TimeEntry[],
  clients: Client[],
  projects: Project[],
  tasks: Task[],
  settings: Settings,
  filterProps: {
    clientNom?: string;
    projecteNom?: string;
    periodStr?: string;
    isClientReport: boolean; // if true, hide notesInternes
    showAmounts: boolean;
  }
) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const { isClientReport, showAmounts } = filterProps;
  const currency = settings.currency;

  // Colors
  const primaryColor = [37, 99, 235]; // Royal Blue
  const darkTextColor = [30, 41, 59]; // Slate 800
  const lightBgColor = [241, 245, 249]; // Slate 100
  const grayBorderColor = [203, 213, 225]; // Slate 300

  // Margins & Dimensions
  const marginX = 15;
  let currentY = 15;
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - (marginX * 2);

  // Helper function to handle page breaks
  const ensureSpace = (heightNeeded: number) => {
    if (currentY + heightNeeded > pageHeight - 15) {
      doc.addPage();
      currentY = 15;
      drawFooter();
    }
  };

  const drawFooter = () => {
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // Slate 400
    doc.text(
      `Pàgina ${doc.internal.pages.length - 1}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    );
  };

  // Title / Header Banner
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(marginX, currentY, contentWidth, 20, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(
    isClientReport ? 'INFORME DE DETALL DE TEMPS PER AL CLIENT' : 'INFORME INTERN DE REGISTRES DE TEMPS',
    marginX + 5,
    currentY + 12
  );
  currentY += 25;

  // Freelancer profile info
  ensureSpace(35);
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('EMISSOR:', marginX, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);
  
  const f = settings.freelancer;
  const fLines = [
    f.name ? `Nom: ${f.name}` : 'Nom: No configurat',
    f.taxId ? `NIF: ${f.taxId}` : '',
    f.email ? `Email: ${f.email}` : '',
    f.phone ? `Telèfon: ${f.phone}` : '',
    f.website ? `Web: ${f.website}` : ''
  ].filter(Boolean);

  fLines.forEach((line, idx) => {
    doc.text(line, marginX, currentY + 5 + (idx * 4.5));
  });

  // Report metadata
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DETALLS DE L\'INFORME:', marginX + 100, currentY);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(9);

  const reportMetadata = [
    `Data d'emissió: ${new Date().toLocaleDateString('ca')}`,
    filterProps.periodStr ? `Període: ${filterProps.periodStr}` : 'Període: All',
    filterProps.clientNom ? `Client: ${filterProps.clientNom}` : '',
    filterProps.projecteNom ? `Projecte: ${filterProps.projecteNom}` : ''
  ].filter(Boolean);

  reportMetadata.forEach((line, idx) => {
    doc.text(line, marginX + 100, currentY + 5 + (idx * 4.5));
  });

  currentY += Math.max(fLines.length, reportMetadata.length) * 4.5 + 10;

  // Calculations for Summary
  let totalMinuts = 0;
  let totalFacturableMinuts = 0;
  let totalImport = 0;

  entries.forEach(e => {
    totalMinuts += e.duradaMinuts;
    if (e.facturable) {
      totalFacturableMinuts += e.duradaMinuts;
      totalImport += e.importCalculat || 0;
    }
  });

  // Summary Metrics boxes
  ensureSpace(22);
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.roundedRect(marginX, currentY, contentWidth, 18, 2, 2, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // Slate 500
  
  const colW = contentWidth / (showAmounts ? 4 : 3);
  
  doc.text('HORES TOTALS', marginX + 5, currentY + 5);
  doc.text('HORES FACTURABLES', marginX + colW + 5, currentY + 5);
  doc.text('HORES NO FACTURABLES', marginX + (colW * 2) + 5, currentY + 5);
  if (showAmounts) {
    doc.text(`IMPORT RESPECTIU (${currency})`, marginX + (colW * 3) + 5, currentY + 5);
  }

  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFontSize(11);
  doc.text(formatDuration(totalMinuts, 'decimal'), marginX + 5, currentY + 12);
  doc.text(formatDuration(totalFacturableMinuts, 'decimal'), marginX + colW + 5, currentY + 12);
  doc.text(formatDuration(totalMinuts - totalFacturableMinuts, 'decimal'), marginX + (colW * 2) + 5, currentY + 12);
  if (showAmounts) {
    doc.text(formatCurrency(totalImport, currency), marginX + (colW * 3) + 5, currentY + 12);
  }

  currentY += 25;

  // Grid headers
  ensureSpace(12);
  doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.rect(marginX, currentY, contentWidth, 8, 'F');
  
  doc.setFont('Helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  const colData = marginX + 1;
  const colProj = marginX + 20;
  const colDesc = marginX + 54;
  
  // Right positions for text alignment
  const colHorEnd = marginX + (showAmounts ? 125 : 155);
  const colDurEnd = marginX + (showAmounts ? 145 : 180);
  const colTarEnd = marginX + 168;
  const colImpEnd = marginX + 180;

  doc.text('DATA', colData, currentY + 5.5);
  doc.text('PROJECTE / TASCA', colProj, currentY + 5.5);
  doc.text('DESCRIPCIÓ', colDesc, currentY + 5.5);
  doc.text('INICI - FI', colHorEnd, currentY + 5.5, { align: 'right' });
  doc.text('DURADA', colDurEnd, currentY + 5.5, { align: 'right' });
  if (showAmounts) {
    doc.text('TARIFA', colTarEnd, currentY + 5.5, { align: 'right' });
    doc.text('IMPORT', colImpEnd, currentY + 5.5, { align: 'right' });
  }

  currentY += 8;

  // Grid Data Rows
  doc.setTextColor(darkTextColor[0], darkTextColor[1], darkTextColor[2]);
  doc.setFont('Helvetica', 'normal');
  doc.setFontSize(8);

  entries.forEach((e, index) => {
    // 1 line text height ~4mm, but cell contents can wrap so ensure space beforehand
    // If wrapping description or other columns, we should calculate height. Simple wrap height is adequate.
    const proj = projects.find(p => p.id === e.projecteId)?.nom || 'Desconegut';
    const tsk = e.tascaId ? tasks.find(t => t.id === e.tascaId)?.nom : '';
    const projTskStr = tsk ? `${proj}\n> ${tsk}` : proj;
    
    // Split text with margins
    const descWidth = (showAmounts ? 69 : 99);
    const descLines = doc.splitTextToSize(e.descripcio || '-', descWidth);
    const projLines = doc.splitTextToSize(projTskStr, 32);
    
    const rowLinesCount = Math.max(descLines.length, projLines.length);
    const rowHeight = (rowLinesCount * 4) + 4;

    ensureSpace(rowHeight);

    // Alternate backgrounds
    if (index % 2 === 1) {
      doc.setFillColor(248, 250, 252); // Slate 50
      doc.rect(marginX, currentY, contentWidth, rowHeight, 'F');
    }

    // Grid lines
    doc.setDrawColor(grayBorderColor[0], grayBorderColor[1], grayBorderColor[2]);
    doc.line(marginX, currentY + rowHeight, marginX + contentWidth, currentY + rowHeight);

    // Render columns
    doc.text(formatDate(e.data), colData, currentY + 5.5);
    doc.text(projLines, colProj, currentY + 5.5);
    doc.text(descLines, colDesc, currentY + 5.5);
    doc.text(`${e.horaInici} - ${e.horaFi || '-'}`, colHorEnd, currentY + 5.5, { align: 'right' });
    doc.text(formatDuration(e.duradaMinuts, 'decimal'), colDurEnd, currentY + 5.5, { align: 'right' });
    
    if (showAmounts) {
      const isFact = e.facturable ? 'S' : 'N';
      const rateVal = e.tarifaHorariaAplicada || 0;
      const chargeVal = e.importCalculat || 0;
      doc.text(`${rateVal.toFixed(2)} ${currency === 'EUR' ? '€' : currency}`, colTarEnd, currentY + 5.5, { align: 'right' });
      doc.text(`${chargeVal.toFixed(2)} ${currency === 'EUR' ? '€' : currency}`, colImpEnd, currentY + 5.5, { align: 'right' });
    }

    currentY += rowHeight;
  });

  // Summary at the bottom
  ensureSpace(12);
  doc.setFillColor(lightBgColor[0], lightBgColor[1], lightBgColor[2]);
  doc.rect(marginX, currentY, contentWidth, 8, 'F');
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.line(marginX, currentY, marginX + contentWidth, currentY);
  doc.line(marginX, currentY + 8, marginX + contentWidth, currentY + 8);

  doc.setFont('Helvetica', 'bold');
  doc.text('TOTAL GENERAL', colData, currentY + 5.5);
  doc.text(formatDuration(totalMinuts, 'decimal'), colDurEnd, currentY + 5.5, { align: 'right' });
  if (showAmounts) {
    doc.text(`${totalImport.toFixed(2)} ${currency === 'EUR' ? '€' : currency}`, colImpEnd, currentY + 5.5, { align: 'right' });
  }

  // Draw footer on all pages
  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter();
  }

  // Open save dialog
  doc.save(`informe_temps_${filterProps.clientNom || 'acnora'}_${new Date().toISOString().split('T')[0]}.pdf`);
}
