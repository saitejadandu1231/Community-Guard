import React, { useState, useEffect } from 'react';
import { Smartphone, X, Download, Share2, Sparkles, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from './LanguageContext';

export default function PwaInstallBanner() {
  const { language, t } = useLanguage();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    // 1. Check if the app is already running as standalone (installed)
    const checkIsStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (navigator as any).standalone === true;
    
    setIsStandalone(checkIsStandalone);

    // 2. Check if the user already dismissed the banner in the current browser session
    const isDismissed = sessionStorage.getItem('pwa-install-dismissed') === 'true';

    // 3. Detect if the user is on an iOS device (Safari doesn't support beforeinstallprompt, needs manual flow)
    const checkIsIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    setIsIOS(checkIsIOS);

    if (checkIsStandalone) {
      return; // Already installed, no need to show install banner
    }

    if (isDismissed) {
      return; // Dismissed in this session, keep hidden
    }

    // 4. Handle Android/Chrome/Desktop beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowBanner(true);
    };

    // 5. Detect if already installed successfully
    const handleAppInstalled = () => {
      setInstallSuccess(true);
      setShowBanner(false);
      setDeferredPrompt(null);
      setTimeout(() => setInstallSuccess(false), 5000); // clear success banner after 5s
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // For iOS users, we show the banner after a small delay since there's no native event trigger
    if (checkIsIOS && !isDismissed) {
      const timer = setTimeout(() => {
        setShowBanner(true);
      }, 3000); // show 3 seconds after loading
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the browser install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response to install prompt: ${outcome}`);

    // Clear the deferred prompt variable so it can only be used once
    setDeferredPrompt(null);
    setShowBanner(false);
  };

  const handleDismiss = () => {
    // Hide the banner and persist dismissal in sessionStorage for the browser session
    setShowBanner(false);
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (installSuccess) {
    return (
      <div className="bg-emerald-600 text-white py-3.5 px-4 font-mono text-xs flex items-center justify-center space-x-2 animate-fadeIn z-50">
        <CheckCircle className="w-4 h-4 text-white animate-bounce" />
        <span className="font-bold">CommunityGuard successfully added to your home screen! Offline capabilities enabled.</span>
      </div>
    );
  }

  if (!showBanner || isStandalone) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        className="w-full bg-slate-900 border-b border-emerald-500/20 text-white relative overflow-hidden z-40 shadow-xl"
      >
        {/* Futuristic glowing backdrop */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-600/15 via-blue-600/5 to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-start sm:items-center space-x-3.5">
            <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/30 shrink-0 text-emerald-400">
              <Smartphone className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider font-mono">
                  PWA Install Available
                </span>
                <span className="text-[10px] text-emerald-400 font-mono flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Offline Ready</span>
                </span>
              </div>
              <p className="text-xs text-slate-300 font-sans leading-relaxed">
                Install <span className="font-bold text-white">CommunityGuard</span> for direct home-screen access, full-screen immersive reporting, and ultra-fast offline page load!
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0">
            {isIOS ? (
              <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-xl py-1.5 px-3 space-x-2 text-[11px] font-medium text-slate-300">
                <Share2 className="w-3.5 h-3.5 text-blue-400" />
                <span>Tap <span className="font-bold text-white">"Share"</span> then <span className="font-bold text-emerald-400">"Add to Home Screen"</span></span>
              </div>
            ) : (
              <button
                onClick={handleInstallClick}
                disabled={!deferredPrompt}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-2 px-4 rounded-xl flex items-center space-x-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Install App</span>
              </button>
            )}

            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-slate-800/60 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Dismiss for this session"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
