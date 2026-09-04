import { Blocks, BookOpen, FolderKanban, LogOut } from 'lucide-react';
import type { ComponentType } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AUTH_URL } from '../lib/api';
import { useAuth } from '../store/auth';

function SideLink({
  to,
  end,
  icon: Icon,
  label,
}: {
  to: string;
  end?: boolean;
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className="nav-item"
      style={({ isActive }) =>
        isActive
          ? {
              background: 'rgba(9,9,11,0.06)',
              color: '#09090b',
              fontWeight: 600,
            }
          : undefined
      }
    >
      <Icon className="size-4" /> {label}
    </NavLink>
  );
}

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const out = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#fafafa] lg:flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[248px] shrink-0 flex-col bg-white border-r border-black/[0.08] min-h-screen sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-5 pt-5 pb-4">
          <div className="size-8 rounded-lg bg-black flex items-center justify-center font-extrabold text-[13px] text-white">
            S
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold leading-none">
              SlyxUp Admin
            </div>
            <div className="font-mono text-[10px] text-[#a1a1aa] mt-1 truncate max-w-[150px]">
              {AUTH_URL.replace('https://', '')}
            </div>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-700 shrink-0">
            <span className="size-1.5 rounded-full bg-emerald-500 pulse-dot" />{' '}
            LIVE
          </span>
        </div>
        <nav className="px-3 space-y-0.5">
          <div className="px-3 pb-1.5 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">
            Manage
          </div>
          <SideLink to="/admin" end icon={FolderKanban} label="Projects" />
          <div className="px-3 pb-1.5 pt-3 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#a1a1aa]">
            Resources
          </div>
          <SideLink to="/docs" icon={BookOpen} label="Docs" />
          <SideLink to="/ui" icon={Blocks} label="UI Kit" />
        </nav>
        <div className="mt-auto p-3.5">
          <div className="rounded-xl border border-black/[0.08] bg-[#fafafa] p-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-black text-[12px] font-bold text-white">
                {(user?.name || user?.email || '?')[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-[12px] font-semibold truncate">
                  {user?.name || user?.email}
                </div>
                <div className="font-mono text-[10.5px] text-[#a1a1aa] truncate">
                  {user?.email}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={out}
              className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] bg-white py-2 text-[12px] font-medium text-[#71717a] hover:text-black hover:bg-black/[0.03] cursor-pointer"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-30 border-b border-black/[0.08] bg-white/90 backdrop-blur px-4 py-3 flex items-center gap-2">
        <div className="size-8 rounded-lg bg-black flex items-center justify-center font-extrabold text-white text-[13px]">
          S
        </div>
        <span className="text-[14px] font-semibold">SlyxUp Admin</span>
        <div className="ml-auto flex items-center gap-0.5">
          <NavLink
            to="/admin"
            className="rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-[#71717a]"
          >
            Projects
          </NavLink>
          <NavLink
            to="/docs"
            className="rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-[#71717a]"
          >
            Docs
          </NavLink>
          <NavLink
            to="/ui"
            className="rounded-md px-2.5 py-1.5 text-[12.5px] font-medium text-[#71717a]"
          >
            UI Kit
          </NavLink>
          <button
            type="button"
            onClick={out}
            className="rounded-md p-2 text-[#71717a]"
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 min-w-0">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-8 py-6 sm:py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
