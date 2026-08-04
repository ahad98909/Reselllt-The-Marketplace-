import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Mock modal states for custom Google login simulation
  const [mockModalOpen, setMockModalOpen] = useState(false);
  const [mockEmail, setMockEmail] = useState('');
  const [mockPassword, setMockPassword] = useState('');

  // Dynamically load Google Identity Services script if Client ID is present
  useEffect(() => {
    const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (client_id) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        /* global google */
        if (window.google) {
          window.google.accounts.id.initialize({
            client_id: client_id,
            callback: handleCredentialResponse
          });
          window.google.accounts.id.renderButton(
            document.getElementById("google-signin-btn"),
            { theme: "outline", size: "large", width: "100%" }
          );
        }
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    }
  }, []);

  const handleCredentialResponse = async (response) => {
    setError('');
    setLoading(true);
    try {
      const token = response.credential;
      const payloadBase64 = token.split('.')[1];
      const decodedPayload = JSON.parse(atob(payloadBase64.replace(/-/g, '+').replace(/_/g, '/')));
      
      const { authAPI } = await import('../services/api');
      const res = await authAPI.googleLogin(
        decodedPayload.email,
        decodedPayload.name,
        decodedPayload.picture
      );
      
      localStorage.setItem('token', res.data.access_token);
      window.location.href = '/'; // Refresh context
    } catch (err) {
      setError('Google Sign-In failed.');
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleClick = () => {
    const client_id = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (client_id) {
      try {
        window.google?.accounts.id.prompt();
      } catch (err) {
        console.error("Failed prompting Google One Tap:", err);
      }
    } else {
      setMockModalOpen(true);
    }
  };

  const handleMockSubmit = async (e) => {
    e.preventDefault();
    if (!mockEmail || !mockPassword) return;
    setMockModalOpen(false);
    setLoading(true);
    setError('');
    
    try {
      const { authAPI } = await import('../services/api');
      
      // 1. Try logging in using standard authAPI.login to verify password
      try {
        const res = await authAPI.login(mockEmail, mockPassword);
        localStorage.setItem('token', res.data.access_token);
        window.location.href = '/'; // Refresh context
        return;
      } catch (loginErr) {
        // If user exists but password is bad (401), reject authentication
        if (loginErr.response && (loginErr.response.status === 401 || loginErr.response.status === 400)) {
          throw new Error("Invalid Google Email or Password.");
        }
        
        // 2. If user doesn't exist (e.g. status 404), create a new user via Google callback
        const defaultName = mockEmail.split('@')[0];
        const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
        const pic = `https://ui-avatars.com/api/?name=${encodeURIComponent(formattedName)}&background=random`;
        
        const res = await authAPI.googleLogin(
          mockEmail,
          formattedName,
          pic
        );
        localStorage.setItem('token', res.data.access_token);
        window.location.href = '/'; // Refresh context
      }
    } catch (err) {
      setError(err.message || err.response?.data?.detail || 'Google Mock Login failed.');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold tracking-tight">Welcome Back</h2>
          <p className="mt-2 text-sm text-slate-500">Sign in to your marketplace account</p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-500 dark:bg-red-950/20 dark:text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-bold text-white transition hover:bg-brand-700 disabled:opacity-50 dark:bg-brand-500 dark:hover:bg-brand-600"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="relative my-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200 dark:border-slate-800"></div></div>
          <span className="relative bg-white px-4 text-xs uppercase text-slate-400 dark:bg-slate-900">Or continue with</span>
        </div>

        {/* Google Authentication Section */}
        {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
          <div id="google-signin-btn" className="w-full flex justify-center mt-2" />
        ) : (
          <button
            onClick={handleGoogleClick}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-850"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.63-1.07-1.37-1.22-2.18z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Google (Simulated)
          </button>
        )}

        <p className="mt-6 text-center text-xs text-slate-500">
          Don't have an account?{' '}
          <Link to="/register" className="font-semibold text-brand-600 hover:underline dark:text-brand-400">
            Sign up now
          </Link>
        </p>
      </div>

      {/* Mock Google Login Modal */}
      {mockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95 duration-200">
            <div className="mb-4 text-center">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center justify-center gap-2">
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.62-.63-1.07-1.37-1.22-2.18z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Sign in with Google
              </h3>
              <p className="text-xs text-slate-400 mt-1">Authenticate using Google account details (e.g. password123 for seeded users)</p>
            </div>
            
            <form onSubmit={handleMockSubmit} className="space-y-4" autoComplete="off">
              {/* Dummy elements to intercept browser autofill */}
              <input type="text" style={{ display: 'none' }} autoComplete="off" />
              <input type="password" style={{ display: 'none' }} autoComplete="new-password" />

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Google Email</label>
                <input
                  type="email"
                  id="google-mock-email"
                  name="google-mock-email"
                  required
                  value={mockEmail}
                  onChange={(e) => setMockEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700"
                  placeholder="e.g. bob@marketplace.com"
                  autoComplete="off"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Password</label>
                <input
                  type="password"
                  id="google-mock-password"
                  name="google-mock-password"
                  required
                  value={mockPassword}
                  onChange={(e) => setMockPassword(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-700"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setMockModalOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-350 dark:hover:bg-slate-850"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                  {loading ? "Signing in..." : "Continue"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
