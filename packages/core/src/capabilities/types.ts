export type FormatKind = 'audio' | 'video' | 'container';

export type FormatStatus =
  | 'direct'
  | 'sent_to_receiver'
  | 'repackaged'
  | 'converted'
  | 'untested';

export type FormatSource = 'confirmed_by_test' | 'lg_spec' | 'detected_by_tv';

export type ConvertTargetId = 'pcm' | 'eac3' | 'ac3';

export interface FormatRow {
  id: string;
  kind: FormatKind;
  label: string;
  status: FormatStatus;
  source: FormatSource;
  /** Required for every non-direct / non-sent-to-receiver row. */
  reason?: string;
  /** `auto` or a confirmed target. */
  convertTo?: 'auto' | ConvertTargetId;
  /** Extra tags used by the decision engine (codec ids, dovi profiles…). */
  codecs?: string[];
}

export interface CapabilityTable {
  profileId: string;
  displayName: string;
  rows: FormatRow[];
}

export interface ReceiverOverrides {
  /** Encoding id → confirmed status after the wizard. */
  confirmed: Record<string, FormatStatus>;
  /** Encoding id → what the AVR actually showed. */
  receiverShowed?: Record<string, string>;
}

export const CONVERT_TARGETS: Record<
  ConvertTargetId,
  { id: ConvertTargetId; label: string; lossless: boolean; jellyfinCodec: string }
> = {
  pcm: {
    id: 'pcm',
    label: 'Lossless PCM',
    lossless: true,
    jellyfinCodec: 'pcm',
  },
  eac3: {
    id: 'eac3',
    label: 'Dolby Digital Plus',
    lossless: false,
    jellyfinCodec: 'eac3',
  },
  ac3: {
    id: 'ac3',
    label: 'Dolby Digital',
    lossless: false,
    jellyfinCodec: 'ac3',
  },
};

/** Preference order: lossless PCM, then DD+, then AC-3. */
export const CONVERT_RANK: ConvertTargetId[] = ['pcm', 'eac3', 'ac3'];
