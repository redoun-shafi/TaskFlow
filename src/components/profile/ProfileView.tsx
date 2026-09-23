import React, { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Send,
  Eye,
  EyeOff,
  AtSign,
  Download,
  Upload,
  Database,
  Shield,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { userService } from '../../services/userService';
import { authService } from '../../services/authService';
import { storageService } from '../../services/storageService';
import { storageDb } from '../../lib/storageDb';

export const ProfileView: React.FC = () => {
  const { currentUser, userProfile, refreshUserProfile } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);

  // Password state & independent toggles
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Verification email
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSuccess, setVerificationSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (userProfile || currentUser) {
      setDisplayName(userProfile?.displayName || currentUser?.displayName || '');
    }
  }, [userProfile, currentUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;

    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      await userService.updateUserProfile(currentUser.uid, {
        displayName: displayName.trim(),
      });
      await authService.updateUserProfile({
        displayName: displayName.trim(),
      });
      await refreshUserProfile();
      setProfileSuccess('Profile updated successfully.');
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    setUploadingAvatar(true);
    setProfileError(null);
    try {
      const photoURL = await storageService.uploadAvatar(currentUser.uid, file);
      await userService.updateUserProfile(currentUser.uid, { photoURL });
      await authService.updateUserProfile({ photoURL });
      await refreshUserProfile();
      setProfileSuccess('Profile picture updated successfully.');
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to upload photo');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    setUpdatingPassword(true);
    try {
      await authService.updatePassword(newPassword);
      setPasswordSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordError(err?.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleSendVerification = async () => {
    setSendingVerification(true);
    setVerificationSuccess(null);
    try {
      await authService.sendEmailVerification();
      setVerificationSuccess('Verification email sent! Check your inbox.');
    } catch (err: any) {
      setProfileError(err?.message || 'Failed to send verification email');
    } finally {
      setSendingVerification(false);
    }
  };

  const currentPhoto = userProfile?.photoURL || currentUser?.photoURL;
  const isVerified = currentUser?.emailVerified;

  return (
    <div id="profile-view" className="p-4 lg:p-6 space-y-6 max-w-3xl mx-auto">
      {/* Profile Details Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              User Profile
            </h2>
            <p className="text-xs text-slate-500">
              Manage your personal information and avatar
            </p>
          </div>
        </div>

        {profileSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}
        {profileError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        {/* Photo & Display Name Form */}
        <div className="flex flex-col sm:flex-row items-center gap-6 pb-4 border-b border-slate-100">
          <div className="relative group">
            {currentPhoto ? (
              <img
                src={currentPhoto}
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-200 shadow-xs"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-indigo-600 text-white font-bold text-2xl flex items-center justify-center shadow-xs">
                {(displayName || 'U').charAt(0).toUpperCase()}
              </div>
            )}

            <label
              htmlFor="avatar-file-input"
              className="absolute inset-0 rounded-full bg-slate-900/40 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center cursor-pointer transition-opacity text-[10px] font-semibold"
            >
              <Camera className="w-4 h-4 mb-0.5" />
              <span>Change</span>
            </label>
            <input
              id="avatar-file-input"
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
              disabled={uploadingAvatar}
            />
          </div>

          <div className="flex-1 text-center sm:text-left space-y-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
              <h3 className="text-sm font-bold text-slate-900">
                {displayName || 'TaskFlow User'}
              </h3>
              {(userProfile?.username || (currentUser as any)?.username) && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  <AtSign className="w-3 h-3" />
                  {userProfile?.username || (currentUser as any)?.username}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">{currentUser?.email}</p>
            {uploadingAvatar && (
              <p className="text-xs text-indigo-600 flex items-center gap-1 mt-1 justify-center sm:justify-start">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Uploading new photo...
              </p>
            )}
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Display Name
            </label>
            <input
              id="profile-display-name-input"
              type="text"
              required
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email Address
            </label>
            <div className="flex items-center gap-2">
              <input
                type="email"
                disabled
                value={currentUser?.email || ''}
                className="flex-1 px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-xs text-slate-500"
              />
              {isVerified ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 px-2 py-1 bg-emerald-50 rounded-lg border border-emerald-200 shrink-0">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              ) : (
                <button
                  id="send-verification-btn"
                  type="button"
                  onClick={handleSendVerification}
                  disabled={sendingVerification}
                  className="px-3 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50 rounded-lg border border-indigo-200 shrink-0 flex items-center gap-1"
                >
                  {sendingVerification ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                  <span>Verify Email</span>
                </button>
              )}
            </div>
            {verificationSuccess && (
              <p className="text-[11px] text-emerald-600 mt-1">{verificationSuccess}</p>
            )}
          </div>

          <div className="pt-2">
            <button
              id="save-profile-btn"
              type="submit"
              disabled={savingProfile}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Profile</span>
            </button>
          </div>
        </form>
      </div>

      {/* Password Update Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-xs p-6 space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Change Password
            </h2>
            <p className="text-xs text-slate-500">
              Ensure your account is using a secure, unique password
            </p>
          </div>
        </div>

        {passwordSuccess && (
          <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}
        {passwordError && (
          <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  id="new-password-input"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <button
                  id="toggle-profile-new-pass-btn"
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Confirm New Password
                </label>
                {confirmPassword && newPassword === confirmPassword && (
                  <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                    <CheckCircle2 className="w-3 h-3" /> Match
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  id="confirm-password-input"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
                <button
                  id="toggle-profile-confirm-pass-btn"
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 rounded-md"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              id="update-password-btn"
              type="submit"
              disabled={updatingPassword || !newPassword}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
            >
              {updatingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Update Password</span>
            </button>
          </div>
        </form>
      </div>

      {/* Free Local Data Management & Backup */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Workspace Data & Backup</h3>
              <p className="text-xs text-slate-500">
                100% Free Forever • Zero Cloud Subscriptions • Stored Privately in Your Browser
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
            <Shield className="w-3 h-3" /> Free & Private
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed">
          Your task workspace operates completely free without any third-party payment requirements, Firebase invoices, or cloud billing. You can export a full JSON backup of all your tasks, notes, and activity at any time, or import it to sync across devices.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            id="export-backup-btn"
            type="button"
            onClick={async () => {
              try {
                const dataStr = await storageDb.exportBackup();
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `taskflow-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (e) {
                console.error('Backup export error:', e);
              }
            }}
            className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Backup (.json)</span>
          </button>

          <label
            htmlFor="import-backup-file"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Restore Backup</span>
            <input
              id="import-backup-file"
              type="file"
              accept=".json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const ok = await storageDb.importBackup(text);
                if (ok) {
                  window.location.reload();
                }
              }}
            />
          </label>
        </div>
      </div>
    </div>
  );
};
