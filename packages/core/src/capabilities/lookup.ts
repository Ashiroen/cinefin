import type {
  CapabilityTable,
  ConvertTargetId,
  FormatRow,
  FormatStatus,
  ReceiverOverrides,
} from './types';
import { CONVERT_RANK, CONVERT_TARGETS } from './types';

export function findRow(table: CapabilityTable, id: string): FormatRow | undefined {
  return table.rows.find((row) => row.id === id);
}

export function findRowByCodec(
  table: CapabilityTable,
  kind: FormatRow['kind'],
  codec: string,
): FormatRow | undefined {
  const key = normalizeCodec(codec);
  return table.rows.find(
    (row) =>
      row.kind === kind &&
      (row.codecs ?? []).some((c) => normalizeCodec(c) === key),
  );
}

export function normalizeCodec(codec: string): string {
  return codec.toLowerCase().replace(/[^a-z0-9+]/g, '');
}

export function applyOverrides(
  table: CapabilityTable,
  overrides: ReceiverOverrides | undefined,
): CapabilityTable {
  if (!overrides) return table;
  return {
    ...table,
    rows: table.rows.map((row) => {
      const next = overrides.confirmed[row.id];
      if (!next) return row;
      return {
        ...row,
        status: next,
        source: 'confirmed_by_test' as const,
        reason:
          next === 'direct' || next === 'sent_to_receiver'
            ? undefined
            : row.reason,
      };
    }),
  };
}

export function isPlayable(status: FormatStatus): boolean {
  return status === 'direct' || status === 'sent_to_receiver';
}

/**
 * Confirmed convert-to targets only. Auto = first in CONVERT_RANK that is
 * confirmed by test, else the first that is at least lg_spec (eac3/ac3).
 * PCM is never chosen by Auto until the wizard confirms it.
 */
export function listConfirmedConvertTargets(table: CapabilityTable): ConvertTargetId[] {
  return CONVERT_RANK.filter((id) => {
    if (id === 'pcm') return isPcmConfirmed(table);
    const row = rowForTarget(table, id);
    if (!row) return false;
    return row.source === 'confirmed_by_test' || isPlayable(row.status);
  });
}

export function resolveConvertTo(
  table: CapabilityTable,
  preference: 'auto' | ConvertTargetId | undefined,
): ConvertTargetId {
  const confirmed = listConfirmedConvertTargets(table);
  if (preference && preference !== 'auto' && confirmed.includes(preference)) {
    return preference;
  }
  const tested = confirmed.find((id) => {
    if (id === 'pcm') return isPcmConfirmed(table);
    return rowForTarget(table, id)?.source === 'confirmed_by_test';
  });
  if (tested) return tested;
  if (confirmed.includes('eac3')) return 'eac3';
  if (confirmed.includes('ac3')) return 'ac3';
  return 'eac3';
}

export function convertTargetCodec(id: ConvertTargetId): string {
  return CONVERT_TARGETS[id].jellyfinCodec;
}

function isPcmConfirmed(table: CapabilityTable): boolean {
  const row = findRow(table, 'audio.pcm');
  return row?.source === 'confirmed_by_test' && isPlayable(row.status);
}

function rowForTarget(table: CapabilityTable, id: ConvertTargetId): FormatRow | undefined {
  if (id === 'pcm') return findRow(table, 'audio.pcm');
  if (id === 'eac3') return findRow(table, 'audio.eac3');
  return findRow(table, 'audio.ac3');
}

export function sourceCaption(row: FormatRow): string {
  switch (row.source) {
    case 'confirmed_by_test':
      return 'Confirmed by test';
    case 'lg_spec':
      return 'LG spec';
    case 'detected_by_tv':
      return 'Detected by TV';
    default:
      return '';
  }
}

export function statusLabel(status: FormatStatus): string {
  switch (status) {
    case 'direct':
      return 'Direct';
    case 'sent_to_receiver':
      return 'Sent to receiver';
    case 'repackaged':
      return 'Repackaged';
    case 'converted':
      return 'Converted';
    case 'untested':
      return 'Untested';
    default:
      return status;
  }
}
