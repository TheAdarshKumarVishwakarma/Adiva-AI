import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardTitle } from '../ui/card';
import {
  User,
  Mail,
  Lock,
  Save,
  Loader2,
  X,
  Shield,
  Calendar,
  Settings,
  LogOut,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAdmin?: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onOpenAdmin }) => {
  const { user, updateProfile, changePassword, logout } = useAuth();
  const isAdmin = user?.role === 'admin' && user?.email === 'adarshvish2606@gmail.com';
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');
  const [profileData, setProfileData] = useState({
    name: user?.name || '',
    email: user?.email || ''
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Recently';
      return date.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  React.useEffect(() => {
    if (user) {
      setProfileData({ name: user.name, email: user.email });
    }
  }, [user]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');
    try {
      const result = await updateProfile(profileData.name, profileData.email);
      if (result.success) {
        setSuccess('Profile updated successfully!');
        setTimeout(() => {
          setSuccess('');
          onClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      setIsSubmitting(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsSubmitting(false);
      return;
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      setError('Password must contain at least one lowercase letter, one uppercase letter, and one number');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await changePassword(passwordData.currentPassword, passwordData.newPassword);
      if (result.success) {
        setSuccess('Password changed successfully!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => {
          setSuccess('');
          onClose();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    window.location.reload();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-5xl mx-auto glass-dark border border-white/20 shadow-2xl relative overflow-hidden my-4">
        <div className="relative overflow-hidden px-5 py-4 border-b border-white/10">
          <div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(120deg, rgba(59,130,246,0.35), rgba(6,182,212,0.3), rgba(96,165,250,0.25))'
            }}
          ></div>
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/15 backdrop-blur-sm border border-white/20">
                <User className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-white">Profile</CardTitle>
                <p className="text-blue-100 text-xs">Account and security</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white/80 hover:text-white hover:bg-white/20 rounded-lg"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <CardContent className="space-y-4 p-4">
          {(error || success) && (
            <div
              className={`flex items-center gap-2 text-xs rounded-xl border px-3 py-2 ${
                success
                  ? 'bg-emerald-500/10 border-emerald-400/20 text-emerald-200'
                  : 'bg-red-500/10 border-red-400/20 text-red-200'
              }`}
            >
              {success ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{success || error}</span>
            </div>
          )}
          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{user?.name}</div>
                    <div className="text-xs text-gray-300">{user?.email}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-300">
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1">
                    <Shield className="h-3 w-3 text-blue-300" />
                    <span>{user?.role === 'admin' ? 'Admin' : 'User'}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/5 rounded-lg px-2 py-1">
                    <Calendar className="h-3 w-3 text-blue-300" />
                    <span>{formatDate(user?.createdAt)}</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/5 border border-white/10">
                <div className="text-[11px] uppercase tracking-wider text-blue-200/80 mb-2">Quick</div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('profile')}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      activeTab === 'profile'
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'text-gray-300 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('password')}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                      activeTab === 'password'
                        ? 'bg-white/15 text-white border border-white/20'
                        : 'text-gray-300 hover:text-white hover:bg-white/10 border border-transparent'
                    }`}
                  >
                    Security
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => onOpenAdmin?.()}
                      className="px-3 py-2 rounded-xl text-xs font-medium transition-all text-amber-100 hover:text-white hover:bg-white/10 border border-white/10"
                    >
                      Admin Console
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-8 px-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <Settings className="h-4 w-4 text-blue-200" />
                    <span className="text-xs text-blue-100">Account</span>
                  </div>
                  <div className="h-8 px-2 rounded-xl bg-white/5 border border-white/10 flex items-center gap-2">
                    <Lock className="h-4 w-4 text-blue-200" />
                    <span className="text-xs text-blue-100">Security</span>
                  </div>
                </div>
                <div className="flex gap-1 bg-white/5 p-1 rounded-full border border-white/10">
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      activeTab === 'profile'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Profile
                  </button>
                  <button
                    onClick={() => setActiveTab('password')}
                    className={`px-3 py-1.5 text-xs rounded-full transition-all ${
                      activeTab === 'password'
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                        : 'text-gray-300 hover:text-white'
                    }`}
                  >
                    Password
                  </button>
                </div>
              </div>

              {activeTab === 'profile' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                    <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Personal</span>
                    </h4>
                    <form onSubmit={handleProfileSubmit} className="space-y-4">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label htmlFor="name" className="text-xs font-medium text-gray-300 flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            <span>Full Name</span>
                          </label>
                          <Input
                            id="name"
                            name="name"
                            type="text"
                            value={profileData.name}
                            onChange={handleProfileChange}
                            className="h-10 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl transition-all duration-300"
                            placeholder="Enter your full name"
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="email" className="text-xs font-medium text-gray-300 flex items-center gap-2">
                            <Mail className="h-3.5 w-3.5" />
                            <span>Email</span>
                          </label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            value={profileData.email}
                            onChange={handleProfileChange}
                            className="h-10 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl transition-all duration-300"
                            placeholder="Enter your email"
                            required
                            readOnly
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-5 h-9 text-white border-0 rounded-xl text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Saving</span>
                            </>
                          ) : (
                            <>
                              <Save className="h-3.5 w-3.5" />
                              <span>Save</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>

                  <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                    <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Status</span>
                    </h4>
                    <div className="space-y-2">
                      <div className="p-3 rounded-xl border border-white/10 bg-white/5">
                        <div className="text-xs text-gray-300">Account</div>
                        <div className="text-sm text-white font-medium">Verified</div>
                      </div>
                      <div className="p-3 rounded-xl border border-white/10 bg-white/5">
                        <div className="text-xs text-gray-300">Email</div>
                        <div className="text-sm text-white font-medium">Confirmed</div>
                      </div>
                      <div className="p-3 rounded-xl border border-white/10 bg-white/5">
                        <div className="text-xs text-gray-300">Security</div>
                        <div className="text-sm text-white font-medium">Standard</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'password' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                    <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      <span>Change Password</span>
                    </h4>
                    <form onSubmit={handlePasswordSubmit} className="space-y-4">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label htmlFor="currentPassword" className="text-xs font-medium text-gray-300 flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Current Password</span>
                          </label>
                          <div className="relative">
                            <Input
                              id="currentPassword"
                              name="currentPassword"
                              type={showCurrentPassword ? 'text' : 'password'}
                              value={passwordData.currentPassword}
                              onChange={handlePasswordChange}
                              className="pl-4 pr-12 h-10 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl transition-all duration-300"
                              placeholder="Enter your current password"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                              {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="newPassword" className="text-xs font-medium text-gray-300 flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5" />
                            <span>New Password</span>
                          </label>
                          <div className="relative">
                            <Input
                              id="newPassword"
                              name="newPassword"
                              type={showNewPassword ? 'text' : 'password'}
                              value={passwordData.newPassword}
                              onChange={handlePasswordChange}
                              className="pl-4 pr-12 h-10 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl transition-all duration-300"
                              placeholder="Enter your new password"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowNewPassword(!showNewPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                              {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          <div className="text-[11px] text-gray-400 bg-white/5 p-2 rounded-lg">
                            <div className="grid grid-cols-2 gap-1">
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${passwordData.newPassword.length >= 6 ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                                <span>6+ chars</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*[a-z])/.test(passwordData.newPassword) ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                                <span>Lowercase</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*[A-Z])/.test(passwordData.newPassword) ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                                <span>Uppercase</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`w-1.5 h-1.5 rounded-full ${/(?=.*\d)/.test(passwordData.newPassword) ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                                <span>Number</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="confirmPassword" className="text-xs font-medium text-gray-300 flex items-center gap-2">
                            <Lock className="h-3.5 w-3.5" />
                            <span>Confirm New Password</span>
                          </label>
                          <div className="relative">
                            <Input
                              id="confirmPassword"
                              name="confirmPassword"
                              type={showConfirmPassword ? 'text' : 'password'}
                              value={passwordData.confirmPassword}
                              onChange={handlePasswordChange}
                              className="pl-4 pr-12 h-10 bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20 rounded-xl transition-all duration-300"
                              placeholder="Confirm your new password"
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                            >
                              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                            <p className="text-xs text-red-400 flex items-center gap-1">
                              <AlertCircle className="h-3 w-3" />
                              <span>No match</span>
                            </p>
                          )}
                          {passwordData.confirmPassword && passwordData.newPassword === passwordData.confirmPassword && (
                            <p className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              <span>Match</span>
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          disabled={isSubmitting}
                          className="px-5 h-9 text-white border-0 rounded-xl text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                          style={{ background: 'linear-gradient(135deg, #3b82f6, #06b6d4)' }}
                        >
                          {isSubmitting ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              <span>Changing</span>
                            </>
                          ) : (
                            <>
                              <Lock className="h-3.5 w-3.5" />
                              <span>Change</span>
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </div>

                  <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                    <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      <span>Guidelines</span>
                    </h4>
                    <div className="space-y-2 text-xs text-gray-300">
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        6+ characters, upper and lower case, and numbers.
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10">
                        Use unique passwords and avoid sharing credentials.
                      </div>
                      <div className="p-2 rounded-lg bg-white/5 border border-white/10 flex items-center gap-2">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span>2FA available</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-4 bg-white/5 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <LogOut className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Sign Out</h4>
                <p className="text-xs text-gray-400">End your current session</p>
              </div>
            </div>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="px-4 h-8 text-red-400 border-red-400/30 hover:bg-red-500/10 hover:border-red-400/50 rounded-lg transition-all duration-300 flex items-center space-x-2"
            >
              <LogOut className="h-3 w-3" />
              <span className="text-xs">Sign Out</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfileModal;
