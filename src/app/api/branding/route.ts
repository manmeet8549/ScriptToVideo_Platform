import { NextRequest, NextResponse } from 'next/server';
import { getTenantContext } from '@/lib/tenant';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let host = searchParams.get('host') || request.headers.get('host') || '';

    // Handle forwarded host (useful behind reverse proxies)
    const forwardedHost = request.headers.get('x-forwarded-host');
    if (forwardedHost) {
      host = forwardedHost;
    }

    const tenant = await getTenantContext(host);

    if (tenant) {
      return NextResponse.json({
        branded: true,
        organization: tenant
      });
    }

    return NextResponse.json({
      branded: false
    });
  } catch (error) {
    console.error('[BRANDING_API] Error fetching branding:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
