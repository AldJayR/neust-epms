import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { z } from 'zod'
import { toast } from 'sonner'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion } from 'motion/react'
import { FieldGroup } from '../components/ui/field'
import { Alert } from '../components/ui/alert'
import { signupFn } from '../lib/auth.functions'
import {
  RHFCheckboxField,
  RHFPasswordField,
  RHFSubmitButton,
  RHFTextField,
} from '../components/rhf-auth-fields'

const registerStep2Schema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    acceptTerms: z.boolean(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((data) => data.acceptTerms === true, {
    message: 'You must accept the terms and conditions',
    path: ['acceptTerms'],
  })

export const Route = createFileRoute('/register/account')({
  component: RegisterStepTwo,
})

function RegisterStepTwo() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)
  const [isRegistered, setIsRegistered] = useState(false)

  const form = useForm<z.infer<typeof registerStep2Schema>>({
    resolver: zodResolver(registerStep2Schema),
    mode: 'onBlur',
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
  })

  async function onSubmit(data: z.infer<typeof registerStep2Schema>) {
    setServerError(null)

    // Read step 1 data from sessionStorage
    const step1Raw = sessionStorage.getItem('register_step1')

    if (!step1Raw) {
      setServerError('Missing profile information. Please complete step 1 first.')
      toast.error('Missing profile information', {
        description: 'Please go back to step 1.',
      })
      return
    }

    const step1 = JSON.parse(step1Raw) as {
      firstName: string
      lastName: string
      departmentId: string
      campusId: string
      academicRank: string
    }

    // Call the signup server function
    const result = await signupFn({
      data: {
        email: data.email,
        password: data.password,
        firstName: step1.firstName,
        lastName: step1.lastName,
        departmentId: step1.departmentId,
        campusId: step1.campusId,
        academicRank: step1.academicRank,
      },
    })

    if (result.error) {
      setServerError(result.message)
      toast.error('Registration failed', { description: result.message })
      return
    }

    // Success — clean up sessionStorage
    sessionStorage.removeItem('register_step1')
    setIsRegistered(true)
    toast.success('Account created!', { description: result.message })
  }

  // Show success state after registration
  if (isRegistered) {
    return (
      <section className="w-full rounded-xl px-6 py-6 text-center">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-green-100">
          <svg
            className="size-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="2"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 12.75l6 6 9-13.5"
            />
          </svg>
        </div>
        <h1 className="text-lg font-semibold text-card-foreground">
          Account Created
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account has been created successfully. Please wait for an
          administrator to activate your account before logging in.
        </p>
        <Link
          to="/login"
          className="mt-6 inline-block rounded-[10px] bg-[#14369c] px-6 py-2 text-sm font-medium text-white hover:bg-[#11308a]"
        >
          Go to Login
        </Link>
      </section>
    )
  }

  return (
    <section className="w-full rounded-xl px-6 py-6">
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="min-w-0 flex-1">
            <h1 className="text-base leading-6 font-semibold text-black">
              Create your account
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <motion.span
              layoutId="reg-step-1"
              className="size-2 cursor-pointer rounded-[12px] bg-[#d9d9d9] transition-colors hover:bg-zinc-400"
              onClick={() => navigate({ to: '/register' })}
            />
            <motion.span
              layoutId="reg-step-2"
              className="h-2 w-6 rounded-[12px] bg-[#14369c]"
            />
          </div>
        </div>
        <p className="text-sm leading-5 text-zinc-600">
          Set up your login credentials
        </p>
      </header>

      {serverError && (
        <Alert variant="destructive" className="mt-4">
          {serverError}
        </Alert>
      )}

      <form 
        className="mt-6" 
        method="POST"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit(onSubmit)(e)
        }}
      >
        <FieldGroup>
          <RHFTextField
            control={form.control}
            name="email"
            label="Email"
            type="email"
            placeholder="m@example.com"
          />

          <RHFPasswordField
            control={form.control}
            name="password"
            label="Password"
            description="At least 8 characters with one uppercase letter and one number"
          />

          <RHFPasswordField
            control={form.control}
            name="confirmPassword"
            label="Confirm Password"
          />

          <RHFCheckboxField
            control={form.control}
            name="acceptTerms"
            label="I accept the terms and conditions"
          />
        </FieldGroup>

        <div className="mt-7">
          <RHFSubmitButton
            label="Register"
            isSubmitting={form.formState.isSubmitting}
            className="h-9 w-full rounded-[10px] bg-[#14369c] text-sm font-medium text-[#fafafa] hover:bg-[#11308a]"
          />
        </div>
      </form>

      <p className="pt-4 text-center text-sm leading-5 text-zinc-600">
        Already have an account?{' '}
        <Link
          to="/login"
          className="text-black hover:text-black underline underline-offset-2"
        >
          Log in
        </Link>
      </p>
    </section>
  )
}