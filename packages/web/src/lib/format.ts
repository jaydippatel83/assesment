const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
})

export const formatINR = (value: string | number) => inr.format(Number(value))

export function formatINRCompact(value: string | number) {
  const n = Number(value)
  const abs = Math.abs(n)
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, '')
  if (abs >= 1e7) return `₹${trim(n / 1e7)} Cr`
  if (abs >= 1e5) return `₹${trim(n / 1e5)} L`
  if (abs >= 1e3) return `₹${trim(n / 1e3)}K`
  return `₹${trim(n)}`
}

export function amountInWords(value: number) {
  if (!Number.isFinite(value) || value <= 0) return ''
  const trim = (x: number) => x.toFixed(2).replace(/\.?0+$/, '')
  if (value >= 1e7) return `${trim(value / 1e7)} crore`
  if (value >= 1e5) return `${trim(value / 1e5)} lakh`
  if (value >= 1e3) return `${trim(value / 1e3)} thousand`
  return String(value)
}

export const FREQUENCY_LABEL: Record<string, string> = {
  ANNUAL: 'Annual',
  SEMI_ANNUAL: 'Half-yearly',
  QUARTERLY: 'Quarterly',
  MONTHLY: 'Monthly',
}
export const FREQUENCY_PER: Record<string, string> = {
  ANNUAL: 'year',
  SEMI_ANNUAL: 'half-year',
  QUARTERLY: 'quarter',
  MONTHLY: 'month',
}
export const formatFrequency = (f: string) => FREQUENCY_LABEL[f] ?? f

export const formatPct = (fraction: string) => `${(Number(fraction) * 100).toFixed(2).replace(/\.?0+$/, '')}%`

export const formatDate = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString('en-IN', { dateStyle: 'medium' })

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })

export const todayIso = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date())
