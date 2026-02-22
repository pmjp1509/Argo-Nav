import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

const Navbar = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === '/dashboard';

  return (
    <nav className="flex items-center justify-between px-4 py-3 bg-slate-900 text-white shadow-md flex-shrink-0">
      <button
        type="button"
        onClick={() => navigate(isDashboard ? '/' : '/dashboard')}
        className="flex items-center gap-2 bg-transparent border-none text-white cursor-pointer text-lg font-bold hover:text-slate-200 transition-colors"
      >
        <span className="text-xl">🌊</span>
        Argo Float Monitor
      </button>

      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-slate-400 truncate max-w-[180px]">
              {user.email || (user.user_metadata?.full_name as string) || 'User'}
            </span>
            <button
              type="button"
              onClick={() => signOut()}
              className="px-3 py-1.5 bg-white/10 border border-white/30 rounded-md text-sm hover:bg-white/20 transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="px-3 py-1.5 bg-transparent border border-white/50 rounded-md text-sm hover:bg-white/10 transition-colors"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => navigate('/signup')}
              className="px-3 py-1.5 bg-blue-600 border-none rounded-md text-sm hover:bg-blue-500 transition-colors"
            >
              Sign up
            </button>
          </>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
