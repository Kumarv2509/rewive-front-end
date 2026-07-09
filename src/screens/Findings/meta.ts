import type { FindingSeverity, FindingStatus } from '../../api/types';

export const severityTone: Record<FindingSeverity, 'red' | 'amber' | 'indigo' | 'gray'> = {
  critical: 'red',
  high: 'amber',
  medium: 'indigo',
  low: 'gray',
};

export const statusLabel: Record<FindingStatus, string> = {
  open: 'awaiting disposition',
  accepted: 'accepted · exit condition set',
  acting: 'acting · solution open',
  acknowledged: 'acknowledged · watching',
  abandoned: 'abandoned · agent tuned',
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
