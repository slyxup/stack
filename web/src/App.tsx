import { BookOpen } from 'lucide-react';
import { useEffect } from 'react';
import {
  BrowserRouter,
  Link,
  Navigate,
  Outlet,
  Route,
  Routes,
} from 'react-router-dom';
import { AdminLayout } from './components/AdminLayout';
import Docs from './pages/Docs';
import Landing from './pages/Landing';
import Login from './pages/Login';
import ProjectDetail from './pages/ProjectDetail';
import Projects from './pages/Projects';
import UiKit from './pages/UiKit';
import { useAuth } from './store/auth';

function RequireAuth() {
  const { user, ready, hydrate } = useAuth();

  useEffect(() => {
    if (!ready) void hydrate();
  }, [ready, hydrate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-[#e4e6eb] border-t-black animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function NotFound() {
  return (
    <div className="min-h-screen bg-[#0b0b10] text-white flex flex-col items-center justify-center gap-3 px-4 text-center overflow-x-clip">
      <div className="font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-white/40">
        404 — lost in the stack
      </div>
      <div className="font-display text-[72px] sm:text-[120px] font-extrabold leading-none tracking-tight">
        4<span className="text-gradient">0</span>4
      </div>
      <p className="max-w-[380px] text-[13.5px] leading-relaxed text-white/55">
        This page does not exist. The admin panel and docs are one click away.
      </p>
      <div className="mt-2 flex gap-2">
        <a
          href="/admin"
          className="rounded-full bg-white px-5 py-2.5 text-[13px] font-bold text-[#0b0b10] hover:bg-white/85"
        >
          Go to admin
        </a>
        <a
          href="/docs"
          className="rounded-full border border-white/20 px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-white/10"
        >
          Docs
        </a>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/docs" element={<DocsStandalone />} />
        <Route path="/ui" element={<UiKit />} />
        <Route element={<RequireAuth />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin" element={<Projects />} />
            <Route path="/admin/projects/:id" element={<ProjectDetail />} />
            <Route path="/admin/docs" element={<Docs />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}

/** Public docs shell — same content, minimal topbar, no auth required. */
function DocsStandalone() {
  return (
    <div className="min-h-screen">
      <div className="sticky top-0 z-30 border-b border-[#e4e6eb] bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-[1120px] px-4 sm:px-8 py-3 flex items-center gap-2">
          <div className="size-8 rounded-lg bg-black flex items-center justify-center font-extrabold text-white text-[13px]">
            S
          </div>
          <span className="text-[14px] font-bold">SlyxUp Docs</span>
          <Link
            to="/admin"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-black text-white px-4 py-2 text-[12.5px] font-semibold"
          >
            <BookOpen className="size-3.5" /> Open admin
          </Link>
          <Link
            to="/ui"
            className="flex items-center gap-1.5 rounded-full border border-[#e4e6eb] px-4 py-2 text-[12.5px] font-semibold"
          >
            UI Kit
          </Link>
        </div>
      </div>
      <div className="mx-auto max-w-[1120px] px-4 sm:px-8 py-6 sm:py-8">
        <Docs />
      </div>
    </div>
  );
}
