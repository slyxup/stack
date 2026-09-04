import { Blocks, BookOpen, FolderKanban, LogOut } from 'lucide-react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { AUTH_URL } from '../lib/api';
import { useAuth } from '../store/auth';

export function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const out = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen lg:flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-[248px] shrink-0 flex-col bg-[#0e0e13] text-white min-h-screen sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 px-5 pt-6 pb-5">
          <div className="size-9 rounded-xl bg-[#6d28d9] flex items-center justify-center font-extrabold text-[15px]">
            S
          </div>
          <div>
            <div className="text-[14px] font-bold leading-none">
              SlyxUp Admin
            </div>
            <div className="font-mono text-[10px] text-white/40 mt-1 truncate max-w-[160px]">
              {AUTH_URL.replace('https://', '')}
            </div>
          </div>
        </div>
        <nav className="px-3 space-y-1">
          <NavLink
            to="/admin"
            end
            className="nav-item"
            data-active={undefined}
            style={({ isActive }) => ({
              background: isActive ? 'rgb(255 255 255 / 0.09)' : undefined,
              color: isActive ? '#fff' : undefined,
            })}
          >
            <FolderKanban className="size-4" /> Projects
          </NavLink>
          <NavLink
            to="/docs"
            className="nav-item"
            style={({ isActive }) => ({
              background: isActive ? 'rgb(255 255 255 / 0.09)' : undefined,
              color: isActive ? '#fff' : undefined,
            })}
          >
            <BookOpen className="size-4" /> Docs
          </NavLink>
          <NavLink
            to="/ui"
            className="nav-item"
            style={({ isActive }) => ({
              background: isActive ? 'rgb(255 255 255 / 0.09)' : undefined,
              color: isActive ? '#fff' : undefined,
            })}
          >
            <Blocks className="size-4" /> UI Kit
          </NavLink>
        </nav>
        <div className="mt-auto p-4">
          <div className="rounded-xl bg-white/[0.06] p-3.5">
            <div className="text-[12px] font-bold truncate">
              {user?.name || user?.email}
            </div>
            <div className="font-mono text-[10.5px] text-white/50 truncate mt-0.5">
              {user?.email}
            </div>
            <button
              type="button"
              onClick={out}
              className="mt-2.5 flex items-center gap-1.5 text-[12px] font-semibold text-white/60 hover:text-white"
            >
              <LogOut className="size-3.5" /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile topbar */}
      <div className="lg:hidden sticky top-0 z-30 border-b border-[#e4e6eb] bg-white/90 backdrop-blur px-4 py-3 flex items-center gap-2">
        <div className="size-8 rounded-lg bg-[#6d28d9] flex items-center justify-center font-extrabold text-white text-[13px]">
          S
        </div>
        <span className="text-[14px] font-bold">SlyxUp Admin</span>
        <div className="ml-auto flex items-center gap-1">
          <NavLink
            to="/admin"
            className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[#63666f]"
          >
            Projects
          </NavLink>
          <NavLink
            to="/docs"
            className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[#63666f]"
          >
            Docs
          </NavLink>
          <NavLink
            to="/ui"
            className="rounded-full px-3 py-1.5 text-[12.5px] font-semibold text-[#63666f]"
          >
            UI Kit
          </NavLink>
          <button
            type="button"
            onClick={out}
            className="rounded-full p-2 text-[#63666f]"
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
