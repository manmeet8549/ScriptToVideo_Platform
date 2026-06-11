import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db } from '@/lib/db';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-zernio-signature') || '';
  const rawBody = await request.text();

  const secret = process.env.ZERNIO_WEBHOOK_SECRET;

  if (!secret) {
    console.error('[ZERNIO_WEBHOOK] ZERNIO_WEBHOOK_SECRET is not configured.');
    return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 });
  }

  // Timing-safe HMAC signature verification
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const signatureBuffer = Buffer.from(signature, 'utf8');
  const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

  let isValid = false;
  try {
    isValid = signatureBuffer.length === expectedBuffer.length &&
              crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch {
    isValid = false;
  }

  // Bypass signature validation in non-production environments if the secret is still the placeholder
  const isLocalPlaceholder = secret === 'whsec_placeholder_to_be_configured' && process.env.NODE_ENV !== 'production';

  if (!isValid && !isLocalPlaceholder) {
    console.error('[ZERNIO_WEBHOOK] Signature verification failed:', {
      received: signature,
      expected: expectedSignature,
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody);
    const { event } = payload;
    console.log(`[ZERNIO_WEBHOOK] Processing webhook event: ${event}`, payload);

    if (event === 'account.disconnected') {
      const zernioAccountId = payload.account?.accountId;
      if (zernioAccountId) {
        await db.socialAccount.deleteMany({
          where: { zernioAccountId },
        });
        console.log(`[ZERNIO_WEBHOOK] Deleted disconnected account: ${zernioAccountId}`);
      }
    } else if (
      event === 'post.published' ||
      event === 'post.failed' ||
      event === 'post.scheduled'
    ) {
      const zernioPostId = payload.post?.id;
      if (!zernioPostId) {
        return NextResponse.json({ error: 'Missing post ID' }, { status: 400 });
      }

      // Find the corresponding PublishedVideo record by its external ID (post._id)
      const publishedVideo = await db.publishedVideo.findFirst({
        where: { externalVideoId: zernioPostId },
      });

      if (!publishedVideo) {
        console.warn(`[ZERNIO_WEBHOOK] No matching PublishedVideo found for Zernio post ID: ${zernioPostId}`);
        return NextResponse.json({ success: true, message: 'No matching post found in database' });
      }

      const platformTarget = payload.post.platforms?.[0];

      if (event === 'post.published') {
        const publishedUrl = platformTarget?.publishedUrl || null;
        await db.publishedVideo.update({
          where: { id: publishedVideo.id },
          data: {
            status: 'Published',
            videoUrl: publishedUrl,
            publishedAt: new Date(),
          },
        });
        console.log(`[ZERNIO_WEBHOOK] PublishedVideo ${publishedVideo.id} set to Published.`);
      } else if (event === 'post.failed') {
        const errorMsg = platformTarget?.error || 'Unknown publishing error';
        await db.publishedVideo.update({
          where: { id: publishedVideo.id },
          data: {
            status: `Failed: ${errorMsg}`,
            errorMessage: errorMsg,
          },
        });
        console.log(`[ZERNIO_WEBHOOK] PublishedVideo ${publishedVideo.id} set to Failed.`);
      } else if (event === 'post.scheduled') {
        await db.publishedVideo.update({
          where: { id: publishedVideo.id },
          data: {
            status: 'Scheduled',
          },
        });
        console.log(`[ZERNIO_WEBHOOK] PublishedVideo ${publishedVideo.id} set to Scheduled.`);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[ZERNIO_WEBHOOK] Exception occurred during webhook processing:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
