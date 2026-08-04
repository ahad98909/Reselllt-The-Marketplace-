import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { getImageUrl } from '../services/api';
import { 
  Search, Sun, Moon, MessageSquare, Bell, Heart, 
  User, LogOut, Menu, X, PlusCircle, ShieldAlert, Globe 
} from 'lucide-react';

export default function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { unreadNotificationsCount, notifications, markNotificationRead, clearNotifications, hasUnreadMessages } = useSocket();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [searchTerm, setSearchTerm] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User choice outcome: ${outcome}`);
    setDeferredPrompt(null);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    setLangDropdownOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 text-2xl font-extrabold tracking-tight text-brand-600 dark:text-brand-400">
            <span className="text-3xl">🛍️</span>
            <span className="hidden sm:inline font-sans">{t('app_name')}</span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* PWA Install Button */}
            {deferredPrompt && (
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-1.5 rounded-full bg-[#123c26] text-[#dbf1e5] hover:bg-[#0d5c3a] dark:bg-emerald-950 dark:text-emerald-300 dark:hover:bg-emerald-900 px-3.5 py-1.5 text-xs font-bold transition shadow-sm animate-pulse"
                title="Install app to your home screen"
              >
                📲 Install App
              </button>
            )}

            {/* Theme Toggle */}
            <button 
              onClick={toggleTheme} 
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </button>

            {/* Language Selector */}
            <div className="relative">
              <button 
                onClick={() => setLangDropdownOpen(!langDropdownOpen)} 
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <Globe className="h-5 w-5" />
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-32 rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-800 dark:bg-slate-900">
                  <button onClick={() => changeLanguage('en')} className="flex w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">English</button>
                  <button onClick={() => changeLanguage('es')} className="flex w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800">Español</button>
                </div>
              )}
            </div>

            {isAuthenticated ? (
              <>
                {/* Favorites */}
                <Link 
                  to="/favorites" 
                  className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  title={t('favorites')}
                >
                  <Heart className="h-5 w-5" />
                </Link>

                {/* Chat link */}
                <Link 
                  to="/chat" 
                  className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  title={t('chat')}
                >
                  <MessageSquare className="h-5 w-5" />
                  {hasUnreadMessages && (
                    <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                  )}
                </Link>

                {/* Notifications */}
                <div className="relative">
                  <button 
                    onClick={() => setNotifDropdownOpen(!notifDropdownOpen)}
                    className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    <Bell className="h-5 w-5" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute right-1 top-1 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                        {unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {/* Notifications Dropdown */}
                  {notifDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                        <span className="font-semibold text-sm">Notifications</span>
                        <button onClick={clearNotifications} className="text-xs text-brand-600 hover:underline dark:text-brand-400">Mark all read</button>
                      </div>
                      <div className="max-h-64 overflow-y-auto py-1">
                        {notifications.length === 0 ? (
                          <div className="py-4 text-center text-xs text-slate-400">No new alerts.</div>
                        ) : (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              onClick={() => markNotificationRead(n.id)}
                              className={`flex flex-col rounded-lg px-3 py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-850 cursor-pointer ${!n.is_read ? 'bg-brand-50/50 dark:bg-brand-900/10' : ''}`}
                            >
                              <span>{n.content}</span>
                              <span className="mt-1 text-[9px] text-slate-400">{new Date(n.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Admin Icon (conditional) */}
                {user?.is_admin && (
                  <Link 
                    to="/admin" 
                    className="rounded-full p-2 text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                    title={t('admin')}
                  >
                    <ShieldAlert className="h-5 w-5" />
                  </Link>
                )}

                {/* Profile Link */}
                <Link to="/profile" className="flex items-center gap-2 rounded-full border border-slate-200 p-1 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-850">
                  <img src={getImageUrl(user?.profile_picture, 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150')} alt="Avatar" className="h-7 w-7 rounded-full object-cover" />
                  <span className="hidden lg:inline text-xs font-semibold pr-2">{user?.name}</span>
                </Link>

                {/* Sell Button */}
                <Link 
                  to="/sell" 
                  className="hidden sm:flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 hover:shadow-lg dark:bg-brand-500 dark:hover:bg-brand-600"
                >
                  <PlusCircle className="h-4.5 w-4.5" />
                  {t('sell')}
                </Link>

                {/* Logout Button */}
                <button 
                  onClick={logout}
                  className="rounded-full p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
                  title={t('logout')}
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-brand-600 dark:text-slate-300 dark:hover:text-brand-400">
                  {t('login')}
                </Link>
                <Link to="/register" className="rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600">
                  {t('register')}
                </Link>
              </>
            )}

            {/* Mobile Menu Button */}
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
              className="rounded-full p-2 text-slate-500 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-850"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 md:hidden dark:border-slate-800 dark:bg-slate-900">
          {isAuthenticated ? (
            <div className="flex flex-col gap-2 font-semibold">
              <Link to="/sell" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm bg-brand-50 text-brand-600 dark:bg-brand-900/20 dark:text-brand-400">
                <PlusCircle className="h-5 w-5" /> {t('sell')}
              </Link>
              <Link to="/chat" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <MessageSquare className="h-5 w-5" /> {t('chat')}
              </Link>
              <Link to="/favorites" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <Heart className="h-5 w-5" /> {t('favorites')}
              </Link>
              <Link to="/profile" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">
                <User className="h-5 w-5" /> {t('profile')}
              </Link>
              {user?.is_admin && (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 text-amber-500">
                  <ShieldAlert className="h-5 w-5" /> {t('admin')}
                </Link>
              )}
              <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20">
                <LogOut className="h-5 w-5" /> {t('logout')}
              </button>
              {deferredPrompt && (
                <button
                  onClick={() => { handleInstallApp(); setMobileMenuOpen(false); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-[#123c26] bg-[#dbf1e5] hover:bg-emerald-200 font-bold dark:bg-emerald-950/40 dark:text-emerald-300 transition animate-pulse"
                >
                  📲 Install App
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2 font-semibold">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-center text-sm border border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-855">{t('login')}</Link>
              <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="rounded-lg px-3 py-2 text-center text-sm bg-brand-600 text-white hover:bg-brand-700">{t('register')}</Link>
              {deferredPrompt && (
                <button
                  onClick={() => { handleInstallApp(); setMobileMenuOpen(false); }}
                  className="w-full rounded-lg px-3 py-2 text-center text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 transition animate-pulse"
                >
                  📲 Install App
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}
