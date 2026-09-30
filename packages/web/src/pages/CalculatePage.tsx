import {
  ageLastBirthday,
  createIllustrationSchema,
  illustrationInputShape,
  instalmentsPerYear,
  isValidIsoDate,
  minimumSumAssured,
  D,
  type IllustrationInput,
} from '@app/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useForm, useWatch, type Path, type Resolver } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import type { z } from 'zod'
import { api, apiError } from '../api/client'
import type { IllustrationView, PolicyTypeView } from '../api/types'
import { Alert, Field, PageLoading, Spinner } from '../components/Field'
import { Icon } from '../components/Icon'
import { PageHeader } from '../components/PageHeader'
import { PlanDetails } from '../components/PolicyDetails'
import { invalid } from '../lib/aria'
import {
  amountInWords,
  FREQUENCY_LABEL,
  FREQUENCY_PER,
  formatINR,
  formatINRCompact,
  formatIrr,
  todayIso,
} from '../lib/format'

type FormInput = z.input<typeof illustrationInputShape>

export function CalculatePage() {
  const navigate = useNavigate()
  const [policyTypes, setPolicyTypes] = useState<PolicyTypeView[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [quote, setQuote] = useState<{ key: string; data: IllustrationView | null } | null>(null)
  const today = todayIso()


  const resolver = useMemo<Resolver<FormInput, unknown, IllustrationInput>>(
    () => (values, ctx, opts) => {
      const policy = policyTypes.find((p) => p.code === values.policyTypeCode)
      return zodResolver(createIllustrationSchema(policy, todayIso()))(values, ctx, opts)
    },
    [policyTypes],
  )

  const { control, register, handleSubmit, getValues, setValue, setError, formState } = useForm<FormInput, unknown, IllustrationInput>({
    resolver,
    mode: 'onTouched',
    defaultValues: { policyTypeCode: '', gender: 'MALE', frequency: 'ANNUAL' },
  })
  const { errors, isSubmitting } = formState

  useEffect(() => {
    api
      .get<{ policyTypes: PolicyTypeView[] }>('/policy-types')
      .then((r) => {
        setPolicyTypes(r.data.policyTypes)
        if (r.data.policyTypes[0]) setValue('policyTypeCode', r.data.policyTypes[0].code)
      })
      .catch((err) => setLoadError(apiError(err).message))
  }, [setValue])

  const values = useWatch({ control }) as FormInput
  const policy = policyTypes.find((p) => p.code === values.policyTypeCode)

  function onPlanChange(code: string) {
    const next = policyTypes.find((p) => p.code === code)
    if (!next) return
    const current = getValues()
    if (!next.premiumOptions.some((o) => o.frequency === current.frequency)) {
      setValue('frequency', next.premiumOptions[0]!.frequency)
    }
  }

  const localCheck = useMemo(
    () => (policy ? createIllustrationSchema(policy, today).safeParse(values) : null),
    [values, policy, today],
  )
  const quoteKey = localCheck?.success ? JSON.stringify(localCheck.data) : null
  const latestKey = useRef<string | null>(null)
  useEffect(() => {
    latestKey.current = quoteKey
    if (!quoteKey) return
    const timer = setTimeout(async () => {
      let data: IllustrationView | null = null
      try {
        data = (await api.post<IllustrationView>('/illustrations/preview', JSON.parse(quoteKey))).data
      } catch {
        data = null
      }
      if (latestKey.current === quoteKey) setQuote({ key: quoteKey, data })
    }, 350)
    return () => clearTimeout(timer)
  }, [quoteKey])
  const preview = quoteKey ? (quote?.data ?? null) : null
  const previewing = quoteKey !== null && quote?.key !== quoteKey

  const onSubmit = handleSubmit(async (input) => {
    setFormError(null)
    try {
      const { data } = await api.post<IllustrationView>('/illustrations', input)
      navigate(`/illustration/${data.id}`)
    } catch (err) {
      const e = apiError(err)
      if (e.details?.length) e.details.forEach((d) => setError(d.field as Path<FormInput>, { message: d.message }))
      else setFormError(e.message)
    }
  })

  if (loadError) return <Alert>{loadError}</Alert>
  if (!policyTypes.length) return <PageLoading label="Loading plans…" />

  const age = values.dob && isValidIsoDate(values.dob) ? ageLastBirthday(values.dob, today) : null
  const sumAssured = Number(values.sumAssured)
  const modalPremium = Number(values.modalPremium)
  const perYear = policy && instalmentsPerYear(policy, values.frequency ?? '')
  const minSumAssured =
    policy && perYear && modalPremium > 0 ? minimumSumAssured(policy, new D(modalPremium).times(perYear)) : null
  const num = { valueAsNumber: true } as const

  return (
    <>
      <PageHeader title="New illustration" subtitle="Choose a plan and enter the policyholder’s details. The benefit and IRR update as you go." />

      <form className="calc-layout" noValidate onSubmit={onSubmit}>
        <div className="card">
          <Section step={1} title="Choose a plan">
            <div className="choice-grid" role="radiogroup" aria-label="Plan">
              {policyTypes.map((p) => (
                <label key={p.code} className={`choice${p.code === values.policyTypeCode ? ' selected' : ''}`}>
                  <input
                    type="radio"
                    value={p.code}
                    {...register('policyTypeCode', { onChange: (e) => onPlanChange(e.target.value) })}
                  />
                    <span className="choice-indicator">
                    <Icon name="check" size={12} />
                  </span>
                  <span>
                    <span className="choice-title">{p.name}</span>
                    <span className="choice-desc" style={{ display: 'block' }}>
                      {p.description}
                    </span>
                    <span className="choice-meta">
                      <span>Age {p.minAge}–{p.maxAge}</span>
                      <span>Term {p.minTerm}–{p.maxTerm} yrs</span>
                      <span>
                        Premium {formatINRCompact(p.minPremium)}–{formatINRCompact(p.maxPremium)}
                      </span>
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </Section>

          <Section step={2} title="Policyholder">
            <div className="grid-2">
              <Field
                label="Date of birth"
                htmlFor="dob"
                error={errors.dob}
                hint={age !== null ? `Age ${age} at last birthday` : policy && `Entry age ${policy.minAge}–${policy.maxAge}`}
              >
                <input id="dob" className="input" type="date" max={today} aria-invalid={invalid(errors.dob)} {...register('dob')} />
              </Field>
              <Field label="Gender" error={errors.gender}>
                <Segmented>
                  {(['MALE', 'FEMALE', 'OTHER'] as const).map((g) => (
                    <label key={g}>
                      <input type="radio" value={g} {...register('gender')} />
                      <span>{g.charAt(0) + g.slice(1).toLowerCase()}</span>
                    </label>
                  ))}
                </Segmented>
              </Field>
            </div>
          </Section>

          <Section step={3} title="Premium">
            <div className="stack" style={{ gap: 16 }}>
              <Field label="How often will premiums be paid?" error={errors.frequency}>
                <Segmented>
                  {policy?.premiumOptions.map((o) => (
                    <label key={o.frequency}>
                      <input type="radio" value={o.frequency} {...register('frequency')} />
                      <span>{FREQUENCY_LABEL[o.frequency]}</span>
                    </label>
                  ))}
                </Segmented>
              </Field>
              <Field
                label={`${FREQUENCY_LABEL[values.frequency ?? 'ANNUAL']} premium`}
                htmlFor="premium"
                error={errors.modalPremium}
                hint={
                  <>
                    {modalPremium > 0 && perYear && perYear > 1 && (
                      <strong className="text-2">{formatINR(modalPremium * perYear)} a year · </strong>
                    )}
                    {policy && `${formatINR(policy.minPremium)} to ${formatINR(policy.maxPremium)} per instalment`}
                  </>
                }
              >
                <div className="input-affix">
                  <span className="affix">₹</span>
                  <input id="premium" className="input" type="number" min={0} step={1000} inputMode="numeric" placeholder="40,000" aria-invalid={invalid(errors.modalPremium)} {...register('modalPremium', num)} />
                </div>
              </Field>
            </div>
          </Section>

          <Section step={4} title="Cover and terms">
            <div className="stack" style={{ gap: 16 }}>
              <Field
                label="Sum assured"
                htmlFor="sa"
                error={errors.sumAssured}
                hint={
                  <>
                    {sumAssured > 0 && <strong className="text-2">{amountInWords(sumAssured)} · </strong>}
                    {minSumAssured
                      ? `At least ${formatINR(minSumAssured.toString())}`
                      : policy && `At least ${policy.sumAssuredMultiple}× the annual premium, capped at ${formatINR(policy.sumAssuredCap)}`}
                  </>
                }
              >
                <div className="input-affix">
                  <span className="affix">₹</span>
                  <input id="sa" className="input" type="number" min={0} step={10000} inputMode="numeric" placeholder="12,00,000" aria-invalid={invalid(errors.sumAssured)} {...register('sumAssured', num)} />
                </div>
              </Field>
              <div className="grid-2">
                <Field label="Policy term" htmlFor="pt" error={errors.policyTerm} hint={policy && `${policy.minTerm}–${policy.maxTerm} years, longer than the paying term`}>
                  <div className="input-affix">
                    <input id="pt" className="input" style={{ paddingLeft: 12 }} type="number" inputMode="numeric" placeholder="18" aria-invalid={invalid(errors.policyTerm)} {...register('policyTerm', num)} />
                    <span className="suffix">years</span>
                  </div>
                </Field>
                <Field
                  label="Premium paying term"
                  htmlFor="ppt"
                  error={errors.premiumTerm}
                  hint={policy && `${policy.minPremiumTerm}–${policy.maxPremiumTerm} years`}
                >
                  <div className="input-affix">
                    <input id="ppt" className="input" style={{ paddingLeft: 12 }} type="number" inputMode="numeric" placeholder="10" aria-invalid={invalid(errors.premiumTerm)} {...register('premiumTerm', num)} />
                    <span className="suffix">years</span>
                  </div>
                </Field>
              </div>
            </div>
          </Section>

        </div>

        <aside className="quote stack">
          <QuoteCard
            preview={preview}
            previewing={previewing}
            frequency={values.frequency ?? 'ANNUAL'}
            submitting={isSubmitting}
            formError={formError}
          />
          {policy && <PlanDetails policy={policy} />}
        </aside>
      </form>
    </>
  )
}

function Section({ step, title, optional, children }: { step: number; title: string; optional?: boolean; children: ReactNode }) {
  return (
    <section className="form-section">
      <div className="section-title">
        <span className="step">{step}</span>
        <h2>
          {title} {optional && <span className="optional">(optional)</span>}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Segmented({ children }: { children: ReactNode }) {
  return (
    <div className="segmented" role="radiogroup">
      {children}
    </div>
  )
}

function QuoteCard({
  preview,
  previewing,
  frequency,
  submitting,
  formError,
}: {
  preview: IllustrationView | null
  previewing: boolean
  frequency: string
  submitting: boolean
  formError: string | null
}) {
  return (
    <div className="card" aria-live="polite">
      {preview ? (
        <div className={previewing ? 'updating' : undefined}>
          <div className="quote-hero">
            <div className="label">Total benefit at age {preview.summary.maturityAge}</div>
            <div className="amount">{formatINR(preview.summary.maturityBenefit)}</div>
          </div>
          <div className="quote-rows">
            <div className="quote-row">
              <span>{FREQUENCY_LABEL[frequency]} premium</span>
              <span className="num">
                {formatINR(preview.premium.modalPremium)}
                <span className="muted"> / {FREQUENCY_PER[frequency]}</span>
              </span>
            </div>
            <div className="quote-row">
              <span>Premiums paid for</span>
              <span>{preview.input.premiumTerm} years</span>
            </div>
            <div className="quote-row">
              <span>Total premiums</span>
              <span className="num">{formatINR(preview.summary.totalPremiumPaid)}</span>
            </div>
            <div className="quote-row">
              <span>Total bonus</span>
              <span className="num">{formatINR(preview.summary.totalBonus)}</span>
            </div>
            <div className="quote-row total">
              <span>IRR</span>
              <span className="num" style={{ color: 'var(--accent)' }}>
                {formatIrr(preview.summary.irr)}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="quote-empty">
          {previewing ? (
            <>
              <Spinner /> <div style={{ marginTop: 8 }}>Calculating…</div>
            </>
          ) : (
            <>
              <Icon name="calculator" size={36} />
              <div>
                <strong className="text-2" style={{ display: 'block' }}>
                  Your illustration appears here
                </strong>
                Enter date of birth, premium, sum assured and terms within the plan’s limits.
              </div>
            </>
          )}
        </div>
      )}
      <div className="quote-footer stack" style={{ gap: 12, borderTop: preview ? '1px solid var(--border)' : undefined, paddingTop: 16 }}>
        {formError && <Alert>{formError}</Alert>}
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitting}>
          {submitting ? <Spinner /> : <Icon name="chart" size={18} />} Generate illustration
        </button>
        <span className="muted small" style={{ textAlign: 'center' }}>
          Saved to your history. Bonuses are illustrative, not guaranteed.
        </span>
      </div>
    </div>
  )
}
