export type SubscriptionPlanName = 'FREE' | 'STARTER' | 'PRO' | 'BUSINESS' | 'ENTERPRISE';

export interface PlanLimit {
  name: string;
  usersLimit: number;
  editorsLimit: number;
  monthlyCredits: {
    script: number;
    voice: number;
    video: number;
    publish: number;
  };
  storageLimitGB: number;
  price: number;
  features: string[];
}

export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanName, PlanLimit> = {
  FREE: {
    name: 'Free Tier',
    usersLimit: 2,
    editorsLimit: 1,
    monthlyCredits: { script: 5, voice: 5, video: 2, publish: 2 },
    storageLimitGB: 2.0,
    price: 0,
    features: ['2 Team Members', '1 Video Editor Connection', '2 Avatar Video Renders / mo', '5 AI Script Generations', '2GB Storage Quota']
  },
  STARTER: {
    name: 'Starter Plan',
    usersLimit: 5,
    editorsLimit: 2,
    monthlyCredits: { script: 50, voice: 50, video: 20, publish: 20 },
    storageLimitGB: 10.0,
    price: 29,
    features: ['5 Team Members', '2 Video Editor Connections', '20 Avatar Video Renders / mo', '50 AI Script Generations', '10GB Storage Quota']
  },
  PRO: {
    name: 'Professional Plan',
    usersLimit: 15,
    editorsLimit: 5,
    monthlyCredits: { script: 200, voice: 200, video: 100, publish: 100 },
    storageLimitGB: 50.0,
    price: 79,
    features: ['15 Team Members', '5 Video Editor Connections', '100 Avatar Video Renders / mo', '200 AI Script Generations', '50GB Storage Quota', 'Branding Customization']
  },
  BUSINESS: {
    name: 'Business Plan',
    usersLimit: 50,
    editorsLimit: 15,
    monthlyCredits: { script: 1000, voice: 1000, video: 500, publish: 500 },
    storageLimitGB: 200.0,
    price: 249,
    features: ['50 Team Members', '15 Video Editor Connections', '500 Avatar Video Renders / mo', '1000 AI Script Generations', '200GB Storage Quota', 'White Label & Custom Domains']
  },
  ENTERPRISE: {
    name: 'Enterprise Plan',
    usersLimit: 9999,
    editorsLimit: 9999,
    monthlyCredits: { script: 10000, voice: 10000, video: 5000, publish: 5000 },
    storageLimitGB: 1000.0,
    price: 999,
    features: ['Unlimited Team Members', 'Unlimited Editor Connections', '5000 Avatar Video Renders / mo', '10000 AI Script Generations', '1TB Storage Quota', 'Custom Branding & Priority Support']
  }
};
