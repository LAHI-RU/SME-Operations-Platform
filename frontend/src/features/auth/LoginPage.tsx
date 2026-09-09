import { useEffect, useRef, useState, type FormEvent } from 'react'
import { ArrowRight, Eye, EyeOff, Layers } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Card } from '../../components/ui/Card'
import { Input } from '../../components/ui/Input'
import { ApiError, authStore } from '../../lib/api'
import { useAuth } from './use-auth'

export function LoginPage() {
  const { notice } = useAuth()
  const [busy, setBusy] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
  const email = useRef<HTMLInputElement>(null)
  const password = useRef<HTMLInputElement>(null)
  const feedback = useRef<HTMLParagraphElement>(null)
  const submitting = useRef(false)
  useEffect(() => { document.title = 'Sign in | SME Operations'; email.current?.focus() }, [])
  useEffect(() => {
    if (errors.email) email.current?.focus()
    else if (errors.password) password.current?.focus()
    else if (errors.form) feedback.current?.focus()
  }, [errors])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting.current) return
    const emailValue = email.current?.value.trim() ?? ''
    const passwordValue = password.current?.value ?? ''
    const nextErrors = {
      email: !emailValue ? 'Enter your email address.' : !email.current?.validity.valid ? 'Enter a valid email address.' : undefined,
      password: !passwordValue ? 'Enter your password.' : undefined,
    }
    setErrors(nextErrors)
    if (nextErrors.email || nextErrors.password) return
    submitting.current = true
    setBusy(true)
    try {
      await authStore.login({ email: emailValue, password: passwordValue })
    } catch (error) {
      if (error instanceof ApiError && error.kind === 'validation') {
        const fields = { email: error.fieldErrors.email?.[0], password: error.fieldErrors.password?.[0] }
        setErrors({ ...fields, form: !fields.email && !fields.password ? error.message : undefined })
      } else {
        setErrors({ form: error instanceof ApiError ? error.message : 'Could not sign in. Please try again.' })
      }
    } finally {
      if (password.current) password.current.value = ''
      submitting.current = false
      setBusy(false)
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3"><span className="grid size-11 place-items-center rounded-xl bg-brand text-white"><Layers aria-hidden="true" className="size-6" /></span><div><p className="font-bold">SME Operations</p><p className="text-xs text-muted">Order fulfillment & inventory</p></div></div>
        <Card aria-labelledby="login-heading">
          <h1 id="login-heading" className="text-2xl font-bold tracking-tight">Sign in to your workspace</h1>
          <p className="mt-2 text-sm text-muted">Use the account provided by your administrator.</p>
          {notice && <p role="status" className="mt-4 rounded-lg bg-warning-soft p-3 text-sm text-warning">{notice}</p>}
          <form noValidate onSubmit={submit} className="mt-6 space-y-5">
            <Input ref={email} type="email" name="email" label="Email address" autoComplete="username" autoCapitalize="none" spellCheck={false} required readOnly={busy} error={errors.email} />
            <div className="space-y-2">
              <Input ref={password} type={showPassword ? 'text' : 'password'} name="password" label="Password" autoComplete="current-password" required readOnly={busy} error={errors.password} />
              <Button variant="secondary" aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}{showPassword ? 'Hide password' : 'Show password'}</Button>
            </div>
            {errors.form && <p ref={feedback} tabIndex={-1} role="alert" className="text-sm text-danger focus-visible:outline-2 focus-visible:outline-danger">{errors.form}</p>}
            <Button type="submit" loading={busy} className="w-full">{busy ? 'Signing in...' : 'Sign in'}{!busy && <ArrowRight aria-hidden="true" className="size-4" />}</Button>
          </form>
        </Card>
        <p className="mt-5 text-center text-xs text-muted">Need access? Contact your administrator.</p>
      </div>
    </main>
  )
}
