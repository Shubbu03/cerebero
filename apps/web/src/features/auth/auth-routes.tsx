import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ArrowRightIcon,
  GoogleLogoIcon,
  SpinnerGapIcon,
} from '@phosphor-icons/react'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { Button, FormMessage } from '@cerebero/ui'
import { useForm } from 'react-hook-form'

import { authClient } from '../../lib/auth-client'
import { getAuthErrorMessage } from './auth-error'
import { AuthShell } from './auth-shell'
import { AuthFormField } from './form-field'
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
  loginSchema,
  type LoginInput,
  resetPasswordSchema,
  type ResetPasswordInput,
  signupSchema,
  type SignupInput,
} from './auth-schemas'

function SubmitLabel({
  children,
  pending,
}: {
  children: string
  pending: boolean
}) {
  return (
    <>
      {pending ? (
        <SpinnerGapIcon className="animate-spin" size={17} weight="bold" />
      ) : null}
      {children}
      {!pending ? <ArrowRightIcon size={17} weight="bold" /> : null}
    </>
  )
}

export function LoginRoute() {
  const navigate = useNavigate()
  const { reset } = useSearch({ from: '/login' })
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<LoginInput>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(loginSchema),
  })

  const submit = handleSubmit(async (input) => {
    setFormError(null)
    const result = await authClient.signIn.email({
      callbackURL: '/inbox',
      email: input.email,
      password: input.password,
    })

    if (result.error) {
      setFormError(
        getAuthErrorMessage(
          result.error,
          'Email or password is incorrect. Try again.',
        ),
      )
      return
    }

    await navigate({ to: '/inbox' })
  })

  const signInWithGoogle = async () => {
    setFormError(null)
    const result = await authClient.signIn.social({
      callbackURL: '/inbox',
      provider: 'google',
    })

    if (result?.error) {
      setFormError(
        getAuthErrorMessage(
          result.error,
          'Google sign-in could not be started. Try again.',
        ),
      )
    }
  }

  return (
    <AuthShell eyebrow="Welcome back" title="Return to your archive.">
      {reset ? (
        <div
          className="border-success-border bg-success-soft text-success-strong rounded-surface mb-5 border p-4 text-sm"
          role="status"
        >
          Password updated. Sign in with your new password.
        </div>
      ) : null}
      <form
        className="grid gap-5"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <AuthFormField
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          name="login-email"
          placeholder="you@example.com"
          registration={register('email')}
          type="email"
        />
        <AuthFormField
          autoComplete="current-password"
          error={errors.password?.message}
          label="Password"
          name="login-password"
          registration={register('password')}
          type="password"
        />

        <div className="flex justify-end">
          <Link
            className="text-accent-strong focus-visible:ring-focus rounded-control text-sm font-semibold underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
            to="/forgot-password"
          >
            Forgot password?
          </Link>
        </div>

        {formError ? <FormMessage>{formError}</FormMessage> : null}

        <Button
          className="w-full"
          disabled={isSubmitting}
          size="large"
          type="submit"
        >
          <SubmitLabel pending={isSubmitting}>Sign in</SubmitLabel>
        </Button>
      </form>

      <div className="text-tertiary my-6 flex items-center gap-3 text-xs">
        <span className="bg-border-subtle h-px flex-1" />
        or continue with
        <span className="bg-border-subtle h-px flex-1" />
      </div>

      <Button
        className="w-full"
        onClick={() => void signInWithGoogle()}
        size="large"
        variant="outline"
      >
        <GoogleLogoIcon size={19} weight="bold" /> Google
      </Button>

      <p className="text-secondary mt-7 text-center text-sm">
        New to Cerebero?{' '}
        <Link
          className="text-accent-strong font-semibold underline-offset-4 hover:underline"
          to="/signup"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  )
}

export function SignupRoute() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<SignupInput>({
    defaultValues: {
      confirmPassword: '',
      email: '',
      name: '',
      password: '',
    },
    resolver: zodResolver(signupSchema),
  })

  const submit = handleSubmit(async (input) => {
    setFormError(null)
    const result = await authClient.signUp.email({
      callbackURL: '/verify-email',
      email: input.email,
      name: input.name,
      password: input.password,
    })

    if (result.error) {
      setFormError(
        getAuthErrorMessage(
          result.error,
          'Account creation could not be completed. Try again.',
        ),
      )
      return
    }

    await navigate({ search: { sent: true }, to: '/verify-email' })
  })

  return (
    <AuthShell
      eyebrow="Begin collecting"
      title="Make a place for what matters."
    >
      <form
        className="grid gap-5"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <AuthFormField
          autoComplete="name"
          error={errors.name?.message}
          label="Name"
          name="signup-name"
          registration={register('name')}
        />
        <AuthFormField
          autoComplete="email"
          error={errors.email?.message}
          label="Email"
          name="signup-email"
          placeholder="you@example.com"
          registration={register('email')}
          type="email"
        />
        <AuthFormField
          autoComplete="new-password"
          error={errors.password?.message}
          label="Password"
          name="signup-password"
          registration={register('password')}
          type="password"
        />
        <AuthFormField
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          label="Confirm password"
          name="signup-confirm-password"
          registration={register('confirmPassword')}
          type="password"
        />

        <p className="text-tertiary text-xs leading-relaxed">
          Use 12–128 characters. Cerebero never stores the original password.
        </p>
        {formError ? <FormMessage>{formError}</FormMessage> : null}
        <Button
          className="w-full"
          disabled={isSubmitting}
          size="large"
          type="submit"
        >
          <SubmitLabel pending={isSubmitting}>Create account</SubmitLabel>
        </Button>
      </form>

      <p className="text-secondary mt-7 text-center text-sm">
        Already have an account?{' '}
        <Link
          className="text-accent-strong font-semibold underline-offset-4 hover:underline"
          to="/login"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

export function ForgotPasswordRoute() {
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ForgotPasswordInput>({
    defaultValues: { email: '' },
    resolver: zodResolver(forgotPasswordSchema),
  })

  const submit = handleSubmit(async (input) => {
    setFormError(null)
    const result = await authClient.requestPasswordReset({
      email: input.email,
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (result.error?.status === 503) {
      setFormError(
        getAuthErrorMessage(result.error, 'Password recovery is unavailable.'),
      )
      return
    }

    setSubmitted(true)
  })

  return (
    <AuthShell eyebrow="Account recovery" title="Find your way back.">
      {submitted ? (
        <div
          className="border-success-border bg-success-soft text-success-strong rounded-surface border p-5"
          role="status"
        >
          <h2 className="font-semibold">Check your email</h2>
          <p className="mt-2 text-sm leading-relaxed">
            If an account exists for that address, a password reset link is on
            its way.
          </p>
        </div>
      ) : (
        <form
          className="grid gap-5"
          noValidate
          onSubmit={(event) => void submit(event)}
        >
          <p className="text-secondary text-sm leading-relaxed">
            Enter your account email. The response is intentionally the same
            whether or not an account exists.
          </p>
          <AuthFormField
            autoComplete="email"
            error={errors.email?.message}
            label="Email"
            name="recovery-email"
            placeholder="you@example.com"
            registration={register('email')}
            type="email"
          />
          {formError ? <FormMessage>{formError}</FormMessage> : null}
          <Button
            className="w-full"
            disabled={isSubmitting}
            size="large"
            type="submit"
          >
            <SubmitLabel pending={isSubmitting}>Send reset link</SubmitLabel>
          </Button>
        </form>
      )}

      <Link
        className="text-accent-strong mt-7 inline-block text-sm font-semibold underline-offset-4 hover:underline"
        to="/login"
      >
        Return to sign in
      </Link>
    </AuthShell>
  )
}

export function ResetPasswordRoute({ token }: { token?: string | undefined }) {
  const navigate = useNavigate()
  const [formError, setFormError] = useState<string | null>(null)
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
  } = useForm<ResetPasswordInput>({
    defaultValues: { confirmPassword: '', password: '' },
    resolver: zodResolver(resetPasswordSchema),
  })

  const submit = handleSubmit(async (input) => {
    if (!token) {
      setFormError('This reset link is missing its token. Request a new link.')
      return
    }

    setFormError(null)
    const result = await authClient.resetPassword({
      newPassword: input.password,
      token,
    })

    if (result.error) {
      setFormError(
        getAuthErrorMessage(
          result.error,
          'This reset link is invalid or expired. Request a new one.',
        ),
      )
      return
    }

    await navigate({ search: { reset: true }, to: '/login' })
  })

  return (
    <AuthShell eyebrow="Choose a new password" title="Secure the way back in.">
      <form
        className="grid gap-5"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <AuthFormField
          autoComplete="new-password"
          error={errors.password?.message}
          label="New password"
          name="reset-password"
          registration={register('password')}
          type="password"
        />
        <AuthFormField
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          label="Confirm new password"
          name="reset-confirm-password"
          registration={register('confirmPassword')}
          type="password"
        />
        {formError ? <FormMessage>{formError}</FormMessage> : null}
        <Button
          className="w-full"
          disabled={isSubmitting}
          size="large"
          type="submit"
        >
          <SubmitLabel pending={isSubmitting}>Update password</SubmitLabel>
        </Button>
      </form>
    </AuthShell>
  )
}

export function VerifyEmailRoute({
  sent,
  verified,
}: {
  sent?: boolean | undefined
  verified?: boolean | undefined
}) {
  return (
    <AuthShell
      eyebrow="Email verification"
      title="Confirm this archive is yours."
    >
      <div className="border-info-border bg-info-soft text-info-strong rounded-surface border p-5">
        <h2 className="font-semibold">
          {verified ? 'Email verified' : 'Check your inbox'}
        </h2>
        <p className="mt-2 text-sm leading-relaxed">
          {verified
            ? 'Your address is confirmed. You can now sign in.'
            : sent
              ? 'We sent a verification link. It must be opened before email sign-in is allowed.'
              : 'Open the verification link sent to your email. If it expired, return to sign up and try again.'}
        </p>
      </div>
      <Button
        className="mt-6 w-full"
        onClick={() => window.location.assign('/login')}
        size="large"
      >
        Continue to sign in <ArrowRightIcon size={17} weight="bold" />
      </Button>
    </AuthShell>
  )
}
