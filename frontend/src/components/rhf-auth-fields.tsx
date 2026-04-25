import { useState } from 'react'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { type Control, type FieldPath, type FieldValues, useController } from 'react-hook-form'
import { Button } from '#/components/ui/button'
import { Checkbox } from '#/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '#/components/ui/field'
import { Input } from '#/components/ui/input'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '#/components/ui/input-group'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Spinner } from '#/components/ui/spinner'
import { cn } from '#/lib/utils'

type Option = { label: string; value: string }

const inputClassName =
  'bg-white text-black placeholder:text-zinc-500 border-zinc-300 shadow-sm ring-1 ring-black/5 focus-visible:border-[#14369c] focus-visible:ring-[#14369c]/20'

const selectContentClassName =
  'bg-white text-black border-zinc-200 shadow-xl ring-1 ring-black/10 before:!bg-white'

const selectItemClassName =
  'text-black data-[highlighted]:!bg-zinc-100 data-[highlighted]:!text-black'

export function RHFTextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  type = 'text',
  className,
}: {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  description?: string
  type?: string
  className?: string
}) {
  const { field, fieldState } = useController({ control, name })

  return (
    <Field data-invalid={fieldState.invalid || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Input
        id={field.name}
        name={field.name}
        type={type}
        placeholder={placeholder}
        value={(field.value as string | undefined) ?? ''}
        onChange={(e) => field.onChange(e.target.value)}
        onBlur={field.onBlur}
        aria-invalid={fieldState.invalid || undefined}
        className={cn(inputClassName, className)}
      />
      {description && !fieldState.error && <FieldDescription>{description}</FieldDescription>}
      {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
    </Field>
  )
}

export function RHFPasswordField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
}: {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  description?: string
}) {
  const { field, fieldState } = useController({ control, name })
  const [showPassword, setShowPassword] = useState(false)

  return (
    <Field data-invalid={fieldState.invalid || undefined}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <InputGroup className={inputClassName}>
        <InputGroupInput
          id={field.name}
          name={field.name}
          type={showPassword ? 'text' : 'password'}
          value={(field.value as string | undefined) ?? ''}
          onChange={(e) => field.onChange(e.target.value)}
          onBlur={field.onBlur}
          aria-invalid={fieldState.invalid || undefined}
          className="text-black placeholder:text-zinc-500"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupButton
            size="icon-xs"
            variant="ghost"
            type="button"
            aria-label="Toggle password visibility"
            className="text-zinc-500 hover:!bg-black/5 hover:!text-zinc-700 dark:hover:!bg-black/5 dark:hover:!text-zinc-700 rounded-full transition-colors"
            onClick={() => setShowPassword((prev) => !prev)}
          >
            {showPassword ? <EyeOffIcon className="text-current" /> : <EyeIcon className="text-current" />}
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      {description && !fieldState.error && <FieldDescription>{description}</FieldDescription>}
      {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
    </Field>
  )
}

export function RHFSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
}: {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
  placeholder?: string
  options: Option[]
}) {
  const { field, fieldState } = useController({ control, name })
  const optionLabels = Object.fromEntries(options.map((option) => [option.value, option.label])) as Record<string, string>

  return (
    <Field data-invalid={fieldState.invalid || undefined}>
      <FieldLabel>{label}</FieldLabel>
      <Select
        value={typeof field.value === 'string' ? field.value : ''}
        onValueChange={(value) => field.onChange(value ?? '')}
      >
        <SelectTrigger
          aria-invalid={fieldState.invalid || undefined}
          onBlur={field.onBlur}
          className={cn('w-full', inputClassName)}
        >
          <SelectValue placeholder={placeholder}>
            {(value) => (value ? optionLabels[value] ?? value : placeholder ?? '')}
          </SelectValue>
        </SelectTrigger>
        <SelectContent side="bottom" sideOffset={8} align="start" alignItemWithTrigger={false} className={selectContentClassName}>
          <SelectGroup>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value} className={selectItemClassName}>
                {option.label}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
      {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
    </Field>
  )
}

export function RHFCheckboxField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
}: {
  control: Control<TFieldValues>
  name: FieldPath<TFieldValues>
  label: string
}) {
  const { field, fieldState } = useController({ control, name })

  return (
    <Field orientation="horizontal" data-invalid={fieldState.invalid || undefined}>
      <Checkbox
        id={field.name}
        checked={field.value === true}
        aria-invalid={fieldState.invalid || undefined}
        onCheckedChange={(checked) => field.onChange(checked === true)}
        onBlur={field.onBlur}
        className="bg-white shadow-sm ring-1 ring-black/5 data-checked:ring-transparent"
      />
      <FieldLabel htmlFor={field.name} className="font-normal">
        {label}
      </FieldLabel>
      {fieldState.error?.message && <FieldError>{fieldState.error.message}</FieldError>}
    </Field>
  )
}

export function RHFSubmitButton({
  label,
  className,
  isSubmitting,
}: {
  label: string
  className?: string
  isSubmitting: boolean
}) {
  return (
    <Button type="submit" disabled={isSubmitting} className={className}>
      {isSubmitting && <Spinner data-icon="inline-start" />}
      {isSubmitting ? 'Please wait…' : label}
    </Button>
  )
}
