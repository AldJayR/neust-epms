import {
  createFileRoute,
  useNavigate,
  Link,
  Outlet,
  useRouterState,
  redirect,
} from '@tanstack/react-router'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { motion, AnimatePresence } from 'motion/react'
import { FieldGroup } from '../components/ui/field'
import { RHFSelectField, RHFSubmitButton, RHFTextField } from '../components/rhf-auth-fields'

const registerStep1Schema = z.object({
  employeeId: z.string().min(1, 'Employee ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  departmentId: z.string().min(1, 'Please select a department'),
  campusId: z.string().min(1, 'Please select a campus'),
  academicRank: z.string().min(1, 'Please select your academic rank'),
})

const departmentOptions = [
  { label: 'Management Information System (MIS)', value: '1' },
  { label: 'College of Engineering', value: '2' },
  { label: 'College of Education', value: '3' },
]

const campusOptions = [
  { label: 'Cabanatuan City (Main)', value: '1' },
  { label: 'Sumacab Campus', value: '2' },
  { label: 'Gabaldon Campus', value: '3' },
]

const rankOptions = [
  { label: 'Instructor I', value: 'instructor-1' },
  { label: 'Instructor II', value: 'instructor-2' },
  { label: 'Instructor III', value: 'instructor-3' },
  { label: 'Assistant Professor I', value: 'assistant-prof-1' },
  { label: 'Assistant Professor II', value: 'assistant-prof-2' },
  { label: 'Associate Professor I', value: 'associate-prof-1' },
  { label: 'Associate Professor II', value: 'associate-prof-2' },
  { label: 'Professor I', value: 'professor-1' },
]

export const Route = createFileRoute('/register')({
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated) {
      throw redirect({ to: '/dashboard' })
    }
  },
  component: RegisterRoute,
})

function RegisterRoute() {
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })

  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#fafafa] px-4 py-8">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="w-full max-w-[480px]"
        >
          {pathname !== '/register' ? <Outlet /> : <RegisterStepOneForm />}
        </motion.div>
      </AnimatePresence>
    </main>
  )
}

function RegisterStepOneForm() {
  const navigate = useNavigate()

  const form = useForm<z.infer<typeof registerStep1Schema>>({
    resolver: zodResolver(registerStep1Schema),
    mode: 'onBlur',
    defaultValues: (() => {
      const saved = sessionStorage.getItem('register_step1')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch (e) {
          console.error('Failed to parse saved registration data', e)
        }
      }
      return {
        employeeId: '',
        firstName: '',
        lastName: '',
        departmentId: '',
        campusId: '',
        academicRank: '',
      }
    })(),
  })

  function onSubmit(data: z.infer<typeof registerStep1Schema>) {
    // Store step 1 data for step 2 to read on final submit
    sessionStorage.setItem('register_step1', JSON.stringify(data))
    navigate({ to: '/register/account' })
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
              className="h-2 w-6 rounded-[12px] bg-[#14369c]"
            />
            <motion.span
              layoutId="reg-step-2"
              className="size-2 rounded-[12px] bg-[#d9d9d9]"
            />
          </div>
        </div>
        <p className="text-sm leading-5 text-zinc-600">
          Fill in your faculty profile details
        </p>
      </header>

      <form 
        className="mt-6" 
        method="POST"
        onSubmit={(e) => {
          e.preventDefault()
          form.handleSubmit(onSubmit)(e)
        }}
      >
        <FieldGroup>
          <RHFTextField control={form.control} name="employeeId" label="Employee ID" placeholder="e.g. 2024-001" />
          
          <div className="grid gap-7 sm:grid-cols-2">
            <RHFTextField control={form.control} name="firstName" label="First Name" />
            <RHFTextField control={form.control} name="lastName" label="Last Name" />
          </div>

          <div className="grid gap-7 sm:grid-cols-2">
            <RHFSelectField
              control={form.control}
              name="departmentId"
              label="Department"
              placeholder="Select department"
              options={departmentOptions}
            />
            <RHFSelectField
              control={form.control}
              name="campusId"
              label="Campus"
              placeholder="Select campus"
              options={campusOptions}
            />
          </div>

          <RHFSelectField
            control={form.control}
            name="academicRank"
            label="Academic Rank"
            placeholder="Select rank"
            options={rankOptions}
          />
        </FieldGroup>

        <div className="mt-7">
          <RHFSubmitButton
            label="Next"
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