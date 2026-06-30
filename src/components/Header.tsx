import React, { useState } from 'react';
import { Shield, MapPin, Award, User, RefreshCw, BarChart3, AlertCircle, Sparkles, HelpCircle, LogOut, ShieldAlert, ShieldCheck, Menu, X, Compass, Smartphone } from 'lucide-react';
import { UserRole } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { Language } from '../lib/i18n';

interface HeaderProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  userPoints: number;
  userBadges: string[];
  onSignOut?: () => void;
  userProfile?: any;
  isMockLogin?: boolean;
}

export default function Header({
  currentTab,
  setCurrentTab,
  userRole,
  setUserRole,
  userPoints,
  userBadges,
  onSignOut,
  userProfile,
  isMockLogin = true
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { language, setLanguage, t } = useLanguage();

  return (
    <>
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-100/85 shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16 items-center">
          {/* Logo & Hamburger Menu Button for mobile */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setIsOpen(true)}
              className="md:hidden p-2 -ml-1 text-slate-700 hover:text-slate-950 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div 
              className="flex items-center space-x-2 sm:space-x-2.5 cursor-pointer group shrink-0" 
              onClick={() => setCurrentTab('map')}
            >
            <motion.div 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="bg-emerald-600 text-white p-1.5 sm:p-2 rounded-xl shadow-md shadow-emerald-600/15 flex items-center justify-center transition-all group-hover:shadow-emerald-600/25"
            >
              <Shield className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </motion.div>
            <div>
              <div className="flex items-center space-x-1 sm:space-x-1.5">
                <h1 className="text-xs xs:text-sm sm:text-base font-black tracking-tight text-slate-900 font-sans">
                  Community<span className="text-emerald-600">Guard</span>
                </h1>
              </div>
              <p className="text-[7.5px] sm:text-[8.5px] text-slate-400 font-mono tracking-wider font-bold uppercase hidden md:block">
                {t('subtitle_tactical', 'Your Voice Fixes Your City')}
              </p>
            </div>
          </div>
        </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden md:flex items-center space-x-1 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/40">
            {[
              { id: 'map', label: userRole === 'citizen' ? t('dashboard', 'Dashboard') : t('live_heatmap', 'Live Heatmap'), icon: MapPin },
              ...(userRole === 'citizen' ? [{ id: 'heatmap', label: t('safe_navigation', 'Safe Navigation'), icon: Compass }] : []),
              { id: 'report', label: t('report_hazard', 'Report Hazard'), icon: AlertCircle },
              { id: 'analytics', label: t('sla_dashboard', 'SLA Dashboard'), icon: BarChart3 },
              { id: 'profile', label: t('my_impact', 'My Impact'), icon: Award },
              { id: 'showcase', label: t('civic_audit', 'Civic Audit'), icon: ShieldCheck },
              { id: 'terminal', label: t('command_deck', 'Command Deck'), icon: Smartphone },
            ].filter(tab => {
              if (userRole === 'officer' || userRole === 'admin') {
                return tab.id !== 'report' && tab.id !== 'profile';
              }
              return true;
            }).map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`nav-${tab.id}`}
                  onClick={() => setCurrentTab(tab.id)}
                  className={`relative px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isActive
                      ? 'text-emerald-700 font-extrabold'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabPill"
                      className="absolute inset-0 bg-white rounded-xl shadow-xs border border-slate-200/50"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <span className="relative z-10 flex items-center space-x-1.5">
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </span>
                </button>
              );
            })}

            {userRole !== 'citizen' && (
              <button
                id="nav-officer"
                onClick={() => setCurrentTab('officer')}
                className={`relative px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                  currentTab === 'officer'
                    ? 'text-amber-700 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                {currentTab === 'officer' && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-amber-500/10 rounded-xl shadow-xs border border-amber-500/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center space-x-1.5">
                  <Shield className={`w-3.5 h-3.5 ${currentTab === 'officer' ? 'text-amber-600' : 'text-slate-400'}`} />
                  <span>{t('officer_console', 'Officer Console')}</span>
                </span>
              </button>
            )}

            {userRole === 'admin' && (
              <button
                id="nav-admin"
                onClick={() => setCurrentTab('admin')}
                className={`relative px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                  currentTab === 'admin'
                    ? 'text-rose-700 font-extrabold'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50/50'
                }`}
              >
                {currentTab === 'admin' && (
                  <motion.div
                    layoutId="activeTabPill"
                    className="absolute inset-0 bg-rose-500/10 rounded-xl shadow-xs border border-rose-500/20"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center space-x-1.5">
                  <ShieldAlert className={`w-3.5 h-3.5 ${currentTab === 'admin' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <span>{t('admin_console', 'Admin Console')}</span>
                </span>
              </button>
            )}
          </nav>

          {/* Right Section: Unified Profile Dropdown Trigger */}
          <div className="flex items-center space-x-2 shrink-0 relative">
            <button
              id="profile-dropdown-trigger"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center space-x-2 p-1 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer shadow-2xs select-none focus:outline-none"
            >
              <div className="relative">
                <img
                  src={userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.id || 'guest'}`}
                  alt={userProfile?.name || 'User'}
                  referrerPolicy="no-referrer"
                  className={`w-7 h-7 sm:w-8 h-8 rounded-xl object-cover border bg-white ${
                    userRole === 'admin' 
                      ? 'border-rose-500' 
                      : userRole === 'officer' 
                        ? 'border-amber-500' 
                        : 'border-emerald-500'
                  }`}
                />
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                  userRole === 'admin' 
                    ? 'bg-rose-500 animate-pulse' 
                    : userRole === 'officer' 
                      ? 'bg-amber-500' 
                      : 'bg-emerald-500'
                }`} />
              </div>
              <div className="hidden sm:flex flex-col text-left pr-1 max-w-[100px]">
                <span className="text-[10px] font-extrabold text-slate-800 truncate leading-tight">
                  {userProfile?.name?.split(' ')[0] || 'Member'}
                </span>
                <span className="text-[7.5px] font-extrabold text-slate-400 uppercase font-mono tracking-wider">
                  {userRole}
                </span>
              </div>
            </button>

            {/* Desktop Profile Dropdown Dropdown */}
            <AnimatePresence>
              {isProfileOpen && (
                <>
                  <div 
                    className="fixed inset-0 z-40 cursor-default" 
                    onClick={() => setIsProfileOpen(false)} 
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-full mt-2.5 w-80 bg-white border border-slate-200 shadow-xl rounded-3xl p-5 z-50 text-left space-y-4"
                  >
                    {/* User Identity Header Card */}
                    <div className="flex items-center space-x-3 pb-3.5 border-b border-slate-100">
                      <img
                        src={userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.id || 'guest'}`}
                        alt={userProfile?.name || 'User'}
                        referrerPolicy="no-referrer"
                        className="w-12 h-12 rounded-2xl object-cover bg-slate-50 border border-slate-100"
                      />
                      <div className="text-left flex-1 min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate leading-tight flex items-center gap-1">
                          <span>{userProfile?.name || 'Anonymous User'}</span>
                          {userRole === 'admin' && <ShieldAlert className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
                          {userRole === 'officer' && <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
                          {userRole === 'citizen' && <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                        </h4>
                        <p className="text-[10px] text-slate-400 font-mono truncate">{userProfile?.email || 'municipal.member@civicguard.gov.in'}</p>
                        <span className={`inline-block text-[8px] font-mono font-black uppercase px-2 py-0.5 rounded-md mt-1.5 border ${
                          userRole === 'admin' 
                            ? 'bg-rose-50 text-rose-700 border-rose-100' 
                            : userRole === 'officer' 
                              ? 'bg-amber-50 text-amber-700 border-amber-100' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        }`}>
                          {userRole === 'admin' 
                            ? '🛡️ System Admin' 
                            : userRole === 'officer' 
                              ? '💼 Municipal Officer' 
                              : '🌱 Verified Citizen'}
                        </span>
                      </div>
                    </div>

                    {/* Civic Rewards & Impact - ONLY for Citizen */}
                    {userRole === 'citizen' && (
                      <div className="py-3 px-4 bg-slate-50 rounded-2xl border border-slate-200/50 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-black text-slate-500 tracking-wider font-mono uppercase">
                            CIVIC INFLUENCE
                          </span>
                          <span className="text-xs font-black text-amber-600 font-mono flex items-center gap-0.5">
                            <Award className="w-3 h-3 text-amber-500 fill-amber-500" />
                            {userPoints} XP
                          </span>
                        </div>

                        {/* Progress Meter */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-mono font-black text-slate-400 uppercase">
                            <span>Level {Math.floor(userPoints / 500) + 1}</span>
                            <span>{((Math.floor(userPoints / 500) + 1) * 500)} XP</span>
                          </div>
                          <div className="w-full bg-slate-200/60 rounded-full h-1 overflow-hidden">
                            <div 
                              className="bg-amber-500 h-full rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, ((userPoints % 500) / 500) * 100)}%` }}
                            />
                          </div>
                          <p className="text-[8px] text-slate-400 font-bold leading-normal">
                            Earn XP by submitting verifications and reporting street hazards.
                          </p>
                        </div>

                        {/* Quests */}
                        <div className="pt-1 space-y-1">
                          <span className="text-[8px] font-black text-slate-400 font-mono tracking-wider uppercase block">
                            ACTIVE QUESTS
                          </span>
                          {[
                            { name: 'Report 1 Hazard', done: (userProfile?.stats?.issuesReported || 0) > 0, xp: '+100' },
                            { name: 'Upvote Community Feed', done: (userProfile?.stats?.verifications || 0) > 0, xp: '+10' },
                            { name: 'Complete 1 Resolution', done: (userProfile?.stats?.issuesResolved || 0) > 0, xp: '+200' },
                          ].map((q, idx) => (
                            <div key={idx} className="flex items-center justify-between text-[9px] bg-white px-2 py-1.5 rounded-lg border border-slate-100">
                              <span className="text-slate-600 font-bold flex items-center space-x-1">
                                <span className={q.done ? 'text-emerald-500 font-extrabold' : 'text-slate-300 font-bold'}>
                                  {q.done ? '✓' : '○'}
                                </span>
                                <span className={q.done ? 'line-through text-slate-400 font-medium' : ''}>{q.name}</span>
                              </span>
                              <span className="text-[8px] font-extrabold text-amber-600 font-mono">{q.xp}</span>
                            </div>
                          ))}
                        </div>

                        {/* Redeem Points Option */}
                        <button
                          onClick={() => {
                            setIsProfileOpen(false);
                            setCurrentTab('profile'); // My Impact page contains rewards redemption
                          }}
                          className="w-full mt-2.5 bg-amber-500 hover:bg-amber-600 active:scale-98 text-white text-[10px] font-black tracking-wide py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1 border border-amber-600 shadow-sm"
                        >
                          <Award className="w-3.5 h-3.5 fill-white" />
                          <span>{t('redeem_xp', 'REDEEM XP POINTS')}</span>
                        </button>
                      </div>
                    )}

                    {/* Language Selection inside Profile Popup */}
                    <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                      <span className="text-[8px] font-black text-slate-400 font-mono tracking-wider uppercase block">
                        {t('select_language', 'REGIONAL LANGUAGE')}
                      </span>
                      <div className="flex items-center space-x-2 bg-slate-50 p-2 rounded-xl border border-slate-200/60 shadow-2xs">
                        <span className="text-xs text-slate-500 font-bold shrink-0">🌐</span>
                        <select
                          value={language}
                          onChange={(e) => setLanguage(e.target.value as Language)}
                          className="bg-transparent border-none text-[11px] font-bold text-slate-700 font-sans focus:outline-none cursor-pointer w-full"
                          title="Select Regional Language"
                        >
                          <option value="en">English</option>
                          <option value="hi">हिन्दी</option>
                          <option value="te">తెలుగు</option>
                          <option value="ta">தமிழ்</option>
                          <option value="kn">ಕನ್ನಡ</option>
                          <option value="bn">বাংলা</option>
                        </select>
                      </div>
                    </div>

                    {/* Switch Simulation View */}
                    {isMockLogin && (
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                        <div className="flex items-center justify-between">
                          <span className="text-[8px] font-black text-slate-400 font-mono tracking-wider uppercase block">
                            Switch View (Demo)
                          </span>
                          <span className="bg-amber-50 text-amber-700 text-[7px] font-mono font-black px-1 rounded border border-amber-100 flex items-center space-x-0.5">
                            <span>Demo Mode</span>
                            <Sparkles className="w-2 h-2 text-amber-500 fill-amber-500 animate-pulse" />
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {(['citizen', 'officer', 'admin'] as const).map(role => {
                            const isSelected = userRole === role;
                            return (
                              <button
                                key={role}
                                onClick={() => {
                                  setUserRole(role);
                                  setIsProfileOpen(false);
                                  if (role === 'officer') {
                                    setCurrentTab('officer');
                                  } else if (role === 'admin') {
                                    setCurrentTab('admin');
                                  } else {
                                    setCurrentTab('map');
                                  }
                                }}
                                className={`py-1 rounded-lg text-[9px] font-black uppercase font-mono tracking-wide border cursor-pointer text-center transition-all ${
                                  isSelected
                                    ? 'bg-slate-900 border-slate-950 text-white shadow-xs font-black'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                {role}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Google Sign Out */}
                    {onSignOut && (
                      <button
                        onClick={() => {
                          setIsProfileOpen(false);
                          onSignOut();
                        }}
                        className="w-full flex items-center justify-center space-x-1.5 py-2 mt-1 bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-xl transition-all cursor-pointer text-[10px] font-black border border-slate-200 hover:border-rose-100 font-mono"
                      >
                        <LogOut className="w-3 h-3" />
                        <span>Sign Out Municipal Portal</span>
                      </button>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>

    {/* Mobile navigation sidebar (Left Side Slide-out Drawer) */}
    <AnimatePresence>
      {isOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="md:hidden fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-[110]"
            />

            {/* Sidebar Drawer Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="md:hidden fixed top-0 left-0 bottom-0 w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 text-white z-[120] flex flex-col justify-between shadow-2xl p-6 overflow-y-auto"
            >
              {/* Top section: Brand & Close button */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="bg-emerald-600 text-white p-2 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-600/10">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-sm font-black tracking-tight text-white">
                        Community<span className="text-emerald-400">Guard</span>
                      </h2>
                      <p className="text-[8px] text-slate-400 font-mono tracking-wider font-bold uppercase">
                        {t('subtitle_tactical', 'Your Voice Fixes Your City')}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    aria-label="Close menu"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* User Info Header inside Mobile Drawer */}
                <div className="flex items-center space-x-3 p-3 bg-slate-800/40 border border-slate-800 rounded-xl">
                  <img
                    src={userProfile?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile?.id || 'guest'}`}
                    alt="avatar"
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-xl border border-slate-700 object-cover bg-white"
                  />
                  <div className="text-left min-w-0 flex-1">
                    <h3 className="text-xs font-black text-white truncate leading-tight">{userProfile?.name || 'Anonymous User'}</h3>
                    <p className="text-[9px] text-slate-400 font-mono truncate">{userProfile?.email || 'municipal.member@civicguard.gov.in'}</p>
                    <span className="text-[7.5px] font-black font-mono tracking-widest uppercase text-emerald-400 mt-1 block">
                      ROLE: {userRole}
                    </span>
                  </div>
                </div>

                {/* Gamification Stats inside drawer - ONLY FOR CITIZENS */}
                {userRole === 'citizen' && (
                  <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-xl flex items-center space-x-3 shadow-xs">
                    <div className="bg-amber-400 p-2 rounded-lg">
                      <Award className="w-4 h-4 text-slate-950 fill-slate-950" />
                    </div>
                    <div className="text-left">
                      <span className="text-[9px] font-black text-amber-400 block tracking-wider font-mono uppercase">MY BALANCE</span>
                      <span className="text-sm font-extrabold text-white font-mono">{userPoints} XP</span>
                    </div>
                  </div>
                )}

                {/* Mobile Navigation Links */}
                <nav className="flex flex-col space-y-1">
                  {[
                    { id: 'map', label: userRole === 'citizen' ? 'Dashboard' : 'Live Heatmap', icon: MapPin },
                    ...(userRole === 'citizen' ? [{ id: 'heatmap', label: 'Safe Navigation', icon: Compass }] : []),
                    { id: 'report', label: 'Report Hazard', icon: AlertCircle },
                    { id: 'analytics', label: 'SLA Dashboard', icon: BarChart3 },
                    { id: 'profile', label: 'My Impact', icon: Award },
                    { id: 'showcase', label: 'Civic Audit', icon: ShieldCheck },
                    { id: 'terminal', label: 'Command Deck', icon: Smartphone },
                  ].filter(tab => {
                    if (userRole === 'officer' || userRole === 'admin') {
                      return tab.id !== 'report' && tab.id !== 'profile';
                    }
                    return true;
                  }).map((tab) => {
                    const Icon = tab.icon;
                    const isActive = currentTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setCurrentTab(tab.id);
                          setIsOpen(false);
                        }}
                        className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          isActive
                            ? 'bg-emerald-600 text-white font-black'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}

                  {userRole !== 'citizen' && (
                    <button
                      onClick={() => {
                        setCurrentTab('officer');
                        setIsOpen(false);
                      }}
                      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === 'officer'
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <Shield className={`w-4 h-4 ${currentTab === 'officer' ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span>Officer Console</span>
                    </button>
                  )}

                  {userRole === 'admin' && (
                    <button
                      onClick={() => {
                        setCurrentTab('admin');
                        setIsOpen(false);
                      }}
                      className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        currentTab === 'admin'
                          ? 'bg-rose-500 text-white font-black'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <ShieldAlert className={`w-4 h-4 ${currentTab === 'admin' ? 'text-white' : 'text-slate-400'}`} />
                      <span>Admin Console</span>
                    </button>
                  )}
                </nav>
              </div>

              {/* Bottom section: Role toggle & Sign out */}
              <div className="space-y-4 border-t border-slate-800 pt-6">
                {isMockLogin && (
                  <div className="flex flex-col space-y-2">
                    <span className="text-[9px] text-slate-400 font-bold tracking-wider font-mono uppercase">SWITCH SIMULATION VIEW</span>
                    <div className="flex items-center space-x-2 bg-slate-800 p-2 rounded-xl border border-slate-700/60">
                      <select
                        value={userRole}
                        onChange={(e) => {
                          const newRole = e.target.value as UserRole;
                          setUserRole(newRole);
                          if (newRole === 'officer') {
                            setCurrentTab('officer');
                          } else if (currentTab === 'officer') {
                            setCurrentTab('map');
                          }
                          setIsOpen(false);
                        }}
                        className="bg-transparent text-white border-none w-full text-xs font-bold font-mono focus:outline-none cursor-pointer"
                      >
                        <option value="citizen" className="bg-slate-950 text-white">Citizen View</option>
                        <option value="officer" className="bg-slate-950 text-white">Officer View</option>
                        <option value="admin" className="bg-slate-950 text-white">Admin View</option>
                      </select>
                    </div>
                  </div>
                )}

                {onSignOut && (
                  <button
                    onClick={() => {
                      onSignOut();
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-slate-800 hover:bg-rose-950/50 hover:text-rose-400 text-slate-300 rounded-xl transition-all cursor-pointer text-xs font-bold border border-slate-700 hover:border-rose-900/50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out Account</span>
                  </button>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

