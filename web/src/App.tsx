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
        <div className="size-8 rounded-full border-2 border-[#e4e6eb] border-t-[#6d28d9] animate-spin" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}

function RootRedirect() {
  const { user, ready, hydrate } = useAuth();

  useEffect(() => {
    if (!ready) void hydrate();
  }, [ready, hydrate]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="size-8 rounded-full border-2 border-[#e4e6eb] border-t-[#6d28d9] animate-spin" />
      </div>
    );
  }
  return <Navigate to={user ? '/admin' : '/login'} replace />;
}

function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="text-[48px] font-extrabold tracking-tight">404</div>
      <p className="text-[13.5px] text-[#63666f]">This page does not exist.</p>
      <a
        href="/admin"
        className="text-[13.5px] font-semibold text-[#6d28d9] underline underline-offset-4"
      >
        Go to admin
      </a>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
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
          <div className="size-8 rounded-lg bg-[#6d28d9] flex items-center justify-center font-extrabold text-white text-[13px]">
            S
          </div>
          <span className="text-[14px] font-bold">SlyxUp Docs</span>
          <Link
            to="/admin"
            className="ml-auto flex items-center gap-1.5 rounded-full bg-[#101014] text-white px-4 py-2 text-[12.5px] font-semibold"
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
