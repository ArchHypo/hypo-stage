import type { AgentRunStatus } from '../../api/HypoStageApi';

export const STATUS_COLORS: Record<AgentRunStatus, { background: string; color: string }> = {
  running: { background: '#e3f2fd', color: '#0d47a1' },
  completed: { background: '#e8f5e9', color: '#1b5e20' },
  failed: { background: '#ffebee', color: '#b71c1c' },
  skipped: { background: '#eceff1', color: '#37474f' },
};

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
  ['second', 1000],
];

export function formatRelative(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  for (const [unit, ms] of UNITS) {
    if (Math.abs(diff) >= ms || unit === 'second') {
      return relative.format(Math.round(diff / ms), unit);
    }
  }
  return iso;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'medium' });
}

export function formatDuration(startedAt: string, completedAt: string | null): string {
  if (!completedAt) {
    return '—';
  }
  const ms = new Date(completedAt).getTime() - new Date(startedAt).getTime();
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}
