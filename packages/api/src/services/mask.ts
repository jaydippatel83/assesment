export const maskMobile = (mobile: string) => `••••••${mobile.slice(-4)}`;

export const maskName = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .map((part) => part[0] + '•'.repeat(Math.max(part.length - 1, 0)))
    .join(' ');

export const maskDob = (isoDate: string) => `••/••/${isoDate.slice(0, 4)}`;

export const maskEmail = (email: string) => {
  const [local = '', domain = ''] = email.split('@');
  return `${local.slice(0, 1)}${'•'.repeat(Math.max(local.length - 1, 1))}@${domain}`;
};
