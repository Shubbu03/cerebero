import { z } from 'zod'

const email = z
  .string()
  .trim()
  .min(1, 'Enter your email address.')
  .email('Enter a valid email address.')
  .max(320, 'Email address is too long.')

const password = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .max(128, 'Use no more than 128 characters.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.').max(128),
})

export const signupSchema = z
  .object({
    confirmPassword: z.string(),
    email,
    name: z
      .string()
      .trim()
      .min(1, 'Enter your name.')
      .max(100, 'Name is too long.'),
    password,
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export const forgotPasswordSchema = z.object({ email })

export const resetPasswordSchema = z
  .object({
    confirmPassword: z.string(),
    password,
  })
  .refine((input) => input.password === input.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export type LoginInput = z.infer<typeof loginSchema>
export type SignupInput = z.infer<typeof signupSchema>
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>
