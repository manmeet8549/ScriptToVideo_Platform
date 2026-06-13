import { generateSignedUrl } from './src/lib/r2';

async function run() {
  try {
    const key = 'videos/cmq6g26lp000004k1r0n4rsjd/cmq6k8058000004jll62cebl6.mp4';
    const url = await generateSignedUrl(key, 3600);
    console.log('Signed URL:', url);
  } catch (err) {
    console.error('Error signing URL:', err);
  }
}

run();
