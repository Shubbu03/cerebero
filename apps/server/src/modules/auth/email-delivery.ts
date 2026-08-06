export type VerificationEmail = {
  recipient: string
  url: string
}

export type PasswordResetEmail = {
  recipient: string
  url: string
}

export interface AuthEmailDelivery {
  sendPasswordResetEmail(message: PasswordResetEmail): Promise<void>
  sendVerificationEmail(message: VerificationEmail): Promise<void>
}
