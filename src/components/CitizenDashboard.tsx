import React, { useState, useEffect } from 'react';
import { 
  AlertCircle, ArrowRight, Award, CheckCircle2, Clock, 
  Compass, Eye, Filter, MapPin, MessageSquare, Search, 
  ShieldAlert, ShieldCheck, Sparkles, ThumbsUp, ThumbsDown,
  Navigation, RefreshCw, Layers, Volume2
} from 'lucide-react';
import { Issue, IssueCategory, IssueSeverity } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, AdvancedMarker } from '@vis.gl/react-google-maps';
import { useLanguage } from './LanguageContext';

// Fetch API Key safely
const API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidKey = true;

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#64748b" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#10b981" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#020617" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#10b981" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#1e293b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#0f172a" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#475569" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#334155" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#1e293b" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#cbd5e1" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#172554" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3b82f6" }] },
  { featureType: "water", elementType: "labels.text.stroke", stylers: [{ color: "#020617" }] },
];

export const INDIAN_HUBS = [
  { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
  { name: 'New Delhi', lat: 28.6139, lng: 77.2090, state: 'Delhi NCR' },
  { name: 'Mumbai', lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
  { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
  { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
  { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
  { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
  { name: 'Nagpur', lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
];

interface CitizenDashboardProps {
  issues: Issue[];
  onVote: (issueId: string, type: 'up' | 'down') => void;
  onAddComment: (issueId: string, commentText: string) => void;
  userPoints: number;
  userBadges: string[];
  setCurrentTab: (tab: string) => void;
  selectedIssueId?: string | null;
  onSelectIssueId?: (issueId: string | null) => void;
  userId?: string;
}

export default function CitizenDashboard({
  issues,
  onVote,
  onAddComment,
  userPoints,
  userBadges,
  setCurrentTab,
  selectedIssueId: propSelectedIssueId,
  onSelectIssueId: propOnSelectIssueId,
  userId
}: CitizenDashboardProps) {
  const { language, t } = useLanguage();
  // Proximity location center
  const [userLocation, setUserLocation] = useState({ lat: 17.4085, lng: 78.4725 });
  const [isLocating, setIsLocating] = useState(false);
  const [radiusFilter, setRadiusFilter] = useState<number>(2); // Default 2 km
  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | 'all'>('all');
  const [ignoreRadius, setIgnoreRadius] = useState(false);
  
  // Independent map movement viewport state so citizens can pan and zoom freely!
  const [mapCenter, setMapCenter] = useState({ lat: 17.4085, lng: 78.4725 });
  const [mapZoom, setMapZoom] = useState(14);

  // Sync map center viewport whenever actual userLocation anchor changes
  useEffect(() => {
    setMapCenter(userLocation);
  }, [userLocation]);
  
  const [localSelectedIssueId, setLocalSelectedIssueId] = useState<string | null>(null);
  const selectedIssueId = propSelectedIssueId !== undefined ? propSelectedIssueId : localSelectedIssueId;
  const setSelectedIssueId = propOnSelectIssueId !== undefined ? propOnSelectIssueId : setLocalSelectedIssueId;

  const [commentInput, setCommentInput] = useState('');
  const [mapEngine, setMapEngine] = useState<'vector' | 'google'>('google');
  const [searchQuery, setSearchQuery] = useState('');

  // Haversine distance formula
  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Earth's radius
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // Attempt user geolocation automatically
  useEffect(() => {
    detectLocation(false);
  }, []);

  const detectLocation = (showNotification = true) => {
    setIsLocating(true);

    const fallbackToIp = () => {
      fetch('https://ipapi.co/json/')
        .then(res => {
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            return res.json();
          }
          throw new Error(`HTTP error ${res.status} or not JSON`);
        })
        .then(data => {
          if (data && data.latitude && data.longitude) {
            setUserLocation({
              lat: data.latitude,
              lng: data.longitude
            });
          } else {
            setUserLocation({ lat: 28.6139, lng: 77.2090 }); // default to New Delhi
          }
          setIsLocating(false);
        })
        .catch(err => {
          console.warn("IP Geolocation fallback failed, using city center default:", err);
          setUserLocation({ lat: 28.6139, lng: 77.2090 }); // default to New Delhi
          setIsLocating(false);
        });
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setIsLocating(false);
        },
        (error) => {
          console.warn("Geolocation failed, using IP geolocation lookup...", error);
          fallbackToIp();
        },
        { enableHighAccuracy: false, timeout: 5000 }
      );
    } else {
      fallbackToIp();
    }
  };

  // Process issues filtering & calculate distance for each
  const issuesWithProximity = issues.map(issue => {
    let distance = 999;
    if (issue.location && issue.location.latitude && issue.location.longitude) {
      distance = getDistanceInKm(
        userLocation.lat,
        userLocation.lng,
        issue.location.latitude,
        issue.location.longitude
      );
    }
    return { ...issue, distance };
  });

  // Filter based on 1-2km (or selected radius) and criteria
  const nearbyIssues = issuesWithProximity.filter(issue => {
    // Radius check
    if (!ignoreRadius && issue.distance > radiusFilter) return false;
    
    // Category check
    if (selectedCategory !== 'all' && issue.category !== selectedCategory) return false;

    // Search filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchDesc = issue.description.toLowerCase().includes(q);
      const matchAddr = issue.address.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchAddr;
    }
    return true;
  }).sort((a, b) => a.distance - b.distance); // Show closest first!

  // Active selected issue details
  const currentSelectedIssue = issues.find(i => i.id === selectedIssueId) || nearbyIssues[0] || issues[0];

  useEffect(() => {
    if (currentSelectedIssue && !selectedIssueId) {
      setSelectedIssueId(currentSelectedIssue.id);
    }
  }, [currentSelectedIssue, selectedIssueId]);

  // Resolved list for bottom feed (Live resolved feed)
  const resolvedIssues = issues
    .filter(i => i.status === 'resolved')
    .sort((a, b) => {
      const dateA = a.timeline.resolvedAt || a.timeline.reportedAt;
      const dateB = b.timeline.resolvedAt || b.timeline.reportedAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });

  const getCategoryEmoji = (cat: IssueCategory) => {
    switch (cat) {
      case 'pothole': return '🚧';
      case 'water': return '💧';
      case 'light': return '💡';
      case 'garbage': return '🗑️';
      case 'traffic': return '🚦';
      case 'drainage': return '🌀';
      default: return '📍';
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'high': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !currentSelectedIssue) return;
    onAddComment(currentSelectedIssue.id, commentInput);
    setCommentInput('');
  };

  // Grid coordinates mapping for Vector fallback map
  const getGridCoords = (lat: number, lng: number) => {
    const latDiff = lat - (userLocation.lat - 0.015);
    const lngDiff = lng - (userLocation.lng - 0.015);
    const y = 100 - Math.min(Math.max((latDiff / 0.03) * 100, 5), 95);
    const x = Math.min(Math.max((lngDiff / 0.03) * 100, 5), 95);
    return { x, y };
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5 font-sans text-slate-800">
      
      {/* ========================================== */}
      {/* 1. THE HERO ACTION (Top Panel)            */}
      {/* ========================================== */}
      <div className="relative overflow-hidden rounded-[24px] bg-slate-950 text-white border border-slate-800 shadow-xl p-5 md:p-7 flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6">
        {/* Abstract cybernetic backdrop decoration */}
        <div className="absolute inset-0 grid grid-cols-12 grid-rows-6 opacity-[0.03] pointer-events-none">
          {Array.from({ length: 72 }).map((_, i) => (
            <div key={i} className="border-t border-l border-emerald-500" />
          ))}
        </div>
        <div className="absolute -top-40 -left-4 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-4 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3 max-w-2xl text-center md:text-left">
          <div className="inline-flex items-center space-x-2 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <Compass className="w-3.5 h-3.5" />
            <span className="text-[9px] font-black font-mono uppercase tracking-widest">{t('real_time_civic_ledger', 'REAL-TIME CIVIC LEDGER')}</span>
          </div>
          
          <h1 className="text-xl md:text-2xl lg:text-3xl font-extrabold tracking-tight text-white leading-tight">
            {t('spotted_something', 'Spotted something?')} <br className="hidden md:inline" />
            <span className="bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              {t('report_civic_issue_instantly', 'Report a Civic Issue Instantly')}
            </span>
          </h1>
          
          <p className="text-xs text-slate-400 leading-relaxed">
            {t('smartphone_tool_desc', 'Your smartphone is a powerful tool to protect our neighborhood. Take a photo of street cracks, active flooding, or missed garbage and our AI engine handles automatic categorization, SLA dispatching, and municipal resolution tracking.')}
          </p>
        </div>

        <div className="relative z-10 shrink-0 w-full md:w-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setCurrentTab('report')}
            className="w-full md:w-auto bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-black text-xs px-6 py-3.5 rounded-xl flex items-center justify-center space-x-2.5 shadow-lg shadow-emerald-500/20 cursor-pointer transition-all"
          >
            <span>{t('report_civic_hazard', 'Report Civic Hazard')}</span>
            <ArrowRight className="w-4 h-4 text-slate-950 font-black" />
          </motion.button>
        </div>
      </div>

      {/* ========================================== */}
      {/* 2. THE LOCAL MAP (Mid Panel)               */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Filter & Selection Control Side Panel (Left 4 Columns) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{t('nearby_hazards', 'Nearby Hazards')}</h3>
                  <p className="text-[10px] text-slate-400 font-mono">1 - 2 KM PROXIMITY ENGINE</p>
                </div>
              </div>
              
              <button 
                onClick={() => detectLocation(true)}
                disabled={isLocating}
                className="p-1.5 hover:bg-slate-50 border border-slate-200/60 rounded-xl text-slate-500 hover:text-slate-900 transition-all flex items-center space-x-1 text-[10px] font-bold cursor-pointer font-mono"
                title="Refresh current GPS position"
              >
                <RefreshCw className={`w-3 h-3 ${isLocating ? 'animate-spin text-emerald-600' : ''}`} />
                <span>GPS</span>
              </button>
            </div>

            {/* India National City Hub Selector */}
            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider font-mono flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-emerald-500" />
                  <span>{t('national_civic_hub', 'National Civic Hub')}</span>
                </span>
                <span className="text-[8px] bg-emerald-100 text-emerald-800 font-black px-1.5 py-0.2 rounded font-mono uppercase">
                  INDIA-WIDE
                </span>
              </div>
              <select
                onChange={(e) => {
                  const hub = INDIAN_HUBS.find(h => h.name === e.target.value);
                  if (hub) {
                    setUserLocation({ lat: hub.lat, lng: hub.lng });
                    setIgnoreRadius(false);
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2.5 font-extrabold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                value={INDIAN_HUBS.find(h => Math.abs(h.lat - userLocation.lat) < 0.1 && Math.abs(h.lng - userLocation.lng) < 0.1)?.name || ""}
              >
                <option value="" disabled>-- Select Regional Hub --</option>
                {INDIAN_HUBS.map(hub => (
                  <option key={hub.name} value={hub.name}>
                    {hub.name} ({hub.state})
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={t('search_nearby_placeholder', 'Search nearby issues...')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-xs py-2.5 pl-10 pr-4 rounded-xl border border-slate-200/80 focus:border-emerald-500/40 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none"
              />
            </div>

            {/* Proximity Filter & Category Select */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase">{t('proximity_range', 'PROXIMITY RANGE')}</span>
                {ignoreRadius ? (
                  <button
                    type="button"
                    onClick={() => setIgnoreRadius(false)}
                    className="w-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 p-2 rounded-xl text-[10px] font-black transition-colors cursor-pointer text-center truncate"
                    title="Click to restore proximity filter"
                  >
                    🌍 Global View (Active)
                  </button>
                ) : (
                  <select
                    value={radiusFilter}
                    onChange={(e) => setRadiusFilter(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200/80 p-2 rounded-xl text-xs font-bold focus:outline-none"
                  >
                    <option value={1}>{language === 'hi' ? '1 किमी के भीतर' : 'Within 1 KM'}</option>
                    <option value={2}>{language === 'hi' ? '2 किमी के भीतर (डिफ़ॉल्ट)' : 'Within 2 KM (Default)'}</option>
                    <option value={5}>{language === 'hi' ? '5 किमी के भीतर' : 'Within 5 KM'}</option>
                    <option value={10}>{language === 'hi' ? '10 किमी के भीतर' : 'Within 10 KM'}</option>
                  </select>
                )}
              </div>

              <div className="space-y-1.5">
                <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase">{t('category', 'CATEGORY')}</span>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200/80 p-2 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="all">{language === 'hi' ? 'सभी प्रकार' : 'All Types'}</option>
                  <option value="pothole">{language === 'hi' ? '🚧 गड्ढे (Potholes)' : '🚧 Potholes'}</option>
                  <option value="water">{language === 'hi' ? '💧 पानी का रिसाव (Water Leakage)' : '💧 Water Leakage'}</option>
                  <option value="light">{language === 'hi' ? '💡 स्ट्रीट लाइट (Street Light)' : '💡 Street Light'}</option>
                  <option value="garbage">{language === 'hi' ? '🗑️ कचरा (Missed Garbage)' : '🗑️ Missed Garbage'}</option>
                  <option value="traffic">{language === 'hi' ? '🚦 ट्रैफिक लाइट (Traffic Lights)' : '🚦 Traffic Lights'}</option>
                  <option value="drainage">{language === 'hi' ? '🌀 जल निकासी (Drainage Leak)' : '🌀 Drainage Leak'}</option>
                </select>
              </div>
            </div>

            {/* Responsive scrolling incident card list */}
            <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
              {nearbyIssues.map((issue) => {
                const isSelected = selectedIssueId === issue.id;
                return (
                  <div
                    key={issue.id}
                    onClick={() => {
                      setSelectedIssueId(issue.id);
                      if (issue.location) {
                        setUserLocation({ lat: issue.location.latitude, lng: issue.location.longitude });
                      }
                    }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 hover:bg-slate-100/60 border-slate-200/80'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-1.5">
                          <span className="text-xs">{getCategoryEmoji(issue.category)}</span>
                          <span className={`text-[8px] font-extrabold font-mono uppercase px-1.5 py-0.5 rounded border ${
                            isSelected ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-600 border-slate-200'
                          }`}>
                            {issue.category}
                          </span>
                          <span className="text-[9px] font-bold text-emerald-400 font-mono">
                            {issue.distance < 1 ? `${Math.round(issue.distance * 1000)}m` : `${issue.distance.toFixed(1)}km`} away
                          </span>
                        </div>
                        <h4 className="text-xs font-extrabold line-clamp-1 mt-1">{issue.title}</h4>
                        <p className={`text-[10px] line-clamp-1 ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>
                          {issue.address}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
              {nearbyIssues.length === 0 && (
                <div className="text-center py-6 bg-slate-50 rounded-2xl border border-dashed border-slate-200/80 p-4 space-y-3">
                  <AlertCircle className="w-5.5 h-5.5 text-amber-500 mx-auto" />
                  <div>
                    <p className="text-xs font-bold text-slate-800">{t('no_hazards_nearby', 'No hazards reported nearby')}</p>
                    <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      {t('outside_operational_zone', "We detected your position is outside this regional hub's primary operational zone.")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIgnoreRadius(true)}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-[10px] rounded-xl shadow-xs transition-colors cursor-pointer"
                    >
                      {t('show_all_india_hazards', 'Show All India Hazards')}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setUserLocation({ lat: 28.6139, lng: 77.2090 }); // New Delhi center
                        setIgnoreRadius(false);
                      }}
                      className="w-full py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold text-[10px] rounded-xl transition-colors cursor-pointer"
                    >
                      {t('simulate_new_delhi', 'Simulate Capital (New Delhi) View')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Map Layer Switching control */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 flex items-center justify-between">
            {/* Locked to Google Maps per user request */}
            <span className="text-[10px] font-extrabold text-slate-500 font-mono uppercase tracking-wide flex items-center space-x-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              <span>{t('map_render_mode', 'Map Render Mode: Google Maps')}</span>
            </span>
          </div>
        </div>

        {/* Real-time map viewport panel (Center 5 Columns) */}
        <div className="lg:col-span-5 bg-slate-950 rounded-3xl p-4 shadow-xl border border-slate-800 relative h-[450px] lg:h-auto flex flex-col justify-between overflow-hidden">
          
          {/* Map Floating Header info banner */}
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 pointer-events-none">
            <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 flex items-center space-x-2 shadow-xl pointer-events-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-[8.5px] font-extrabold text-slate-200 tracking-wider uppercase font-mono">
                LOCAL INCIDENT RADAR
              </span>
            </div>
            
            <div className="bg-slate-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-slate-800 text-[8px] font-mono text-slate-300 pointer-events-auto flex items-center space-x-1">
              <Navigation className="w-3 h-3 text-emerald-400 animate-pulse" />
              <span>{userLocation.lat.toFixed(4)}°N | {userLocation.lng.toFixed(4)}°E</span>
            </div>
          </div>

          <div className="w-full h-full relative rounded-2xl bg-slate-950 border border-slate-900 overflow-hidden flex flex-col">
            {mapEngine === 'google' && hasValidKey ? (
              <APIProvider apiKey={API_KEY} version="weekly">
                <Map
                  mapId="DEMO_MAP_ID"
                  center={mapCenter}
                  zoom={mapZoom}
                  onCameraChanged={(ev) => {
                    setMapCenter(ev.detail.center);
                    setMapZoom(ev.detail.zoom);
                  }}
                  gestureHandling="greedy"
                  disableDefaultUI={true}
                  zoomControl={true}
                  style={{ width: '100%', height: '100%' }}
                  defaultMapOptions={{ styles: darkMapStyle }}
                >
                  {/* Current simulated User Hub GPS Position */}
                  <AdvancedMarker position={userLocation}>
                    <div className="relative flex items-center justify-center pointer-events-none">
                      <div className="absolute w-12 h-12 bg-emerald-500/20 rounded-full animate-ping border border-emerald-400" />
                      <div className="absolute w-6 h-6 bg-emerald-500/40 rounded-full animate-pulse border border-emerald-300" />
                      <div className="w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white shadow-lg" />
                    </div>
                  </AdvancedMarker>

                  {nearbyIssues.map((issue) => {
                    const lat = issue.location?.latitude || userLocation.lat;
                    const lng = issue.location?.longitude || userLocation.lng;
                    const isSelected = selectedIssueId === issue.id;

                    let pinBg = '#ef4444'; // Red
                    if (issue.severity === 'low') pinBg = '#10b981'; // Emerald
                    else if (issue.severity === 'medium') pinBg = '#fbbf24'; // Amber

                    return (
                      <AdvancedMarker 
                        key={issue.id} 
                        position={{ lat, lng }}
                        onClick={() => setSelectedIssueId(issue.id)}
                      >
                        <div className={`p-1 px-2 rounded-full text-white shadow-xl flex items-center space-x-1 border transition-all cursor-pointer ${
                          isSelected ? 'scale-125 border-emerald-400 bg-slate-900 ring-2 ring-emerald-500/30' : 'bg-slate-950/90 border-slate-700 hover:border-slate-400'
                        }`} style={{ backgroundColor: isSelected ? undefined : pinBg }}>
                          <span className="text-xs">{getCategoryEmoji(issue.category)}</span>
                        </div>
                      </AdvancedMarker>
                    );
                  })}
                </Map>
              </APIProvider>
            ) : (
              <>
                {/* Fallback Beautiful Vector Grid Map */}
                <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 opacity-[0.04] pointer-events-none">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div key={i} className="border-t border-l border-emerald-500" />
                  ))}
                </div>

                {/* Central Radar circles */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border border-emerald-500/10 rounded-full pointer-events-none flex items-center justify-center animate-pulse">
                  <div className="w-24 h-24 border border-emerald-500/15 rounded-full" />
                </div>

                {/* User GPS Pin Center Indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex flex-col items-center">
                  <div className="relative">
                    <div className="absolute w-12 h-12 bg-emerald-500/20 -left-4 -top-4 rounded-full animate-ping" />
                    <div className="w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                      <Navigation className="w-2 h-2 text-white fill-white" />
                    </div>
                  </div>
                  <span className="bg-slate-950/90 text-slate-300 text-[7px] font-bold font-mono px-1 py-0.5 rounded border border-slate-800 mt-1 tracking-wider uppercase">
                    Your Location
                  </span>
                </div>

                {/* Markers plotted on our relative grid matrix */}
                {nearbyIssues.map((issue) => {
                  if (!issue.location) return null;
                  const coords = getGridCoords(issue.location.latitude, issue.location.longitude);
                  const isSelected = selectedIssueId === issue.id;

                  let pinBg = 'bg-rose-500 text-rose-100 shadow-rose-500/20';
                  if (issue.severity === 'low') pinBg = 'bg-emerald-500 text-emerald-100 shadow-emerald-500/20';
                  else if (issue.severity === 'medium') pinBg = 'bg-amber-500 text-amber-950 shadow-amber-500/20';

                  return (
                    <button
                      key={issue.id}
                      onClick={() => {
                        setSelectedIssueId(issue.id);
                        setUserLocation({ lat: issue.location.latitude, lng: issue.location.longitude });
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full cursor-pointer transition-all flex items-center justify-center z-10 shadow-lg ${pinBg} ${
                        isSelected ? 'scale-135 border-2 border-white ring-4 ring-emerald-500/30 z-20' : 'hover:scale-110'
                      }`}
                      style={{ top: `${coords.y}%`, left: `${coords.x}%` }}
                    >
                      <span className="text-[10px] leading-none">{getCategoryEmoji(issue.category)}</span>
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>

        {/* Selected Issue Inspector Detailed view (Right 3 Columns) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
          {currentSelectedIssue ? (
            <div className="space-y-4 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase">{t('incident_dossier', 'INCIDENT DOSSIER')}</span>
                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${
                  currentSelectedIssue.status === 'resolved' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : currentSelectedIssue.status === 'in_progress'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {t(currentSelectedIssue.status, currentSelectedIssue.status.replace('_', ' '))}
                </span>
              </div>

              {currentSelectedIssue.photoUrl ? (
                <div className="h-28 w-full rounded-2xl overflow-hidden bg-slate-950 relative border border-slate-100">
                  <img 
                    src={currentSelectedIssue.photoUrl} 
                    alt={currentSelectedIssue.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  {currentSelectedIssue.photoAnalysis && (
                    <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs px-2 py-0.5 rounded-lg border border-slate-800 text-[8px] font-mono text-emerald-400 flex items-center space-x-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>{t('ai_confidence', 'AI Confidence')}: {currentSelectedIssue.photoAnalysis.confidence}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-28 w-full rounded-2xl bg-slate-50 border border-dashed border-slate-200 flex flex-col items-center justify-center p-4 text-center">
                  <AlertCircle className="w-5 h-5 text-slate-300 mb-1" />
                  <span className="text-[10px] font-bold text-slate-400">{t('no_verification_image', 'No verification image')}</span>
                </div>
              )}

              <div>
                <h4 className="text-xs font-extrabold text-slate-900 leading-snug">{currentSelectedIssue.title}</h4>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">{currentSelectedIssue.address}</p>
                <p className="text-[11px] text-slate-600 mt-2 line-clamp-3 leading-relaxed">
                  {currentSelectedIssue.description}
                </p>
                {currentSelectedIssue.voiceUrl && (
                  <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-slate-700">
                      <Volume2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="text-[10px] font-bold font-mono text-slate-500">{t('citizen_voice', 'Citizen Voice:')}</span>
                    </div>
                    <audio controls src={currentSelectedIssue.voiceUrl} className="h-6 max-w-[160px] md:max-w-[200px] text-xs focus:outline-none" />
                  </div>
                )}
              </div>

              {/* Upvotes consensus buttons */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-bold text-slate-500 font-mono">{t('neighborhood_verification', 'NEIGHBORHOOD VERIFICATION')}</span>
                  <span className="text-[9px] font-extrabold text-emerald-600 font-mono">
                    +{currentSelectedIssue.verificationStatus.upvotes} {language === 'hi' ? 'अपवोट' : 'UPVOTES'}
                  </span>
                </div>
                
                {(() => {
                  const hasVoted = userId && currentSelectedIssue.verificationStatus?.verifiedBy?.includes(userId);
                  return (
                    <div className="flex gap-2">
                      <button
                        onClick={() => !hasVoted && onVote(currentSelectedIssue.id, 'up')}
                        disabled={!!hasVoted}
                        className={`flex-1 p-1.5 rounded-xl border text-[10px] font-bold flex items-center justify-center space-x-1.5 transition-all ${
                          hasVoted
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 opacity-90 cursor-not-allowed'
                            : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-emerald-700 shadow-xs cursor-pointer'
                        }`}
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{hasVoted ? t('verified_check', 'Verified ✓') : t('upvote', 'Upvote')}</span>
                      </button>
                      <button
                        onClick={() => !hasVoted && onVote(currentSelectedIssue.id, 'down')}
                        disabled={!!hasVoted}
                        className={`flex-1 p-1.5 rounded-xl border text-[10px] font-bold flex items-center justify-center space-x-1.5 transition-all ${
                          hasVoted
                            ? 'bg-slate-100 border-slate-200 text-slate-400 opacity-60 cursor-not-allowed'
                            : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-slate-300 text-rose-700 shadow-xs cursor-pointer'
                        }`}
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>{hasVoted ? t('concluded', 'Concluded') : t('flag_error', 'Flag Error')}</span>
                      </button>
                    </div>
                  );
                })()}
              </div>

              {/* Comments micro section */}
              <div className="space-y-2">
                <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block">{t('updates', 'UPDATES')} ({(Array.isArray(currentSelectedIssue.updates) ? currentSelectedIssue.updates : []).length})</span>
                <div className="space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                  {(Array.isArray(currentSelectedIssue.updates) ? currentSelectedIssue.updates : []).map((upd, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-100 p-2 rounded-xl text-[10px] space-y-1">
                      <div className="flex items-center justify-between text-[8px] font-mono text-slate-400">
                        <span className="font-extrabold text-slate-600 uppercase">{upd.byRole}</span>
                        <span>{new Date(upd.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-600 leading-relaxed font-sans">{upd.message}</p>
                    </div>
                  ))}
                  {(!currentSelectedIssue.updates || !Array.isArray(currentSelectedIssue.updates) || currentSelectedIssue.updates.length === 0) && (
                    <p className="text-[9px] text-slate-400 italic">{t('no_community_comments', 'No community comments registered.')}</p>
                  )}
                </div>

                <form onSubmit={handleCommentSubmit} className="flex gap-1.5 mt-2">
                  <input
                    type="text"
                    placeholder={t('add_neighborhood_note', 'Add neighborhood note...')}
                    value={commentInput}
                    onChange={(e) => setCommentInput(e.target.value)}
                    className="flex-1 bg-slate-50 hover:bg-slate-100/70 focus:bg-white text-[10px] py-1.5 px-3 rounded-lg border border-slate-200 focus:border-emerald-500/30 transition-all outline-none"
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-[9px] py-1.5 px-3 rounded-lg cursor-pointer transition-all shrink-0"
                  >
                    {t('send', 'Send')}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400 font-bold">{t('select_pin_audit_desc', 'Select any pin to audit detailed SLA information')}</p>
            </div>
          )}
        </div>
      </div>

      {/* ========================================== */}
      {/* 3. ACTIVITY FEED & STATS (Bottom Panel)    */}
      {/* ========================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        
        {/* Dynamic Local Gamification & SLA stats (Left 5 Columns) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-5">
          <div className="space-y-4 text-left">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                <Award className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">{t('community_impact_ledger', 'Community Impact Ledger')}</h3>
                <p className="text-[9px] text-slate-400 font-mono">{t('your_game_xp', 'YOUR GAME XP & BADGE BALANCES')}</p>
              </div>
            </div>

            {/* Score points & Badges panel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-black font-mono text-slate-400 uppercase tracking-wider">{t('your_points_balance', 'YOUR POINTS BALANCE')}</span>
                  <p className="text-2xl font-black text-slate-900 font-mono mt-1">{userPoints} XP</p>
                </div>
                <p className="text-[9px] text-slate-500 mt-2">{t('earn_points_desc', 'Earn +50 XP on confirmed reports.')}</p>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
                <div>
                  <span className="text-[8px] font-black font-mono text-slate-400 uppercase tracking-wider">{t('civic_badges_earned', 'CIVIC BADGES EARNED')}</span>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {userBadges.map((badge, i) => (
                      <span key={i} className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold px-1.5 py-0.5 rounded-lg">
                        {badge}
                      </span>
                    ))}
                    {userBadges.length === 0 && (
                      <span className="text-[9px] text-slate-400 italic">{t('no_badges_earned', 'No badges earned yet.')}</span>
                    )}
                  </div>
                </div>
                <p className="text-[9px] text-slate-500 mt-2">{t('earn_badges_desc', 'Earn Badges for neighborhood verifications.')}</p>
              </div>
            </div>

            {/* Simple stats bar */}
            <div className="space-y-3.5 pt-1">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>{t('average_sla_speed', 'Average SLA Resolution Speed')}</span>
                </span>
                <span className="font-extrabold text-slate-900 font-mono">{t('hours_18_4', '18.4 Hours')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold flex items-center space-x-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  <span>{t('citizen_consensus_matching', 'Citizen Consensus Matching')}</span>
                </span>
                <span className="font-extrabold text-slate-900 font-mono">{t('accuracy_98_2', '98.2% Accuracy')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Resolved Micro-Feed (Right 7 Columns) */}
        <div className="lg:col-span-7 bg-slate-900 text-white p-5 rounded-3xl border border-slate-800 shadow-lg flex flex-col justify-between space-y-4">
          <div className="space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
                  <ShieldCheck className="w-4 h-4 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wide">{t('municipal_resolved_feed', 'Live Municipal Resolved Feed')}</h3>
                  <p className="text-[9px] text-slate-400 font-mono">{t('real_time_stream', 'REAL-TIME CITY PROGRESS STREAM')}</p>
                </div>
              </div>
              
              <span className="bg-emerald-950 text-emerald-400 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded border border-emerald-900">
                {t('live_updates', '● LIVE UPDATES')}
              </span>
            </div>

            {/* Micro scroll feed */}
            <div className="space-y-2.5 max-h-[170px] overflow-y-auto pr-1">
              {resolvedIssues.map((issue) => (
                <div 
                  key={issue.id}
                  className="bg-slate-950/60 hover:bg-slate-950 border border-slate-850 p-3 rounded-2xl flex items-start gap-3 transition-all"
                >
                  <div className="p-2 bg-emerald-950 text-emerald-400 rounded-xl border border-emerald-900/60 mt-0.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  </div>
                  <div className="space-y-0.5 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wide">
                        {t(issue.category, issue.category)} {language === 'hi' ? 'हल किया गया' : 'Resolved'} • {issue.assignedDepartment || t('municipal_authority', 'Municipal Authority')}
                      </span>
                      <span className="text-[9px] text-emerald-400 font-bold font-mono">
                        {issue.timeline.resolvedAt ? new Date(issue.timeline.resolvedAt).toLocaleDateString([], { month: 'short', day: 'numeric' }) : (language === 'hi' ? 'हाल ही में' : 'Recently')}
                      </span>
                    </div>
                    <h4 className="text-xs font-extrabold text-slate-100">{issue.title}</h4>
                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">{issue.address}</p>
                    
                    {issue.resolutionAudit && (
                      <p className="text-[9.5px] text-emerald-500 font-bold font-sans mt-1 bg-emerald-950/20 px-2 py-1 rounded border border-emerald-900/30">
                        🤝 {t('community_verified', 'Community Verified')}: "{issue.resolutionAudit.feedbackComments?.[0]?.text || t('verified_resolution_consensus', 'Verified resolution consensus.')}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
              
              {resolvedIssues.length === 0 && (
                <div className="text-center py-8 bg-slate-950/30 rounded-2xl border border-dashed border-slate-800 p-4">
                  <CheckCircle2 className="w-5 h-5 text-slate-600 mx-auto mb-2 animate-pulse" />
                  <p className="text-xs font-bold text-slate-400">{t('waiting_municipal_updates', 'Waiting for municipal updates')}</p>
                  <p className="text-[9px] text-slate-500 mt-1">{t('broadcast_live_desc', 'Once municipal officers mark any issue as resolved, they will broadcast live in this channel!')}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
