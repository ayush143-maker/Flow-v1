import { fnv1a } from './format';

/** SHA-256 hex; falls back to FNV when WebCrypto is unavailable. */
export async function sha256Hex(input: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return `fnv$${fnv1a(input)}`;
}
