"use client";

import { useEffect, useId, useRef } from "react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import type { LucideIcon } from "lucide-react";
import { Loader2, X } from "lucide-react";

export function cx(...c: (string | false | null | undefined)[]) {
  return c.filter(Boolean).join(" ");
}

/* ---------- Botones ---------- */

type Variant = "primary" | "ghost" | "outline" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-black text-white hover:bg-black/85 disabled:bg-black/40",
  ghost: "text-black/70 hover:bg-black/5 disabled:text-black/30",
  outline: "border border-black/20 bg-white text-black hover:bg-black/5 disabled:text-black/30",
  danger: "text-rose-700 hover:bg-rose-50 disabled:text-black/30",
};

export function Button({
  variant = "primary",
  size = "md",
  icon: Icon,
  className,
  children,
  ...props
}: {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cx(
        "inline-flex items-center justify-center gap-2 rounded-[10px] font-medium tracking-[0.3px] transition-colors disabled:cursor-not-allowed",
        size === "sm" && "h-8 px-3 text-[13px]",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-4 text-[15px]",
        VARIANT[variant],
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-4 shrink-0" aria-hidden /> : null}
      {children}
    </button>
  );
}

/* ---------- Campos de formulario ---------- */

const inputBase =
  "w-full rounded-[10px] border border-black/20 bg-white px-4 text-[15px] text-black outline-none transition-colors focus:border-black aria-[invalid=true]:border-rose-600";

interface FieldProps {
  label: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  className?: string;
  children: (id: string, describedBy?: string) => ReactNode;
}

export function Field({ label, icon: Icon, error, hint, className, children }: FieldProps) {
  const id = useId();
  const msgId = `${id}-msg`;
  return (
    <div className={cx("flex flex-col gap-2", className)}>
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium tracking-[0.2px] text-black/90">
        {Icon ? <Icon className="size-4 text-black/80" aria-hidden /> : null}
        {label}
      </label>
      {children(id, error || hint ? msgId : undefined)}
      {error ? (
        <p id={msgId} role="alert" className="text-[13px] text-rose-700">
          {error}
        </p>
      ) : hint ? (
        <p id={msgId} className="text-[13px] text-black/50">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type Extra = { label: string; icon?: LucideIcon; error?: string; hint?: string; fieldClassName?: string };

export function TextField({ label, icon, error, hint, fieldClassName, className, ...props }: Extra & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <Field label={label} icon={icon} error={error} hint={hint} className={fieldClassName}>
      {(id, describedBy) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className={cx(inputBase, "h-[50px]", className)}
          {...props}
        />
      )}
    </Field>
  );
}

export function SelectField({ label, icon, error, hint, fieldClassName, className, children, ...props }: Extra & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <Field label={label} icon={icon} error={error} hint={hint} className={fieldClassName}>
      {(id, describedBy) => (
        <select
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className={cx(inputBase, "h-[50px] appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%2216%22 height=%2216%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%23717182%22 stroke-width=%222%22 stroke-linecap=%22round%22 stroke-linejoin=%22round%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[right_14px_center] bg-no-repeat pr-10", className)}
          {...props}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export function TextAreaField({ label, icon, error, hint, fieldClassName, className, ...props }: Extra & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} icon={icon} error={error} hint={hint} className={fieldClassName}>
      {(id, describedBy) => (
        <textarea
          id={id}
          rows={3}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className={cx(inputBase, "py-3", className)}
          {...props}
        />
      )}
    </Field>
  );
}

/* ---------- Superficies ---------- */

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div className={cx("relative rounded-[10px] border border-black/10 bg-white shadow-[0_1px_1.5px_rgba(0,0,0,0.1),0_1px_1px_rgba(0,0,0,0.06)]", className)}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon: Icon }: { label: string; value: ReactNode; icon?: LucideIcon }) {
  return (
    <Card className="flex flex-col gap-2 px-6 pt-6 pb-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] text-black/60">{label}</span>
        {Icon ? <Icon className="size-[18px] text-black/60" aria-hidden /> : null}
      </div>
      <span className="font-display text-[28px] leading-[42px] font-semibold">{value}</span>
    </Card>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={v}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="h-2 w-full overflow-hidden rounded-full bg-black/10"
    >
      <div className="h-full bg-black transition-[width]" style={{ width: `${v}%` }} />
    </div>
  );
}

export function Badge({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span className={cx("inline-flex h-[21px] items-center rounded-lg px-[9px] text-[11px] font-medium whitespace-nowrap", className ?? "bg-black/5 text-black/70")}>
      {children}
    </span>
  );
}

/** Píldora de estado sólida usada en las tablas de pagos e invitados. */
export const TONO = {
  sage: "bg-sage text-white",
  honey: "bg-honey text-white",
  rose: "bg-rose text-white",
  muted: "bg-black/10 text-black/60",
} as const;

export function StatusPill({ tone, children }: { tone: keyof typeof TONO; children: ReactNode }) {
  return <span className={cx("inline-flex h-[22px] items-center rounded px-2.5 text-[11px] font-medium", TONO[tone])}>{children}</span>;
}

export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-[32px] leading-[48px] font-semibold tracking-[-0.32px]">{title}</h1>
        {sub ? <p className="text-[15px] text-black/60">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}

export function Notice({ tone = "info", children }: { tone?: "info" | "warning" | "danger" | "success"; children: ReactNode }) {
  const t = {
    info: "border-black/10 bg-white text-black/80",
    warning: "border-honey/40 bg-honey/10 text-[#7a5a35]",
    danger: "border-rose/50 bg-rose/10 text-rose-800",
    success: "border-sage/50 bg-sage/10 text-[#3e5546]",
  }[tone];
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cx("rounded-[10px] border px-4 py-3 text-sm", t)}>
      {children}
    </div>
  );
}

export function Loading({ label = "Cargando…" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 py-10 text-sm text-black/50" role="status">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {label}
    </p>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[10px] border border-dashed border-line bg-white px-6 py-12 text-center">
      <p className="font-display text-xl font-semibold">{title}</p>
      {children}
    </div>
  );
}

/* ---------- Modal (dialog nativo: foco atrapado y Esc gratis) ---------- */

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  width = "max-w-[512px]",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  width?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  // Si la ruta se oculta (Activity) con el modal abierto, se cierra.
  useEffect(() => () => ref.current?.close(), []);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
      className={cx(
        "m-auto w-[calc(100%-32px)] rounded-[10px] border border-black/10 bg-white p-0 font-inter text-black shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.1)]",
        width,
      )}
    >
      {open ? (
        <div className="relative p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100"
            aria-label="Cerrar"
          >
            <X className="size-4" aria-hidden />
          </button>
          <div className="mb-8 flex flex-col gap-4 pr-6">
            <h2 id={titleId} className="font-display text-[28px] leading-7 font-semibold tracking-[-0.28px]">
              {title}
            </h2>
            {description ? <p className="text-[15px] tracking-[0.2px] text-black/60">{description}</p> : null}
          </div>
          {children}
        </div>
      ) : null}
    </dialog>
  );
}

export function ModalActions({ onCancel, submitLabel, busy, disabled }: { onCancel: () => void; submitLabel: string; busy?: boolean; disabled?: boolean }) {
  return (
    <div className="flex gap-3 pt-4">
      <Button type="button" variant="ghost" size="lg" className="flex-1" onClick={onCancel}>
        Cancelar
      </Button>
      <Button type="submit" size="lg" className="flex-1" disabled={busy || disabled}>
        {busy ? "Guardando…" : submitLabel}
      </Button>
    </div>
  );
}
