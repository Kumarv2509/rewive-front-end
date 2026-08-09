import type { FindingSeverity, FindingStatus } from '../../api/types';

export const severityTone: Record<FindingSeverity, 'red' | 'amber' | 'indigo' | 'gray'> = {
  critical: 'red',
  high: 'amber',
  medium: 'indigo',
  low: 'gray',
};

export const statusLabel: Record<FindingStatus, string> = {
  open: 'needs a decision',
  accepted: 'accepted · recovery target set',
  acting: 'acting · fix in motion',
  acknowledged: 'parked · will re-alert',
  abandoned: 'dismissed · agent tuned',
  closed: 'closed',
};

export const statusTone: Record<FindingStatus, 'red' | 'amber' | 'indigo' | 'teal' | 'green' | 'gray'> = {
  open: 'red',
  accepted: 'teal',
  acting: 'indigo',
  acknowledged: 'amber',
  abandoned: 'gray',
  closed: 'green',
};

export function slaTone(hours: number): 'red' | 'amber' | 'gray' {
  if (hours <= 8) return 'red';
  if (hours <= 24) return 'amber';
  return 'gray';
}
