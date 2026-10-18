import {
  CONVERT_TARGETS,
  findRow,
  resolveConvertTo,
  type CapabilityTable,
} from '@cinefin/core';

/** Real convert-to name after the receiver test; null until then. */
export function confirmedConvertLabel(table: CapabilityTable): string | null {
  const pcm = findRow(table, 'audio.pcm');
  if (pcm?.source === 'confirmed_by_test') return CONVERT_TARGETS.pcm.label;
  const id = resolveConvertTo(table, 'auto');
  const row =
    id === 'ac3' ? findRow(table, 'audio.ac3') : findRow(table, 'audio.eac3');
  if (row?.source === 'confirmed_by_test') return CONVERT_TARGETS[id].label;
  return null;
}
