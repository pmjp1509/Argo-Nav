import { useNavigate } from 'react-router-dom';

const Welcome = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 text-white flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="max-w-xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-2 tracking-tight">
          Argo Float Monitor
        </h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          Query global Argo float data in plain language. Get corrected questions, SQL insights,
          and summaries with charts. Explore floats on the map and dive into ocean data.
        </p>
        <div className="flex flex-col gap-4 items-center">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="w-full max-w-xs px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg shadow-lg transition-colors"
          >
            Log in
          </button>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="w-full max-w-xs px-6 py-3 bg-transparent border-2 border-slate-500 hover:border-slate-400 text-white font-medium rounded-lg transition-colors"
          >
            Sign up
          </button>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="text-slate-500 hover:text-slate-400 text-sm underline"
          >
            Continue without signing in
          </button>
        </div>
      </div>
    </div>
  );
};

export default Welcome;
