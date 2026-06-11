import { Zernio } from '@zernio/node';

const apiKey = process.env.ZERNIO_API_KEY;

if (!apiKey) {
  console.warn('[ZERNIO] API key is missing. Ensure ZERNIO_API_KEY is configured in your environment.');
}

export const zernio = new Zernio({
  apiKey: apiKey || '',
});
