/**
 * Environment configuration validator for Zernio multi-platform social publishing.
 */
export function validateZernioConfig() {
  const apiKey = process.env.ZERNIO_API_KEY || null;
  const webhookSecret = process.env.ZERNIO_WEBHOOK_SECRET || null;

  // Log validation status safely without exposing private credentials
  if (!apiKey) {
    console.warn('[ZERNIO_CONFIG] Warning: ZERNIO_API_KEY is not configured. Zernio multi-platform social publishing will be disabled.');
  } else {
    console.log('[ZERNIO_CONFIG] Zernio API Key is configured.');
  }

  return {
    apiKey,
    webhookSecret,
    isConfigured: !!apiKey,
  };
}
