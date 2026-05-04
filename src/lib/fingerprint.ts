
import FingerprintJS from '@fingerprintjs/fingerprintjs';

/**
 * Gets the unique device fingerprint (Visitor ID)
 */
export async function getDeviceFingerprint(): Promise<string> {
  if (typeof window === 'undefined') return '';
  const fp = await FingerprintJS.load();
  const result = await fp.get();
  return result.visitorId;
}
