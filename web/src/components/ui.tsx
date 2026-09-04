import { clsx } from 'clsx';
import { X } from 'lucide-react';
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';
import { twMerge } from 'tailwind-merge';

/* ── Button ── */

type BtnVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type BtnSize = 'sm' | 'md' | 'lg' | 'icon';

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant;
  size?: BtnSize;
}

const btnBase =
  'inline-flex items-center justify-center gap-1.5 font-semibold rounded-full transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer whitespace-nowrap';

const btnVariants: Record<BtnVariant, string> = {
  primary: 'bg-[#6d28d9] text-white hover:bg-[#5b21b6]',
  secondary: 'bg-[#101014] text-white hover:bg-[#2a2a33]',
  outline: 'border border-[#e4e6eb] bg-white hover:bg-[#f0f1f4] text-[#101014]',
  ghost: 'text-[#63666f] hover:bg-[#f0f1f4] hover:text-[#101014]',
  danger: 'bg-[#dc2626] text-white hover:bg-[#b91c1c]',
};

const btnSizes: Record<BtnSize, string> = {
  sm: 'h-8 px-3.5 text-[12.5px]',
  md: 'h-9.5 px-5 text-[13.5px]',
  lg: 'h-11 px-7 text-[15px]',
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

/* ── Input / Label ── */

export function Label({
  children,
  htmlFor,
}: { children: ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-[12.5px] font-semibold text-[#101014] mb-1.5"
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
        'w-full h-10 rounded-xl border border-[#e4e6eb] bg-white px-3.5 text-[13.5px] placeholder:text-[#9a9da8] focus:border-[#6d28d9] focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/20 disabled:opacity-50',
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
  return (
    <div
      className={twMerge(
        'rounded-2xl border border-[#e4e6eb] bg-white',
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  children,
  className,
}: { children: ReactNode; className?: string }) {
  return <div className={twMerge('px-5 pt-5 pb-3', className)}>{children}</div>;
}

export function CardTitle({ children }: { children: ReactNode }) {
  return <h3 className="text-[15px] font-bold tracking-tight">{children}</h3>;
}

export function CardDesc({ children }: { children: ReactNode }) {
  return (
    <p className="text-[12.5px] text-[#63666f] mt-1 leading-relaxed">
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

/* ── Badge / Pill ── */

type Tone = 'green' | 'red' | 'amber' | 'violet' | 'gray';

const tones: Record<Tone, string> = {
  green: 'bg-emerald-500/10 text-emerald-700',
  red: 'bg-red-500/10 text-red-700',
  amber: 'bg-amber-500/15 text-amber-800',
  violet: 'bg-violet-600/10 text-violet-700',
  gray: 'bg-[#f0f1f4] text-[#63666f]',
};

export function Badge({
  tone = 'gray',
  children,
  className,
}: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={twMerge(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold',
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

/* ── Page header ── */

export function PageHeader({
  title,
  desc,
  actions,
}: {
  title: string;
  desc?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight">{title}</h1>
        {desc && <p className="text-[13px] text-[#63666f] mt-1">{desc}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Alert ── */

export function Alert({
  tone = 'red',
  children,
}: { tone?: Tone; children: ReactNode }) {
  const border: Record<Tone, string> = {
    green: 'border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-800',
    red: 'border-red-500/30 bg-red-500/[0.06] text-red-700',
    amber: 'border-amber-500/30 bg-amber-500/[0.08] text-amber-900',
    violet: 'border-violet-600/30 bg-violet-600/[0.06] text-violet-800',
    gray: 'border-[#e4e6eb] bg-[#f0f1f4] text-[#3c3f47]',
  };
  return (
    <div
      className={twMerge(
        'rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed',
        border[tone]
      )}
    >
      {children}
    </div>
  );
}

/* ── Empty state ── */

export function Empty({
  title,
  desc,
  action,
}: { title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#d4d7de] px-6 py-10 text-center">
      <div className="text-[13.5px] font-bold">{title}</div>
      {desc && (
        <div className="text-[12.5px] text-[#63666f] mt-1 max-w-md mx-auto leading-relaxed">
          {desc}
        </div>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

/* ── Skeleton ── */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={twMerge('animate-pulse rounded-xl bg-[#eceef2]', className)}
    />
  );
}

/* ── Dialog (modal) ── */

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
        className="absolute inset-0 bg-black/45 cursor-default"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#63666f] hover:bg-[#f0f1f4]"
          aria-label="Close"
        >
          <X className="size-4" />
        </button>
        <h3 className="text-[16px] font-bold tracking-tight pr-8">{title}</h3>
        {desc && (
          <p className="text-[12.5px] text-[#63666f] mt-1 leading-relaxed">
            {desc}
          </p>
        )}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

/* ── Table shell ── */

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
        'py-2.5 pr-4 text-[11px] font-bold uppercase tracking-wider text-[#63666f] whitespace-nowrap',
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
