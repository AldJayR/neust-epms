// ── Auth server functions (.functions.ts → safe to import on client) ──
// Per file-separation skill: .functions.ts files wrap server-only logic
// in createServerFn, so the build replaces them with RPC stubs on the client.

import { createServerFn } from '@tanstack/react-start'
import { redirect } from '@tanstack/react-router'
import { z } from 'zod'
import { useAppSession } from './session.server'
import { supabase } from './supabase.server'
import type { AuthUser, ApiErrorResponse } from './auth'

const API_BASE = process.env.API_URL ?? 'http://localhost:3000/api/v1'

// ── Schemas ───────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  departmentId: z.string().min(1),
  campusId: z.string().min(1),
  academicRank: z.string().min(1),
})

// ── Login ─────────────────────────────────────────────────

export const loginFn = createServerFn({ method: 'POST' })
  .inputValidator(loginSchema)
  .handler(async ({ data }) => {
    // 1. Authenticate with Supabase
    const { data: authData, error: authError } =
      await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

    if (authError || !authData.session) {
      return {
        error: true as const,
        message: authError?.message ?? 'Invalid email or password',
      }
    }

    // 2. Verify user exists in our backend (GET /auth/me)
    const meResponse = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authData.session.access_token}`,
      },
    })

    if (!meResponse.ok) {
      const errorBody = (await meResponse.json()) as ApiErrorResponse
      return {
        error: true as const,
        message:
          errorBody.error?.message ??
          'Your account has not been provisioned. Contact an administrator.',
      }
    }

    const user = (await meResponse.json()) as AuthUser

    if (!user.isActive) {
      return {
        error: true as const,
        message: 'Your account has been deactivated. Contact an administrator.',
      }
    }

    // 3. Store tokens in encrypted httpOnly session
    const session = await useAppSession()
    await session.update({
      accessToken: authData.session.access_token,
      refreshToken: authData.session.refresh_token,
      userId: user.userId,
      email: user.email,
      createdAt: Date.now(),
    })

    // 4. Return success; client handles SPA navigation
    return {
      error: false as const,
    }
  })

// ── Signup ────────────────────────────────────────────────

export const signupFn = createServerFn({ method: 'POST' })
  .inputValidator(signupSchema)
  .handler(async ({ data }) => {
    // 1. Create auth user in Supabase
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
    })

    if (authError || !authData.user) {
      return {
        error: true as const,
        message: authError?.message ?? 'Failed to create account',
      }
    }

    // Note: After Supabase signup, the user needs to be provisioned
    // in our backend by a Super Admin or Director (POST /auth/users).
    // Faculty self-registration creates the Supabase auth user,
    // but the backend profile must be provisioned separately.
    //
    // The user will see "account not provisioned" when they try to
    // log in until an admin creates their profile.

    return {
      error: false as const,
      message:
        'Account created! Please wait for an administrator to activate your account before logging in.',
      userId: authData.user.id,
    }
  })

// ── Logout ────────────────────────────────────────────────

export const logoutFn = createServerFn({ method: 'POST' }).handler(
  async () => {
    const session = await useAppSession()
    await session.clear()
    throw redirect({ to: '/login' })
  },
)

// ── Get Current User ──────────────────────────────────────

export const getCurrentUserFn = createServerFn({ method: 'GET' }).handler(
  async () => {
    const session = await useAppSession()
    const { accessToken, userId } = session.data

    if (!accessToken || !userId) {
      return null
    }

    // Validate the token is still valid by calling our backend
    const meResponse = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    })

    if (!meResponse.ok) {
      // Token expired or user deactivated — clear session
      await session.clear()
      return null
    }

    const user = (await meResponse.json()) as AuthUser
    return user
  },
)
