import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { useId } from 'react'

interface FieldProps {
  label: string
  error?: string
  hint?: string
  children: (id: string, describedBy?: string) => ReactNode
}

export function Field({ label, error, hint, children }: FieldProps) {
  const id = useId()
  const msgId = `${id}-msg`
  return (
    <div className={`field${error ? ' field--error' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p className="field__error" id={msgId} role="alert">
          {error}
        </p>
      ) : hint ? (
        <p className="field__hint" id={msgId}>
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function TextField({
  label,
  error,
  hint,
  ...props
}: { label: string; error?: string; hint?: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} error={error} hint={hint}>
      {(id, describedBy) => (
        <input id={id} aria-describedby={describedBy} aria-invalid={!!error} {...props} />
      )}
    </Field>
  )
}

export function SelectField({
  label,
  error,
  children,
  ...props
}: { label: string; error?: string } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} error={error}>
      {(id, describedBy) => (
        <select id={id} aria-describedby={describedBy} aria-invalid={!!error} {...props}>
          {children}
        </select>
      )}
    </Field>
  )
}

export function TextAreaField({
  label,
  error,
  ...props
}: { label: string; error?: string } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} error={error}>
      {(id, describedBy) => (
        <textarea id={id} aria-describedby={describedBy} aria-invalid={!!error} rows={3} {...props} />
      )}
    </Field>
  )
}

export function Notice({
  tone = 'info',
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success'
  children: ReactNode
}) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      {children}
    </div>
  )
}

export function Badge({ tone, children }: { tone: string; children: ReactNode }) {
  return <span className={`badge badge--${tone}`}>{children}</span>
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {sub ? <p className="page-header__sub">{sub}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  )
}

export function Loading() {
  return <p className="muted loading">Cargando…</p>
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <p className="empty__title">{title}</p>
      {children}
    </div>
  )
}
