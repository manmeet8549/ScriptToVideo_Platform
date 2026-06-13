import { db } from './db';
import { Organization } from '@prisma/client';

export interface TenantContext {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  primaryColor: string;
  secondaryColor: string;
  status: string;
  subscriptionPlan: string;
}

/**
 * Resolves the current organization based on the hostname.
 * Supports:
 * 1. Custom Domains (e.g. studio.acme.com) mapped to CustomDomain model.
 * 2. Subdomains (e.g. acme.localhost or acme.scriptforge.com).
 */
export async function getTenantContext(host: string): Promise<TenantContext | null> {
  if (!host) return null;

  // 1. Strip port number
  const hostname = host.split(':')[0].toLowerCase();

  // If host is the root domain, return null (renders main platform portal)
  const mainDomain = (process.env.NEXT_PUBLIC_MAIN_DOMAIN || 'localhost').toLowerCase();
  
  if (hostname === 'localhost' || hostname === mainDomain || hostname === 'www.' + mainDomain) {
    return null;
  }

  try {
    // 2. Check Custom Domain Registry first
    const customDomain = await db.customDomain.findFirst({
      where: { domain: hostname, verified: true },
      include: { organization: true }
    });

    if (customDomain && customDomain.organization) {
      const org = customDomain.organization;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        primaryColor: org.primaryColor || '#000000',
        secondaryColor: org.secondaryColor || '#ffffff',
        status: org.status,
        subscriptionPlan: org.subscriptionPlan
      };
    }

    // 3. Check Subdomain Slug
    let slug: string | null = null;
    if (hostname.endsWith('.' + mainDomain)) {
      slug = hostname.slice(0, -(mainDomain.length + 1));
    } else if (hostname.endsWith('.localhost')) {
      slug = hostname.slice(0, -('.localhost'.length));
    } else {
      // Fallback: split by dots and take the first item if it's a multi-level domain
      const parts = hostname.split('.');
      if (parts.length > 1) {
        slug = parts[0];
      }
    }

    if (slug && slug !== 'www') {
      const org = await db.organization.findUnique({
        where: { slug }
      });

      if (org) {
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logo: org.logo,
          primaryColor: org.primaryColor || '#000000',
          secondaryColor: org.secondaryColor || '#ffffff',
          status: org.status,
          subscriptionPlan: org.subscriptionPlan
        };
      }
    }
  } catch (err) {
    console.error('[TENANT_RESOLUTION] Error resolving host:', hostname, err);
  }

  return null;
}
