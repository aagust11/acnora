import type { Project, Task, Settings } from '../types';

export interface QuoteLine {
  task: Task;
  minHours: number;
  maxHours: number;
  hourlyRate: number;
  minAmount: number;
  maxAmount: number;
}

export interface QuoteSummary {
  lines: QuoteLine[];
  errors: string[];
  minHours: number;
  maxHours: number;
  minAmount: number;
  maxAmount: number;
}

const isNonNegative = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0;

/** Legacy single-value budgets remain usable without modifying old JSON files. */
export function getTaskQuoteInputs(task: Task, project: Project, settings: Settings) {
  const oldHours = isNonNegative(task.pressupostHores) ? task.pressupostHores : undefined;
  return {
    minHours: task.horesEstimadesMin ?? oldHours,
    maxHours: task.horesEstimadesMax ?? oldHours,
    hourlyRate: task.tarifaHorariaPressupost ?? project.tarifaHoraria ?? settings.defaultHourlyRate,
  };
}

export function buildQuoteSummary(tasks: Task[], project: Project, settings: Settings): QuoteSummary {
  const lines: QuoteLine[] = [];
  const errors: string[] = [];

  for (const task of tasks) {
    const { minHours, maxHours, hourlyRate } = getTaskQuoteInputs(task, project, settings);
    if (!isNonNegative(minHours) || !isNonNegative(maxHours) || maxHours < minHours) {
      errors.push(`«${task.nom}»: indica un mínim i un màxim d’hores vàlids (mínim ≤ màxim).`);
      continue;
    }
    if (!isNonNegative(hourlyRate) || hourlyRate === 0) {
      errors.push(`«${task.nom}»: indica una tarifa horària positiva.`);
      continue;
    }
    lines.push({
      task,
      minHours,
      maxHours,
      hourlyRate,
      minAmount: Math.round(minHours * hourlyRate * 100) / 100,
      maxAmount: Math.round(maxHours * hourlyRate * 100) / 100,
    });
  }

  return {
    lines,
    errors,
    minHours: lines.reduce((sum, line) => sum + line.minHours, 0),
    maxHours: lines.reduce((sum, line) => sum + line.maxHours, 0),
    minAmount: Math.round(lines.reduce((sum, line) => sum + line.minAmount, 0) * 100) / 100,
    maxAmount: Math.round(lines.reduce((sum, line) => sum + line.maxAmount, 0) * 100) / 100,
  };
}

export function quoteRange(min: number, max: number, currency: string, digits = 2): string {
  const formatter = new Intl.NumberFormat('ca-ES', {
    style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
  return min === max ? formatter.format(min) : `${formatter.format(min)} – ${formatter.format(max)}`;
}

export function hoursRange(min: number, max: number): string {
  const fmt = (v: number) => new Intl.NumberFormat('ca-ES', { maximumFractionDigits: 2 }).format(v);
  return min === max ? `${fmt(min)} h` : `${fmt(min)}–${fmt(max)} h`;
}
