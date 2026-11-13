import { TimeEntry, Project, Task, EntryStatus, Settings } from '../types';

/**
 * Calculates duration in minutes between start time and end time strings (HH:MM).
 */
export function calculateMinutes(horaInici: string, horaFi: string): number {
  if (!horaInici || !horaFi) return 0;
  const [h1, m1] = horaInici.split(':').map(Number);
  const [h2, m2] = horaFi.split(':').map(Number);
  
  const startMins = h1 * 60 + m1;
  const endMins = h2 * 60 + m2;
  
  return endMins - startMins;
}

/**
 * Format minutes to various display options:
 * - Decimal: "1.5 h"
 * - Clock: "1 h 30 min"
 * - Combined: "1.5 h (1 h 30 min)"
 */
export function formatDuration(minuts: number, mode: 'decimal' | 'clock' | 'both' = 'both'): string {
  const absoluteMins = Math.abs(minuts);
  const h = Math.floor(absoluteMins / 60);
  const m = absoluteMins % 60;
  
  const sign = minuts < 0 ? '-' : '';
  const decimalStr = `${sign}${(absoluteMins / 60).toFixed(2).replace(/\.00$/, '')} h`;
  
  let clockStr = '';
  if (h > 0 && m > 0) {
    clockStr = `${sign}${h} h ${m} min`;
  } else if (h > 0) {
    clockStr = `${sign}${h} h`;
  } else {
    clockStr = `${sign}${m} min`;
  }
  
  if (mode === 'decimal') return decimalStr;
  if (mode === 'clock') return clockStr;
  return `${decimalStr} (${clockStr})`;
}

/**
 * Formats standard amount into a currency string (e.g. € or selected currency)
 */
export function formatCurrency(amount: number, currency = 'EUR'): string {
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : currency === 'GBP' ? '£' : currency;
  return `${amount.toFixed(2).replace('.', ',')} ${symbol}`;
}

/**
 * Validates a single time entry and returns its computed status: "correcte" | "pendent de revisar" | "incoherent"
 * and an array of detected warning messages.
 */
export function validateEntry(
  entry: TimeEntry,
  projects: Project[],
  tasks: Task[],
  allEntries: TimeEntry[]
): { status: EntryStatus; warnings: string[] } {
  const warnings: string[] = [];
  let status: EntryStatus = 'correcte';

  // 1. Registres sense projecte
  if (!entry.projecteId) {
    warnings.push('El registre no té cap projecte associat.');
    status = 'incoherent';
  }

  const project = projects.find(p => p.id === entry.projecteId);
  const task = entry.tascaId ? tasks.find(t => t.id === entry.tascaId) : undefined;

  // 2. Registres sense hora de finalització
  if (!entry.horaFi) {
    warnings.push('Falta l’hora de finalització.');
    status = 'pendent de revisar';
  } else {
    // 3. Hora d’inici anterior a hora de finalització (durada negativa)
    let duration = calculateMinutes(entry.horaInici, entry.horaFi);
    if (entry.dataFi && entry.dataFi > entry.data) {
      const diff = new Date(entry.dataFi + 'T00:00:00').getTime() - new Date(entry.data + 'T00:00:00').getTime();
      duration += Math.round(diff / 86400000) * 1440;
    }
    if (duration < 0) {
      warnings.push(`L'hora de fi (${entry.horaFi}) és anterior a la d'inici (${entry.horaInici}).`);
      status = 'incoherent';
    } else if (duration === 0) {
      warnings.push('La durada del registre és de 0 minuts.');
      if (status !== 'incoherent') status = 'pendent de revisar';
    }
  }

  // 4. Registres sense tarifa quan estan marcats com a facturables
  if (entry.facturable && (!entry.tarifaHorariaAplicada || entry.tarifaHorariaAplicada <= 0)) {
    warnings.push('El registre és facturable però no té tarifa horària aplicada.');
    if (status === 'correcte') status = 'pendent de revisar';
  }

  // 5. Projecte arxivat amb registres nous
  if (project && project.estat === 'arxivat') {
    // Check if entry was modified or created after project archive, or just check if it references it
    warnings.push(`El projecte "${project.nom}" està arxivat.`);
    if (status === 'correcte') status = 'pendent de revisar';
  }

  // 6. Tasca arxivada amb registres nous
  if (entry.tascaId && task && task.estat === 'arxivada') {
    warnings.push(`La tasca "${task.nom}" s'ha arxivat.`);
    if (status === 'correcte') status = 'pendent de revisar';
  }

  // 7. Registres solapats (mateix dia, hores solapades amb un altre registre, excepte ell mateix)
  if (entry.horaFi) {
    const entryStart = timeToMinutes(entry.horaInici);
    const entryEnd = timeToMinutes(entry.horaFi);

    const isOverlapping = allEntries.some(other => {
      if (other.id === entry.id || other.data !== entry.data || !other.horaFi) return false;
      const otherStart = timeToMinutes(other.horaInici);
      const otherEnd = timeToMinutes(other.horaFi);

      // Overlap condition: startA < endB and startB < endA
      return entryStart < otherEnd && otherStart < entryEnd;
    });

    if (isOverlapping) {
      warnings.push('Hi ha un altre registre de temps que es solapa amb aquestes hores.');
      status = 'incoherent';
    }
  }

  return { status, warnings };
}

/**
 * Coverts HH:MM string to absolute minutes from 00:00
 */
export function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Formats ISO dates to DD/MM/YYYY
 */
export function formatDate(dateStr: string, format: 'dd/MM/yyyy' | 'yyyy-MM-dd' = 'dd/MM/yyyy'): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr; // Fallback
  const [yyyy, mm, dd] = parts;
  if (format === 'dd/MM/yyyy') {
    return `${dd}/${mm}/${yyyy}`;
  }
  return dateStr;
}

/**
 * Parse DD/MM/YYYY back into YYYY-MM-DD
 */
export function parseDate(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const [dd, mm, yyyy] = parts;
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
    }
  }
  return dateStr;
}

/** Local dates are not UTC. Parsing YYYY-MM-DD with Date(string) can shift the
 * displayed day for users in some time zones, so normalize explicitly. */
export function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseLocalDay(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function isToday(dateStr: string): boolean {
  return dateStr === localToday();
}

export function isThisWeek(dateStr: string, weekStartsOn: 'monday' | 'sunday' = 'monday'): boolean {
  const date = parseLocalDay(dateStr);
  const today = new Date();
  const first = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const day = first.getDay();
  first.setDate(first.getDate() - (weekStartsOn === 'monday' ? (day + 6) % 7 : day));
  const last = new Date(first);
  last.setDate(last.getDate() + 7);
  return date >= first && date < last;
}

export function isThisMonth(dateStr: string): boolean {
  const date = parseLocalDay(dateStr);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth();
}

/**
 * Get date range for weeks / months
 */
export function getWeeksInMonth(year: number, month: number): { start: Date; end: Date }[] {
  const weeks: { start: Date; end: Date }[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  let currentStart = new Date(firstDay);
  // adjust to start of week (monday)
  const day = currentStart.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  currentStart.setDate(currentStart.getDate() + diff);

  while (currentStart <= lastDay) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 6);
    weeks.push({
      start: new Date(currentStart),
      end: new Date(currentEnd)
    });
    currentStart.setDate(currentStart.getDate() + 7);
  }

  return weeks;
}
