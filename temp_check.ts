import { db } from './src/lib/db';

async function run() {
  try {
    const latestVideos = await db.video.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      take: 5,
    });

    console.log('--- LATEST 5 VIDEOS ---');
    latestVideos.forEach((v, idx) => {
      console.log(`${idx + 1}. Video: "${v.title}"`);
      console.log(`   ID: ${v.id}`);
      console.log(`   URL: ${v.videoUrl ? v.videoUrl.substring(0, 100) + '...' : '(null)'}`);
      console.log(`   R2 Key: ${v.r2Key}`);
      console.log(`   Status: ${v.status}`);
    });
  } catch (err: any) {
    console.error('Error:', err);
  } finally {
    await db.$disconnect();
  }
}

run();
