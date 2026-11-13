import type { ActiveSession } from '../types';

/** Pauses are stored as timestamps to survive reloads and JSON autosaves. */
export function isSessionPaused(session: ActiveSession): boolean {
  return typeof session.pausedAt === 'number' && Number.isFinite(session.pausedAt)
    && session.pausedAt >= session.startedTimestamp;
}

export function sessionPausedMs(session: ActiveSession, now = Date.now()): number {
  const past = Number.isFinite(session.pausedMs) ? Math.max(0, session.pausedMs ?? 0) : 0;
  const current = isSessionPaused(session) ? Math.max(0, now - session.pausedAt!) : 0;
  return past + current;
}

/** Includes only working time; remains fixed while paused. */
export function sessionWorkedMs(session: ActiveSession, now = Date.now()): number {
  const end = isSessionPaused(session) ? Math.min(now, session.pausedAt!) : now;
  const completedPauseMs = Number.isFinite(session.pausedMs) ? Math.max(0, session.pausedMs ?? 0) : 0;
  return Math.max(0, end - session.startedTimestamp - completedPauseMs);
}

export function pauseSession(session: ActiveSession, now = Date.now()): ActiveSession {
  if (isSessionPaused(session)) return session;
  return { ...session, pausedAt: Math.max(now, session.startedTimestamp) };
}

export function resumeSession(session: ActiveSession, now = Date.now()): ActiveSession {
  if (!isSessionPaused(session)) return session;
  return {
    ...session,
    pausedMs: sessionPausedMs(session, now),
    pausedAt: undefined,
  };
}

export function formatSessionClock(ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
