import { db } from './src/lib/db';

async function run() {
  try {
    const completedProjects = await db.project.findMany({
      where: {
        status: 'COMPLETED',
      },
      include: {
        videos: true,
      },
    });

    console.log(`Found ${completedProjects.length} completed projects:`);
    completedProjects.forEach((p) => {
      console.log(`- Project "${p.name}" (ID: ${p.id})`);
      console.log(`  Project videoUrl: ${p.videoUrl}`);
      console.log(`  Videos count: ${p.videos.length}`);
      p.videos.forEach((v) => {
        console.log(`    * Video ID: ${v.id}, Status: ${v.status}, r2Key: ${v.r2Key}, videoUrl: ${v.videoUrl ? v.videoUrl.substring(0, 100) + '...' : '(null)'}`);
      });
    });
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await db.$disconnect();
  }
}

run();
