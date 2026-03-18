import LZString from 'lz-string';
import { BillState } from '@/types';

export const encodeState = (state: BillState): string => {
  const json = JSON.stringify(state);
  return LZString.compressToEncodedURIComponent(json);
};

export const decodeState = (encoded: string): BillState | null => {
  try {
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    return JSON.parse(json);
  } catch (e) {
    console.error('Failed to decode state', e);
    return null;
  }
};

export const generateShareUrl = (state: BillState): string => {
  if (typeof window === 'undefined') return '';
  const encoded = encodeState(state);
  const url = new URL(window.location.href);
  url.searchParams.set('s', encoded);
  return url.toString();
};
