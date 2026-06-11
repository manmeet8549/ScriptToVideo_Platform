import { Zernio } from '@zernio/node';

let zernioInstance: Zernio | null = null;

/**
 * Lazily initializes and returns the Zernio client instance.
 * Throws an error at runtime if the API key is not configured.
 */
export function getZernioClient(): Zernio {
  const apiKey = process.env.ZERNIO_API_KEY;

  if (!apiKey) {
    throw new Error('[ZERNIO_INIT] Zernio API key is missing. Ensure ZERNIO_API_KEY is configured in your environment.');
  }

  if (!zernioInstance) {
    zernioInstance = new Zernio({
      apiKey,
    });
    console.log('[ZERNIO_INIT] Zernio client initialized successfully.');
  }

  return zernioInstance;
}
