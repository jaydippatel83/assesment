import { loginSchema, registerSchema, type LoginInput, type RegisterInput } from '@app/core'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, type FieldValues, type Path, type UseFormSetError } from 'react-hook-form'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { apiError } from '../api/client'
import { useAuth } from '../auth/useAuth'
import { Alert, Field, Spinner } from '../components/Field'
import { Icon, type IconName } from '../components/Icon'
import { Wordmark } from '../components/Layout'
import { invalid } from '../lib/aria'

function applyServerError<T extends FieldValues>(err: unknown, setError: UseFormSetError<T>) {
  const e = apiError(err)
  if (e.details?.length) {
    e.details.forEach((d) => setError(d.field as Path<T>, { message: d.message }))
    return null
  }
  return e.message
}

const FEATURES: { icon: IconName; title: string; text: string }[] = [
  { icon: 'zap', title: 'Instant quotes', text: 'Premiums recalculate as you type, validated against each plan’s rules.' },
  { icon: 'chart', title: 'Year-by-year projection', text: 'Premiums, bonuses, death and maturity benefits for the whole term.' },
  { icon: 'lock', title: 'Your data stays private', text: 'Personal details are encrypted at rest and masked on screen.' },
]

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const { user } = useAuth()
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/calculate'

  if (user) return <Navigate to={from} replace />

  return (
    <div className="auth">
      <aside className="auth-aside">
        <Wordmark />
        <div>
          <h1>See exactly what a policy pays, year by year.</h1>
          <p className="lead">Compare plans, add riders and generate a full benefit illustration in seconds.</p>
          <ul className="feature-list">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <span className="icon">
                  <Icon name={f.icon} size={17} />
                </span>
                <span>
                  <strong>{f.title}</strong>
                  {f.text}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <small style={{ color: 'rgb(255 255 255 / 0.6)' }}>Illustrations are indicative and not a contract.</small>
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <Wordmark />
          <h2>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h2>
          <p className="subtitle">
            {mode === 'login' ? 'Sign in to calculate and view your illustrations.' : 'It takes less than a minute.'}
          </p>

          {mode === 'login' ? <LoginForm redirectTo={from} /> : <RegisterForm redirectTo={from} />}

          <p className="auth-switch">
            {mode === 'login' ? 'New here? ' : 'Already have an account? '}
            <button type="button" className="link-button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
              {mode === 'login' ? 'Create an account' : 'Sign in'}
            </button>
          </p>
        </div>
      </main>
    </div>
  )
}

function PasswordInput(props: React.ComponentProps<'input'>) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="input-affix">
      <input {...props} type={visible ? 'text' : 'password'} className="input" style={{ paddingRight: 44 }} />
      <button
        type="button"
        className="btn btn-ghost"
        onClick={() => setVisible((v) => !v)}
        style={{ position: 'absolute', right: 2, top: 1, height: 38, padding: '0 10px' }}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        <Icon name={visible ? 'eyeOff' : 'eye'} size={17} />
      </button>
    </div>
  )
}

function LoginForm({ redirectTo }: { redirectTo: string }) {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, formState } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  })
  const { errors, isSubmitting } = formState

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await login(values)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setFormError(applyServerError(err, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="auth-form">
      {formError && <Alert>{formError}</Alert>}
      <Field label="Email" htmlFor="login-email" error={errors.email}>
        <input id="login-email" className="input" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={invalid(errors.email)} {...register('email')} />
      </Field>
      <Field label="Password" htmlFor="login-password" error={errors.password}>
        <PasswordInput id="login-password" autoComplete="current-password" aria-invalid={invalid(errors.password)} {...register('password')} />
      </Field>
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={isSubmitting}>
        {isSubmitting && <Spinner />} Sign in
      </button>
    </form>
  )
}

function RegisterForm({ redirectTo }: { redirectTo: string }) {
  const { register: registerUser } = useAuth()
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const { register, handleSubmit, setError, formState } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
  })
  const { errors, isSubmitting } = formState

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null)
    try {
      await registerUser(values)
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setFormError(applyServerError(err, setError))
    }
  })

  return (
    <form onSubmit={onSubmit} noValidate className="auth-form">
      {formError && <Alert>{formError}</Alert>}
      <Field label="Full name" htmlFor="reg-name" error={errors.fullName}>
        <input id="reg-name" className="input" autoComplete="name" placeholder="As on your ID" aria-invalid={invalid(errors.fullName)} {...register('fullName')} />
      </Field>
      <Field label="Email" htmlFor="reg-email" error={errors.email}>
        <input id="reg-email" className="input" type="email" autoComplete="email" placeholder="you@example.com" aria-invalid={invalid(errors.email)} {...register('email')} />
      </Field>
      <div className="grid-2">
        <Field label="Date of birth" htmlFor="reg-dob" error={errors.dob}>
          <input id="reg-dob" className="input" type="date" autoComplete="bday" aria-invalid={invalid(errors.dob)} {...register('dob')} />
        </Field>
        <Field label="Mobile" htmlFor="reg-mobile" error={errors.mobile}>
          <div className="input-affix">
            <span className="affix">+91</span>
            <input id="reg-mobile" className="input" style={{ paddingLeft: 44 }} type="tel" inputMode="numeric" maxLength={10} autoComplete="tel-national" placeholder="98765 43210" aria-invalid={invalid(errors.mobile)} {...register('mobile')} />
          </div>
        </Field>
      </div>
      <Field label="Password" htmlFor="reg-password" error={errors.password} hint="At least 8 characters, with a letter and a digit">
        <PasswordInput id="reg-password" autoComplete="new-password" aria-invalid={invalid(errors.password)} {...register('password')} />
      </Field>
      <div className="notice">
        <Icon name="shieldCheck" size={16} />
        Your name, date of birth, mobile and email are encrypted before they’re stored, and shown masked.
      </div>
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={isSubmitting}>
        {isSubmitting && <Spinner />} Create account
      </button>
    </form>
  )
}
