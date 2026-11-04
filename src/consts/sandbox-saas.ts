export const DEMO_EMAIL_DOMAIN = 'demo.freshswitch.ssalhub.xyz';

export const isDemoEmail = (email: string) => {
  const domain = email.trim().toLowerCase().split('@').pop() ?? '';

  return domain === DEMO_EMAIL_DOMAIN || domain.endsWith(`.${DEMO_EMAIL_DOMAIN}`);
};
