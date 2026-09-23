import React, { useState } from 'react';
import {
  FolderKanban,
  Mail,
  Lock,
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import { authService } from '../../services/authService';
import { ForgotPasswordModal } from './ForgotPasswordModal';
import { GoogleAuthModal } from './GoogleAuthModal';
import { getFriendlyAuthErrorMessage, FriendlyAuthError } from '../../utils/authErrors';

interface LoginViewProps {
  onSuccess: () => void;
  onNavigateToRegister: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onSuccess,
  onNavigateToRegister,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleModalOpen, setGoogleModalOpen] = useState(false);
  const [authError, setAuthError] = useState<FriendlyAuthError | null>(null);
  const [forgotModalOpen, setForgotModalOpen] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;

    setLoading(true);
    setAuthError(null);

    try {
      await authService.loginWithEmail(email.trim(), password);
      onSuccess();
    } catch (err: any) {
      const friendly = getFriendlyAuthErrorMessage(err);
      setAuthError(friendly);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    setGoogleModalOpen(true);
  };

  return (
    <div
      id="login-page-container"
      className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8"
    >
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        {/* Logo */}
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white mx-auto shadow-md shadow-indigo-200 mb-3">
          <FolderKanban className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Sign in to TaskFlow
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Personal task management and daily productivity
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 sm:px-8 rounded-2xl shadow-xs border border-slate-200/90">
          {authError && (
            <div
              id="login-error-banner"
              className="mb-5 p-4 rounded-xl border text-xs space-y-1 bg-rose-50 border-rose-200 text-rose-800"
            >
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <div className="space-y-0.5">
                  <p className="font-bold">{authError.title}</p>
                  <p className="leading-relaxed text-[11px] opacity-90">{authError.message}</p>
                </div>
              </div>
            </div>
          )}

          {/* Google Sign In Option */}
          <div className="mb-5">
            <button
              id="google-signin-btn"
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading || googleLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 shadow-xs flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-[11px] uppercase">
                <span className="bg-white px-2 text-slate-400 font-medium">Or continue with email</span>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <button
                  id="forgot-password-link"
                  type="button"
                  onClick={() => setForgotModalOpen(true)}
                  className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  id="login-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all font-medium"
                />
                <button
                  id="toggle-login-password-btn"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              id="submit-login-btn"
              type="submit"
              disabled={loading || !email.trim() || !password}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <ArrowRight className="w-3.5 h-3.5" />
              )}
              <span>Sign In</span>
            </button>
          </form>

          {/* Switch to Register */}
          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account yet?{' '}
              <button
                id="go-to-register-btn"
                type="button"
                onClick={onNavigateToRegister}
                className="font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
              >
                Create one now
              </button>
            </p>
          </div>
        </div>
      </div>

      <ForgotPasswordModal
        isOpen={forgotModalOpen}
        onClose={() => setForgotModalOpen(false)}
      />

      <GoogleAuthModal
        isOpen={googleModalOpen}
        onClose={() => setGoogleModalOpen(false)}
        onSuccess={onSuccess}
      />
    </div>
  );
};
