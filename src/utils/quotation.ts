import type { Project, Task, Settings, QuoteRateBand } from '../types';

export interface QuoteRateLine extends QuoteRateBand {
  minAmount: number;
  maxAmount: number;
}
export interface QuoteLine {
  task: Task;
  blocNom?: string;
  minHours: number;
  maxHours: number;
  hourlyRate: number | null; // null means the task has multiple tariffs
  trams: QuoteRateLine[];
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

const validNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;
const money = (v: number) => Math.round((v + Number.EPSILON) * 100) / 100;

/** Existing single-tariff budgets still work when opening old JSON files. */
export function getTaskQuoteInputs(task: Task, project: Project, settings: Settings) {
  const legacyHours = validNumber(task.pressupostHores) ? task.pressupostHores : undefined;
  const legacyRate = task.tarifaHorariaPressupost ?? project.tarifaHoraria ?? settings.defaultHourlyRate;
  const trams = Array.isArray(task.pressupostTrams) ? task.pressupostTrams : undefined;
  const minHours = trams?.reduce((s, t) => s + t.horesMin, 0) ?? task.horesEstimadesMin ?? legacyHours;
  const maxHours = trams?.reduce((s, t) => s + t.horesMax, 0) ?? task.horesEstimadesMax ?? legacyHours;
  const hourlyRate: number | null = trams && trams.length > 1 ? null : (trams?.[0]?.tarifa ?? legacyRate);
  return { minHours, maxHours, hourlyRate, trams };
}

export function buildQuoteSummary(tasks: Task[], project: Project, settings: Settings): QuoteSummary {
  const lines: QuoteLine[] = [];
  const errors: string[] = [];
  for (const task of tasks) {
    const inputs = getTaskQuoteInputs(task, project, settings);
    // A defined empty tranche list is invalid, not a free/zero-cost quotation.
    const trams = inputs.trams ?? [{
      id: `legacy-${task.id}`, concepte: '', horesMin: inputs.minHours as number,
      horesMax: inputs.maxHours as number, tarifa: inputs.hourlyRate as number,
    }];
    // A missing legacy hourly tariff remains invalid; an explicit 0 €/h band is valid.
    if (!inputs.trams && (!validNumber(inputs.hourlyRate) || inputs.hourlyRate === 0)) {
      errors.push(`«${task.nom}»: indica una tarifa horària positiva o afegeix un tram explícit a 0 €/h.`);
      continue;
    }
    if (!trams.length || trams.some(t => !validNumber(t.horesMin) || !validNumber(t.horesMax) || t.horesMax < t.horesMin || !validNumber(t.tarifa))) {
      errors.push(`«${task.nom}»: revisa els trams (hores vàlides, mínim ≤ màxim i tarifa ≥ 0).`);
      continue;
    }
    if (!trams.some(t => t.horesMax > 0)) {
      errors.push(`«${task.nom}»: afegeix almenys un tram amb hores estimades.`);
      continue;
    }
    const ratedTrams: QuoteRateLine[] = trams.map(t => ({
      ...t, minAmount: money(t.horesMin * t.tarifa), maxAmount: money(t.horesMax * t.tarifa),
    }));
    lines.push({
      task,
      trams: ratedTrams,
      minHours: trams.reduce((sum, t) => sum + t.horesMin, 0),
      maxHours: trams.reduce((sum, t) => sum + t.horesMax, 0),
      hourlyRate: inputs.hourlyRate,
      minAmount: money(ratedTrams.reduce((sum, t) => sum + t.minAmount, 0)),
      maxAmount: money(ratedTrams.reduce((sum, t) => sum + t.maxAmount, 0)),
    });
  }
  return {
    lines, errors,
    minHours: lines.reduce((s, line) => s + line.minHours, 0),
    maxHours: lines.reduce((s, line) => s + line.maxHours, 0),
    minAmount: money(lines.reduce((s, line) => s + line.minAmount, 0)),
    maxAmount: money(lines.reduce((s, line) => s + line.maxAmount, 0)),
  };
}

export function quoteRange(min: number, max: number, currency: string, digits = 2): string {
  const fmt = new Intl.NumberFormat('ca-ES', {
    style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
  });
  return min === max ? fmt.format(min) : `${fmt.format(min)} – ${fmt.format(max)}`;
}
export function hoursRange(min: number, max: number): string {
  const fmt = (v: number) => new Intl.NumberFormat('ca-ES', { maximumFractionDigits: 2 }).format(v);
  return min === max ? `${fmt(min)} h` : `${fmt(min)}–${fmt(max)} h`;
}
