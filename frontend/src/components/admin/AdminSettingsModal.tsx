import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Shield, Sliders, X, CheckCircle, AlertCircle, Lock, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface AdminSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ADMIN_EMAIL = 'adarshvish2606@gmail.com';

const ALL_MODELS = [
  'gpt-5-nano',
  'claude-sonnet-4-20250514'
];

const AdminSettingsModal: React.FC<AdminSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, token } = useAuth();
  const authToken = token || localStorage.getItem('token');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [settings, setSettings] = useState({
    defaultModel: 'gpt-5-nano',
    allowedModels: ['gpt-5-nano'],
    systemPromptTemplate: '',
    maxTokens: 2000,
    rateLimits: {
      requestsPerMinute: 60,
      tokensPerMinute: 60000
    },
    featureToggles: {
      imageUpload: true,
      analytics: true
    },
    guestLimits: {
      maxChats: 5
    }
  });

  const [confirmText, setConfirmText] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [users, setUsers] = useState<Array<{ name: string; email: string; role: string; isActive: boolean; createdAt?: string; lastLogin?: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [activeTab, setActiveTab] = useState<'settings' | 'users'>('settings');

  const isAdmin = user?.role === 'admin' && user?.email === ADMIN_EMAIL;
  const canSave = confirmText === 'CONFIRM' && confirmPassword.length >= 6;

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    setLoading(true);
    setError('');
    setSuccess('');
    if (!authToken) {
      setLoading(false);
      setError('Missing auth token');
      return;
    }
    fetch('http://localhost:3001/api/admin/settings', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })
      .then(async res => res.ok ? res.json() : Promise.reject(await res.json().catch(() => ({}))))
      .then(data => {
        if (data?.settings) {
          setSettings({
            ...settings,
            ...data.settings
          });
        }
      })
      .catch((err) => setError(err?.message || 'Failed to load admin settings'))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, isAdmin, authToken]);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    setUsersLoading(true);
    setUsersError('');
    if (!authToken) {
      setUsersLoading(false);
      setUsersError('Missing auth token');
      return;
    }
    fetch('http://localhost:3001/api/admin/users', {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    })
      .then(async res => res.ok ? res.json() : Promise.reject(await res.json().catch(() => ({}))))
      .then(data => {
        setUsers(Array.isArray(data?.users) ? data.users : []);
      })
      .catch((err) => setUsersError(err?.message || 'Failed to load users'))
      .finally(() => setUsersLoading(false));
  }, [isOpen, isAdmin, authToken]);

  const toggleAllowedModel = (model: string) => {
    setSettings(prev => {
      const allowed = new Set(prev.allowedModels);
      if (allowed.has(model)) {
        allowed.delete(model);
      } else {
        allowed.add(model);
      }
      const nextAllowed = Array.from(allowed);
      const nextDefault = nextAllowed.includes(prev.defaultModel)
        ? prev.defaultModel
        : (nextAllowed[0] || prev.defaultModel);
      return { ...prev, allowedModels: nextAllowed, defaultModel: nextDefault };
    });
  };

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('http://localhost:3001/api/admin/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          settings,
          confirm: { text: confirmText, password: confirmPassword }
        })
      });
      const data = await response.json();
      if (response.ok && data?.settings) {
        setSuccess('Settings updated');
        setConfirmText('');
        setConfirmPassword('');
      } else {
        setError(data?.message || 'Failed to update settings');
      }
    } catch {
      setError('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !isAdmin) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[90] flex items-center justify-center p-4 overflow-y-auto">
      <Card className="w-full max-w-4xl mx-auto glass-dark border border-white/20 shadow-2xl relative overflow-hidden my-4">
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
                <Shield className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl font-semibold text-white">Admin Console</CardTitle>
                <p className="text-blue-100 text-xs">System controls & safeguards</p>
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
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full p-1 w-fit">
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                activeTab === 'settings' ? 'bg-white/15 text-white' : 'text-blue-200 hover:text-white'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors duration-200 ${
                activeTab === 'users' ? 'bg-white/15 text-white' : 'text-blue-200 hover:text-white'
              }`}
            >
              Users
            </button>
          </div>
          {activeTab === 'settings' && (loading ? (
            <div className="text-sm text-blue-200">Loading admin settings...</div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                  <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                    <Sliders className="h-4 w-4" />
                    <span>Model Policy</span>
                  </h4>
                  <div className="space-y-3">
                    <label className="text-xs text-gray-300">Default model</label>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => setSettings(prev => ({ ...prev, defaultModel: e.target.value }))}
                      className="w-full p-2 rounded-lg bg-white/10 border border-white/20 text-white text-sm"
                    >
                      {ALL_MODELS.map((m) => (
                        <option key={m} value={m} className="bg-slate-800 text-white">
                          {m}
                        </option>
                      ))}
                    </select>

                    <div className="text-xs text-gray-300 mt-2">Allowed models</div>
                    <div className="grid grid-cols-1 gap-2">
                      {ALL_MODELS.map((m) => (
                        <label key={m} className="flex items-center gap-2 text-sm text-white">
                          <input
                            type="checkbox"
                            checked={settings.allowedModels.includes(m)}
                            onChange={() => toggleAllowedModel(m)}
                          />
                          <span>{m}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                  <h4 className="text-base font-semibold text-white mb-3">Limits</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <label className="text-xs text-gray-300">Max tokens</label>
                      <Input
                        type="number"
                        min={1}
                        value={settings.maxTokens}
                        onChange={(e) => setSettings(prev => ({ ...prev, maxTokens: Number(e.target.value) }))}
                        className="h-9 bg-white/5 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-300">Guest chats</label>
                      <Input
                        type="number"
                        min={1}
                        max={100}
                        value={settings.guestLimits?.maxChats ?? 5}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          guestLimits: { ...prev.guestLimits, maxChats: Number(e.target.value) }
                        }))}
                        className="h-9 bg-white/5 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-300">Req/min</label>
                      <Input
                        type="number"
                        min={1}
                        value={settings.rateLimits.requestsPerMinute}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          rateLimits: { ...prev.rateLimits, requestsPerMinute: Number(e.target.value) }
                        }))}
                        className="h-9 bg-white/5 border-white/20 text-white text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-300">Tokens/min</label>
                      <Input
                        type="number"
                        min={1}
                        value={settings.rateLimits.tokensPerMinute}
                        onChange={(e) => setSettings(prev => ({
                          ...prev,
                          rateLimits: { ...prev.rateLimits, tokensPerMinute: Number(e.target.value) }
                        }))}
                        className="h-9 bg-white/5 border-white/20 text-white text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                  <h4 className="text-base font-semibold text-white mb-3">System Prompt Template</h4>
                  <textarea
                    value={settings.systemPromptTemplate}
                    onChange={(e) => setSettings(prev => ({ ...prev, systemPromptTemplate: e.target.value }))}
                    className="w-full h-40 bg-white/5 border border-white/20 text-white text-sm rounded-xl p-3"
                    placeholder="Optional global system prompt template"
                  />
                </div>

                <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                  <h4 className="text-base font-semibold text-white mb-3">Feature Toggles</h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">Image upload</span>
                      <Switch
                        checked={settings.featureToggles.imageUpload}
                        onCheckedChange={(val) =>
                          setSettings(prev => ({
                            ...prev,
                            featureToggles: { ...prev.featureToggles, imageUpload: val }
                          }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-white">Analytics</span>
                      <Switch
                        checked={settings.featureToggles.analytics}
                        onCheckedChange={(val) =>
                          setSettings(prev => ({
                            ...prev,
                            featureToggles: { ...prev.featureToggles, analytics: val }
                          }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
                  <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Two-step confirmation</span>
                  </h4>
                  <div className="space-y-2">
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Type CONFIRM"
                      className="h-9 bg-white/5 border-white/20 text-white text-sm"
                    />
                    <Input
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Enter your password"
                      type="password"
                      className="h-9 bg-white/5 border-white/20 text-white text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}

          {activeTab === 'users' && (
            <div className="rounded-2xl p-4 bg-white/5 border border-white/10">
              <h4 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span>Registered Users</span>
              </h4>
              {usersLoading ? (
                <div className="text-xs text-blue-200">Loading users...</div>
              ) : usersError ? (
                <div className="text-xs text-red-200">{usersError}</div>
              ) : users.length === 0 ? (
                <div className="text-xs text-blue-200">No users found.</div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2">
                  {users.map((u, idx) => (
                    <div key={`${u.email}-${idx}`} className="flex items-center justify-between text-xs text-gray-200 bg-white/5 rounded-lg px-3 py-2 border border-white/10">
                      <div className="min-w-0">
                        <div className="text-white font-medium truncate">{u.name || 'Unnamed'}</div>
                        <div className="text-[11px] text-blue-200/80 truncate">{u.email}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${u.role === 'admin' ? 'bg-amber-500/20 text-amber-200' : 'bg-white/10 text-gray-200'}`}>
                          {u.role}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${u.isActive ? 'bg-emerald-500/20 text-emerald-200' : 'bg-red-500/20 text-red-200'}`}>
                          {u.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-xs text-red-200 bg-red-500/10 border border-red-400/20 p-2 rounded-lg">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-xs text-emerald-200 bg-emerald-500/10 border border-emerald-400/20 p-2 rounded-lg">
              <CheckCircle className="h-4 w-4" />
              <span>{success}</span>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="flex justify-end">
              <Button
                onClick={handleSave}
                disabled={!canSave || saving || loading}
                className="px-5 h-9 text-white border-0 rounded-xl text-xs font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(59,130,246,0.9), rgba(6,182,212,0.9))'
                }}
              >
                {saving ? 'Saving...' : 'Save changes'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettingsModal;
