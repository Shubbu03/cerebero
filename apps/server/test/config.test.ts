import { describe, expect, it } from 'vitest'

import { parseEnvironment } from '../src/config.js'

describe('parseEnvironment', () => {
  it('validates and normalizes server-only configuration', () => {
    expect(
      parseEnvironment({
        APP_ORIGIN: 'http://localhost:5173',
        DATABASE_URL: 'postgres://localhost/cerebero',
        NODE_ENV: 'test',
        PORT: '4100',
      }),
    ).toMatchObject({
      APP_ORIGIN: 'http://localhost:5173',
      API_ORIGIN: 'http://localhost:3000',
      LOG_LEVEL: 'info',
      NODE_ENV: 'test',
      PORT: 4100,
    })
  })

  it('fails fast when required server configuration is missing', () => {
    expect(() => parseEnvironment({ NODE_ENV: 'production' })).toThrow()
  })

  it('allows the HTTP foundation to start before PostgreSQL is configured', () => {
    expect(
      parseEnvironment({
        APP_ORIGIN: 'http://localhost:5173',
        DATABASE_URL: '',
        NODE_ENV: 'development',
      }).DATABASE_URL,
    ).toBeUndefined()
  })

  it('rejects partial Google OAuth configuration', () => {
    expect(() =>
      parseEnvironment({
        APP_ORIGIN: 'http://localhost:5173',
        GOOGLE_CLIENT_ID: 'client-id',
      }),
    ).toThrow('Google OAuth credentials must be configured together.')
  })
})
