import type { LocalDatabase, Settings } from '../types';

/**
 * The schema is intentionally compatible with the original Freelance Tracker JSON.
 * Keep browser storage keys unchanged so an existing user is not silently migrated
 * to an empty workspace after the rebrand.
 */
export const DEFAULT_SETTINGS: Settings = {
  currency: 'EUR',
  defaultHourlyRate: 0,
  dateFormat: 'dd/MM/yyyy',
  timeFormat: '24h',
  weekStartsOn: 'monday',
  showAmountsByDefault: true,
  freelancer: { name: '', email: '', phone: '' },
  maxActiveSessionHours: 10,
};

export function createEmptyDatabase(): LocalDatabase {
  return {
    version: '1.0.0',
    settings: { ...DEFAULT_SETTINGS, freelancer: { ...DEFAULT_SETTINGS.freelancer } },
    clients: [],
    projects: [],
    tasks: [],
    timeEntries: [],
    activeSession: null,
    auditLog: [],
  };
}

export function normalizeDatabase(value: unknown): LocalDatabase {
  if (!value || typeof value !== 'object') throw new Error('El fitxer no conté dades vàlides.');
  const raw = value as Partial<LocalDatabase>;
  if (!Array.isArray(raw.clients) || !Array.isArray(raw.projects) || !Array.isArray(raw.timeEntries)) {
    throw new Error('Falten les llistes de clients, projectes o registres.');
  }
  const settings = raw.settings ?? DEFAULT_SETTINGS;
  return {
    version: typeof raw.version === 'string' ? raw.version : '1.0.0',
    settings: {
      ...DEFAULT_SETTINGS,
      ...settings,
      freelancer: { ...DEFAULT_SETTINGS.freelancer, ...settings.freelancer },
    },
    clients: raw.clients,
    projects: raw.projects,
    tasks: Array.isArray(raw.tasks) ? raw.tasks : [],
    timeEntries: raw.timeEntries,
    activeSession: raw.activeSession ?? null,
    auditLog: Array.isArray(raw.auditLog) ? raw.auditLog : [],
  };
}
