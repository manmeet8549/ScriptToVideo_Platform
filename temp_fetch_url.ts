import { generateSignedUrl } from './src/lib/r2';

async function run() {
  try {
    const key = 'videos/cmq6g26lp000004k1r0n4rsjd/cmq6k8058000004jll62cebl6.mp4';
    const url = await generateSignedUrl(key, 3600);
    console.log('Signed URL:', url);

    console.log('Fetching signed URL...');
    const res = await fetch(url, { method: 'GET' });
    console.log('Response Status:', res.status);
    console.log('Response Headers:', Object.fromEntries(res.headers.entries()));
    if (!res.ok) {
      const text = await res.text();
      console.log('Response Text:', text);
    }
  } catch (err) {
    console.error('Error fetching URL:', err);
  }
}

run();
