import { clsx } from 'clsx';
import { X } from 'lucide-react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';
import { twMerge } from 'tailwind-merge';

/* ── shadcn-style button ── */

type BtnVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg' | 'icon';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
}

const btnBase =
  'inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black';

const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-[#09090b] text-white hover:bg-[#27272a]',
  secondary: 'bg-[#09090b] text-white hover:bg-[#27272a]',
  outline:
    'border border-black/[0.12] bg-white hover:bg-[#f4f4f5] text-[#09090b]',
  ghost: 'text-[#71717a] hover:bg-black/[0.05] hover:text-[#09090b]',
  danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c]',
};

const btnSizes: Record<BtnSize, string> = {
  sm: 'h-8 px-3.5 text-[12.5px]',
  md: 'h-9 px-4 text-[13.5px]',
  lg: 'h-11 px-6 text-[14.5px]',
  icon: 'size-8',
};

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...rest
}: BtnProps) {
  return (
    <button
      type={type}
      className={twMerge(
        btnBase,
        btnVariants[variant],
        btnSizes[size],
        className
      )}
      {...rest}
    />
  );
}

/* ── Label / Input ── */

export function Label({
  children,
  htmlFor,
}: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[12.5px] font-medium text-[#09090b] mb-1.5"
    >
      {children}
    </label>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export function Input({ className, ...rest }: InputProps) {
  return (
    <input
      className={twMerge(
        'w-full h-10 rounded-lg border border-black/[0.12] bg-white px-3 text-[13.5px] placeholder:text-[#a1a1aa] focus:border-black focus:outline-none focus:ring-2 focus:ring-black/10 disabled:opacity-50 transition-shadow',
        className
      )}
      {...rest}
    />
  );
}

/* ── Card ── */

export function Card({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return <div className={twMerge('card', className)}>{children}</div>;
}

export function CardHeader({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return <div className={twMerge('px-5 pt-5 pb-3', className)}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-[14.5px] font-semibold tracking-tight">{children}</h3>
  );
}

export function CardDesc({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12.5px] text-[#71717a] mt-1 leading-relaxed">
      {children}
    </p>
  );
}

export function CardBody({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return <div className={twMerge('px-5 pb-5', className)}>{children}</div>;
}

/* ── Badge ── */

type Tone = 'green' | 'red' | 'amber' | 'mono' | 'gray';

const tones: Record<Tone, string> = {
  green: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  red: 'bg-red-500/10 text-red-700 border-red-500/20',
  amber: 'bg-amber-500/15 text-amber-800 border-amber-500/25',
  mono: 'bg-[#09090b] text-white border-transparent',
  gray: 'bg-black/[0.05] text-[#71717a] border-black/[0.06]',
};

export function Badge({
  tone = 'gray',
  children,
  className,
}: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ── Page header (light admin) ── */

export function PageHeader({
  title,
  desc,
  actions,
}: { title: string; desc?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div className="min-w-0">
        <h1 className="font-display text-[22px] font-bold">{title}</h1>
        {desc && <p className="text-[13px] text-[#71717a] mt-1">{desc}</p>}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
}

/* ── Alert ── */

export function Alert({
  tone = 'red',
  children,
}: { tone?: Tone; children: ReactNode }) {
  const border: Record<Tone, string> = {
    green: 'border-emerald-500/25 bg-emerald-500/[0.06] text-emerald-800',
    red: 'border-red-500/25 bg-red-500/[0.06] text-red-700',
    amber: 'border-amber-500/30 bg-amber-500/[0.08] text-amber-900',
    mono: 'border-black/15 bg-black/[0.03] text-[#09090b]',
    gray: 'border-black/[0.08] bg-black/[0.03] text-[#3f3f46]',
  };
  return (
    <div
      className={twMerge(
        'rounded-lg border px-3.5 py-2.5 text-[12.5px] leading-relaxed',
        border[tone]
      )}
    >
      {children}
    </div>
  );
}

/* ── Empty / Skeleton ── */

export function Empty({
  title,
  desc,
  action,
}: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-black/[0.14] bg-white px-6 py-10 text-center">
      <div className="text-[13.5px] font-semibold">{title}</div>
      {desc && (
        <div className="text-[12.5px] text-[#71717a] mt-1 max-w-md mx-auto leading-relaxed">
          {desc}
        </div>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={twMerge('animate-pulse rounded-lg bg-black/[0.06]', className)}
    />
  );
}

/* ── Dialog ── */

export function Dialog({
  open,
  onClose,
  title,
  desc,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  desc?: string;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/50 cursor-default"
      />
      <div className="relative w-full max-w-md rounded-xl bg-white p-6 shadow-2xl border border-black/[0.08]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1.5 text-[#71717a] hover:bg-black/[0.05] hover:text-black"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <h3 className="text-[15px] font-semibold tracking-tight pr-8">
          {title}
        </h3>
        {desc && (
          <p className="text-[12.5px] text-[#71717a] mt-1 leading-relaxed">
            {desc}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Table ── */

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto -mx-5 px-5">{children}</div>;
}

export function Th({
  children,
  right,
}: { children: ReactNode; right?: boolean }) {
  return (
    <th
      className={clsx(
        'py-2.5 pr-4 text-[11px] font-semibold uppercase tracking-wider text-[#71717a] whitespace-nowrap',
        right && 'text-right pl-4 pr-0'
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  mono,
}: { children: ReactNode; right?: boolean; mono?: boolean }) {
  return (
    <td
      className={clsx(
        'py-3 pr-4 text-[13px] align-middle',
        right && 'text-right pl-4 pr-0',
        mono && 'font-mono text-[12px]'
      )}
    >
      {children}
    </td>
  );
}

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}
