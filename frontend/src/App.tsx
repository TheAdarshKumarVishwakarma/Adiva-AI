import { useState, useEffect } from 'react';
import AIchat from './components/AIchat';
import { Button } from './components/ui/button';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import ProfileModal from './components/auth/ProfileModal';
import AdminSettingsModal from './components/admin/AdminSettingsModal';
import OAuthHandler from './components/OAuthHandler';
import AuthModal from './components/auth/AuthModal';
import {
  Bot,
  Settings2,
  Plus,
  Menu,
  X,
  Clock,
  Sparkles,
  BarChart3,
  User
} from 'lucide-react';

function AppContent() {
  const { isAuthenticated, isLoading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Add state for controlling panels directly
  const [showSettings, setShowSettings] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdminSettings, setShowAdminSettings] = useState(false);

  // Add state for sidebar theming
  const [sidebarThemeEnabled, setSidebarThemeEnabled] = useState(true);
  const [currentTheme, setCurrentTheme] = useState('ocean');

  // Theme data
  const availableThemes = [
    { id: 'ocean', primaryColor: '#3b82f6', secondaryColor: '#06b6d4', accentColor: '#60a5fa' },
    { id: 'indigo', primaryColor: '#6366f1', secondaryColor: '#8b5cf6', accentColor: '#06b6d4' },
    { id: 'blue', primaryColor: '#3b82f6', secondaryColor: '#06b6d4', accentColor: '#0ea5e9' },
    { id: 'green', primaryColor: '#10b981', secondaryColor: '#059669', accentColor: '#34d399' },
    { id: 'purple', primaryColor: '#8b5cf6', secondaryColor: '#ec4899', accentColor: '#a855f7' },
    { id: 'orange', primaryColor: '#f97316', secondaryColor: '#f59e0b', accentColor: '#fb923c' },
    { id: 'teal', primaryColor: '#14b8a6', secondaryColor: '#06b6d4', accentColor: '#5eead4' },
    { id: 'red', primaryColor: '#ef4444', secondaryColor: '#ec4899', accentColor: '#f87171' },
    { id: 'yellow', primaryColor: '#eab308', secondaryColor: '#f59e0b', accentColor: '#fbbf24' }
  ];

  // Get current theme colors
  const getCurrentTheme = () => {
    return availableThemes.find(t => t.id === currentTheme) || availableThemes[0];
  };

  // Callback functions for theme changes
  const handleSidebarThemeChange = (enabled: boolean) => {
    setSidebarThemeEnabled(enabled);
  };

  const handleThemeChange = (theme: string) => {
    setCurrentTheme(theme);
  };

  // Load sidebar theme preference from localStorage on mount
  useEffect(() => {
    try {
      const savedSidebarTheme = localStorage.getItem('chatAI_sidebarTheme');
      if (savedSidebarTheme !== null) {
        setSidebarThemeEnabled(savedSidebarTheme === 'true');
      }

      const savedTheme = localStorage.getItem('chatAI_theme');
      if (savedTheme && availableThemes.some(t => t.id === savedTheme)) {
        setCurrentTheme(savedTheme);
      }
    } catch { }
  }, []);

  // Close settings menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showSettingsMenu) {
        const target = event.target as HTMLElement;
        if (!target.closest('.settings-menu-container')) {
          setShowSettingsMenu(false);
        }
      }
    };

    if (showSettingsMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettingsMenu]);

  // Listen for auth-required events (guest limit, protected actions)
  useEffect(() => {
    const handleAuthRequired = () => {
      if (!isAuthenticated) {
        setAuthMode('login');
        setShowAuthPrompt(true);
      }
    };
    window.addEventListener('auth-required', handleAuthRequired);
    return () => window.removeEventListener('auth-required', handleAuthRequired);
  }, [isAuthenticated]);

  return (
    <div className="h-screen studio-shell flex overflow-hidden relative theme-ocean">
      {/* Enhanced Animated Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary particles */}
        {/* <div className="absolute top-1/4 left-1/4 w-3 h-3 bg-gradient-to-r from-indigo-400/40 to-purple-400/40 rounded-full animate-pulse" style={{ animationDelay: '0s' }}></div> */}
        {/* <div className="absolute top-1/3 right-1/3 w-2 h-2 bg-gradient-to-r from-purple-400/50 to-cyan-400/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div> */}
        {/* <div className="absolute bottom-1/4 left-1/3 w-2.5 h-2.5 bg-gradient-to-r from-cyan-400/45 to-indigo-400/45 rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute top-2/3 right-1/4 w-1.5 h-1.5 bg-gradient-to-r from-indigo-300/35 to-purple-300/35 rounded-full animate-pulse" style={{ animationDelay: '3s' }}></div>
        <div className="absolute bottom-1/3 left-1/2 w-2 h-2 bg-gradient-to-r from-purple-300/40 to-cyan-300/40 rounded-full animate-pulse" style={{ animationDelay: '4s' }}></div> */}

        {/* Additional floating elements */}
        <div className="absolute top-1/6 right-1/6 w-1 h-1 bg-blue-300/30 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-1/6 right-1/3 w-1.5 h-1.5 bg-cyan-300/35 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
        <div className="absolute top-3/4 left-1/6 w-1 h-1 bg-blue-400/30 rounded-full animate-pulse" style={{ animationDelay: '2.5s' }}></div>

        {/* Neural network lines */}
        <div className="absolute top-1/2 left-1/4 w-16 h-px bg-gradient-to-r from-transparent via-blue-400/20 to-transparent animate-pulse" style={{ animationDelay: '0.8s' }}></div>
        <div className="absolute top-1/3 right-1/4 w-12 h-px bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent animate-pulse" style={{ animationDelay: '1.8s' }}></div>
        <div className="absolute bottom-1/3 left-1/2 w-20 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent animate-pulse" style={{ animationDelay: '2.8s' }}></div>
      </div>

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[300px] sm:w-[340px] transform transition-all duration-500 ease-out sidebar-shell ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:relative lg:translate-x-0`}
        data-open={sidebarOpen ? 'true' : 'false'}
      >
        <div className="h-full p-3 sm:p-4">
          <div className="sidebar-float h-full rounded-3xl overflow-hidden flex">
            {/* Editor Rail */}
            <div className="sidebar-rail flex flex-col items-center py-5 gap-3">
              <button
                className="rail-btn"
                onClick={() => setSidebarOpen(false)}
              >
                <Bot className="h-5 w-5" />
              </button>
              <button
                className="rail-btn"
                data-tooltip="New Conversation"
                onClick={() => window.dispatchEvent(new CustomEvent('startNewChat'))}
              >
                <Plus className="h-5 w-5" />
              </button>
              {isAuthenticated && (
                <>
                  <button
                    className="rail-btn"
                    data-tooltip="Settings"
                    data-settings-toggle="true"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowSettings((prev) => {
                        const next = !prev;
                        if (next) {
                          setShowAnalytics(false);
                        }
                        return next;
                      });
                    }}
                  >
                    <Settings2 className="h-5 w-5" />
                  </button>
                  <button
                    className="rail-btn"
                    data-tooltip="Chat Analytics"
                    data-analytics-toggle="true"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowAnalytics((prev) => {
                        const next = !prev;
                        if (next) {
                          setShowSettings(false);
                        }
                        return next;
                      });
                    }}
                  >
                    <BarChart3 className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="rail-spacer" />
              <button
                className="rail-btn"
                data-tooltip="Profile"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!isAuthenticated) {
                    setAuthMode('login');
                    setShowAuthPrompt(true);
                  } else {
                    setShowProfile(true);
                  }
                }}
              >
                <User className="h-5 w-5" />
              </button>
            </div>

            {/* Sidebar Panel */}
            <div className="flex flex-col h-full flex-1 overflow-hidden">
              {/* Enhanced Header */}
              <div className="flex items-center justify-between px-5 pt-6 pb-4 border-b border-white/10 relative overflow-hidden">
            {/* Background gradient overlay */}
            <div
              className="absolute inset-0"
              style={sidebarThemeEnabled ? {
                background: `linear-gradient(to right, ${getCurrentTheme().primaryColor}05, ${getCurrentTheme().secondaryColor}05, ${getCurrentTheme().accentColor}05)`
              } : {
                background: 'linear-gradient(to right, #3b82f605, #06b6d405, #60a5fa05)'
              }}
            ></div>

            <div className="flex items-center space-x-3 relative z-10">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center ai-glow shadow-lg hover:shadow-xl transition-all duration-300 group"
                style={sidebarThemeEnabled ? {
                  background: `linear-gradient(135deg, ${getCurrentTheme().primaryColor}, ${getCurrentTheme().secondaryColor}, ${getCurrentTheme().accentColor})`
                } : {
                  background: 'linear-gradient(135deg, #3b82f6, #06b6d4, #60a5fa)'
                }}
              >
                <Bot className="h-7 w-7 text-white group-hover:scale-110 transition-transform duration-300" />
              </div>
              <div>
                <h1
                  className="font-bold text-xl"
                  style={sidebarThemeEnabled ? {
                    color: getCurrentTheme().primaryColor
                  } : {
                    color: '#3b82f6'
                  }}
                >
                  Adiva AI
                </h1>
                <p
                  className="text-sm"
                  style={sidebarThemeEnabled ? { color: getCurrentTheme().primaryColor } : { color: '#60a5fa' }}
                >
                  Intelligent Assistant
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden hover:text-white hover:bg-white/10 rounded-lg transition-all duration-300"
              style={sidebarThemeEnabled ? { color: getCurrentTheme().primaryColor } : { color: '#60a5fa' }}
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* New Chat Button */}
          <div className="px-5 pt-4 pb-2">
            <Button
              className="w-full text-white border-0 h-11 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-300 btn-ai group"
              style={sidebarThemeEnabled ? {
                background: `linear-gradient(135deg, ${getCurrentTheme().primaryColor}, ${getCurrentTheme().secondaryColor})`
              } : {
                background: 'linear-gradient(135deg, #3b82f6, #06b6d4)'
              }}
              onClick={() => {
                window.dispatchEvent(new CustomEvent('startNewChat'));
              }}
            >
              <Plus className="h-5 w-5 mr-3 group-hover:scale-110 transition-transform duration-300" />
              New Conversation
            </Button>
          </div>

          {/* Enhanced Quick Stats */}
          {/* <div className="px-6 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="glass-dark p-4 rounded-xl text-center border border-white/10 transition-all duration-300 hover:scale-105 group"
                style={sidebarThemeEnabled ? {
                  borderColor: `${getCurrentTheme().primaryColor}30`
                } : {}}
              >
                <div 
                  className="text-3xl font-bold transition-colors duration-300"
                  style={sidebarThemeEnabled ? { color: getCurrentTheme().accentColor } : { color: '#60a5fa' }}
                >
                  ∞
                </div>
                <div 
                  className="text-xs mt-1"
                  style={sidebarThemeEnabled ? { color: getCurrentTheme().primaryColor } : { color: '#60a5fa' }}
                >
                  AI Models
                </div>
                <div 
                  className="w-full h-1 rounded-full mt-2"
                  style={sidebarThemeEnabled ? {
                    background: `linear-gradient(to right, ${getCurrentTheme().accentColor}20, transparent)`
                  } : {
                    background: 'linear-gradient(to right, #60a5fa20, transparent)'
                  }}
                ></div>
              </div>
              <div 
                className="glass-dark p-4 rounded-xl text-center border border-white/10 transition-all duration-300 hover:scale-105 group"
                style={sidebarThemeEnabled ? {
                  borderColor: `${getCurrentTheme().secondaryColor}30`
                } : {}}
              >
                <div 
                  className="text-3xl font-bold transition-colors duration-300"
                  style={sidebarThemeEnabled ? { color: getCurrentTheme().secondaryColor } : { color: '#06b6d4' }}
                >
                  ⚡
                </div>
                <div 
                  className="text-xs mt-1"
                  style={sidebarThemeEnabled ? { color: getCurrentTheme().primaryColor } : { color: '#60a5fa' }}
                >
                  Real-time
                </div>
                <div 
                  className="w-full h-1 rounded-full mt-2"
                  style={sidebarThemeEnabled ? {
                    background: `linear-gradient(to right, ${getCurrentTheme().secondaryColor}20, transparent)`
                  } : {
                    background: 'linear-gradient(to right, #06b6d420, transparent)'
                  }}
                ></div>
              </div>
            </div>
          </div> */}

          {/* Chat History */}
          <div className="flex-1 overflow-y-auto overflow-x-visible px-5 py-4 space-y-4">
            <div className="flex items-center gap-3 text-base font-semibold mb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={sidebarThemeEnabled ? {
                  background: `linear-gradient(135deg, ${getCurrentTheme().primaryColor}20, ${getCurrentTheme().secondaryColor}20)`
                } : {
                  background: 'linear-gradient(135deg, #3b82f620, #06b6d420)'
                }}
              >
                <Clock
                  className="h-4 w-4"
                  style={sidebarThemeEnabled ? { color: getCurrentTheme().primaryColor } : { color: '#60a5fa' }}
                />
              </div>
              <span style={sidebarThemeEnabled ? { color: getCurrentTheme().primaryColor } : { color: '#60a5fa' }}>
                Recent Conversations
              </span>
            </div>
            <div id="recent-chats-container" className="space-y-3">
              {/* Recent chats will be dynamically inserted here */}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 pb-6 pt-2">
            <div className="h-px w-full bg-white/10" />
          </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden studio-canvas">
        {/* Top Bar with Mobile Menu */}
        <div className="glass-dark border-b border-white/10 p-4 lg:hidden">
          <Button
            variant="ghost"
            size="sm"
            className="hover:text-white hover:bg-white/10 rounded-lg"
            style={sidebarThemeEnabled ? { color: getCurrentTheme().primaryColor } : { color: '#60a5fa' }}
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </div>

        {/* Chat Area */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full max-w-6xl mx-auto px-2 sm:px-4">
            <AIchat
              showSettings={showSettings}
              setShowSettings={setShowSettings}
              showAnalytics={showAnalytics}
              setShowAnalytics={setShowAnalytics}
              onSidebarThemeChange={handleSidebarThemeChange}
              onThemeChange={handleThemeChange}
            />
          </div>
        </div>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Profile Modal */}
      <ProfileModal
        isOpen={showProfile}
        onClose={() => setShowProfile(false)}
        onOpenAdmin={() => {
          setShowProfile(false);
          setShowAdminSettings(true);
        }}
      />

      <AdminSettingsModal
        isOpen={showAdminSettings}
        onClose={() => setShowAdminSettings(false)}
      />

      {/* Auth Prompt */}
      <AuthModal
        isOpen={showAuthPrompt && !isAuthenticated && !isLoading}
        mode={authMode}
        onClose={() => setShowAuthPrompt(false)}
        onSwitchMode={(mode) => setAuthMode(mode)}
      />

      {/* Floating AI Elements */}
      {/* <div className="fixed top-20 right-8 z-30 pointer-events-none">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500/20 to-purple-500/20 rounded-full flex items-center justify-center float-animation border border-indigo-400/30">
          <Brain className="h-8 w-8 text-indigo-400" />
        </div>
      </div>
      
      <div className="fixed bottom-32 left-8 z-30 pointer-events-none">
        <div className="w-12 h-12 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-full flex items-center justify-center float-animation border border-cyan-400/30" style={{ animationDelay: '2s' }}>
          <Zap className="h-6 w-6 text-cyan-400" />
        </div>
      </div>

      <div className="fixed top-1/2 right-16 z-30 pointer-events-none">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/15 to-pink-500/15 rounded-full flex items-center justify-center float-animation border border-purple-400/30" style={{ animationDelay: '1s' }}>
          <Sparkles className="h-4 w-4 text-purple-400" />
        </div>
      </div>

      <div className="fixed bottom-1/3 left-16 z-30 pointer-events-none">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500/15 to-indigo-500/15 rounded-full flex items-center justify-center float-animation border border-blue-400/30" style={{ animationDelay: '3s' }}>
          <Cpu className="h-5 w-5 text-blue-400" />
        </div>
      </div> */}

    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <OAuthHandler />
      <AppContent />
    </AuthProvider>
  );
}

export default App;
