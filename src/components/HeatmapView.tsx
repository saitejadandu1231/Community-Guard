import React, { useState, useEffect } from 'react';
import { 
  MapPin, Flame, Filter, Eye, ThumbsUp, ThumbsDown, 
  CheckCircle, Clock, ChevronRight, MessageSquare, 
  ShieldAlert, Award, Search, Sparkles, Building, 
  Map as MapIcon, Compass, Navigation, Volume2,
  ArrowUpDown, X
} from 'lucide-react';
import { Issue, IssueCategory, IssueSeverity, IssueStatus } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import { useLanguage } from './LanguageContext';

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
  {
    featureType: "administrative.locality",
    elementType: "labels.text.fill",
    stylers: [{ color: "#94a3b8" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#10b981" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#020617" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#10b981" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#0f172a" }],
  },
  {
    featureType: "road",
    elementType: "labels.text.fill",
    stylers: [{ color: "#475569" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry.stroke",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#cbd5e1" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#172554" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#3b82f6" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.stroke",
    stylers: [{ color: "#020617" }],
  },
];

const PRESET_COORDINATES: Record<string, { name: string; lat: number; lng: number }> = {
  "Connaught Place": { name: "Connaught Place", lat: 28.6304, lng: 77.2177 },
  "Delhi Airport": { name: "Delhi Airport", lat: 28.5562, lng: 77.1000 },
  "India Gate": { name: "India Gate", lat: 28.6129, lng: 77.2295 },
  "Marine Drive": { name: "Marine Drive", lat: 18.9430, lng: 72.8225 },
  "MG Road": { name: "MG Road", lat: 12.9738, lng: 77.6119 },
  "Central Kolkata": { name: "Central Kolkata", lat: 22.5645, lng: 88.3520 },
  "Hussain Sagar": { name: "Hussain Sagar", lat: 17.4202, lng: 78.4728 },
  "Banjara Hills": { name: "Banjara Hills", lat: 17.4156, lng: 78.4442 },
  "Secunderabad": { name: "Secunderabad", lat: 17.4412, lng: 78.4984 },
  "Koti Market": { name: "Koti Market", lat: 17.3824, lng: 78.4802 },
  "Charminar Block": { name: "Charminar Block", lat: 17.3616, lng: 78.4746 },
  "Gachibowli": { name: "Gachibowli", lat: 17.4401, lng: 78.3489 }
};

interface HeatmapViewProps {
  issues: Issue[];
  onVote: (issueId: string, type: 'up' | 'down') => void;
  onAddComment: (issueId: string, commentText: string) => void;
  currentUserRole: string;
}

export default function HeatmapView({ issues, onVote, onAddComment, currentUserRole }: HeatmapViewProps) {
  const { language, t } = useLanguage();

  const getWardTranslationKey = (wardName: string): string => {
    if (!wardName) return '';
    const clean = wardName.toLowerCase().trim();
    if (clean.includes('jubilee')) return 'ward_jubilee_hills';
    if (clean.includes('banjara')) return 'ward_banjara_hills';
    if (clean.includes('gachibowli')) return 'ward_gachibowli';
    if (clean.includes('charminar')) return 'ward_charminar';
    if (clean.includes('secunderabad')) return 'ward_secunderabad';
    if (clean.includes('koti')) return 'ward_koti';
    if (clean.includes('hussain')) return 'ward_hussain_sagar';
    return '';
  };

  const [selectedCategory, setSelectedCategory] = useState<IssueCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<IssueSeverity | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus | 'all'>('all');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(issues[0]?.id || null);
  const [viewMode, setViewMode] = useState<'pins' | 'heatmap'>('pins');
  const [mapEngine, setMapEngine] = useState<'vector' | 'google'>('google');
  const [commentInput, setCommentInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [hoveredWard, setHoveredWard] = useState<string | null>(null);
  const [selectedWard, setSelectedWard] = useState<string | null>("Central Ward");
  const [auditingIssueId, setAuditingIssueId] = useState<string | null>(null);

  // Safe Monsoon Routing States
  const [routeStart, setRouteStart] = useState<string>('Connaught Place');
  const [routeEnd, setRouteEnd] = useState<string>('India Gate');
  const [customRouteStart, setCustomRouteStart] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [customRouteEnd, setCustomRouteEnd] = useState<{ name: string; lat: number; lng: number } | null>(null);
  const [selectingPointMode, setSelectingPointMode] = useState<'none' | 'start' | 'end'>('none');
  const [routingResult, setRoutingResult] = useState<any>(null);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);
  const [showRoutePlanner, setShowRoutePlanner] = useState<boolean>(true);

  // Ward Alerts Subscription and Carrier logs states
  const [subscriberName, setSubscriberName] = useState('');
  const [subscriberPhone, setSubscriberPhone] = useState('');
  const [subscriberWard, setSubscriberWard] = useState('Central Delhi');
  const [subscriberChannel, setSubscriberChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscribersList, setSubscribersList] = useState<any[]>([]);
  const [alertsLog, setAlertsLog] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  const fetchSubscribersAndLogs = async () => {
    setIsLoadingLogs(true);
    try {
      const [subsRes, logsRes] = await Promise.all([
        fetch('/api/ward-subscribers'),
        fetch('/api/alerts-log')
      ]);
      
      let subsData: any = { success: false };
      let logsData: any = { success: false };

      if (subsRes.ok && subsRes.headers.get('content-type')?.includes('application/json')) {
        subsData = await subsRes.json();
      } else {
        const text = await subsRes.text().catch(() => '');
        console.warn(`Ward subscribers fetch failed with status ${subsRes.status}:`, text);
      }

      if (logsRes.ok && logsRes.headers.get('content-type')?.includes('application/json')) {
        logsData = await logsRes.json();
      } else {
        const text = await logsRes.text().catch(() => '');
        console.warn(`Alerts log fetch failed with status ${logsRes.status}:`, text);
      }

      if (subsData.success) setSubscribersList(subsData.subscribers);
      if (logsData.success) setAlertsLog(logsData.logs);
    } catch (err) {
      console.error("Error fetching ward subscribers or logs:", err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSubscribersAndLogs();
    // Poll alerts log every 20 seconds for real-time live feel, with graceful rate-limiting handling
    const interval = setInterval(() => {
      fetch('/api/alerts-log')
        .then(async res => {
          if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
            return res.json();
          }
          const text = await res.text().catch(() => '');
          throw new Error(`Invalid response or not JSON (status ${res.status}): ${text}`);
        })
        .then(data => {
          if (data && data.success) setAlertsLog(data.logs);
        })
        .catch(err => {
          console.warn("Polling alerts log failed silently (expected on network rate limits):", err.message);
        });
    }, 20000);
    return () => clearInterval(interval);
  }, []);

  const handleSubscribeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subscriberName.trim() || !subscriberPhone.trim() || !subscriberWard) return;
    setIsSubscribing(true);
    try {
      const res = await fetch('/api/subscribe-ward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: subscriberName,
          phone: subscriberPhone,
          ward: subscriberWard,
          channel: subscriberChannel
        })
      });
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data.success) {
          setSubscriberName('');
          setSubscriberPhone('');
          fetchSubscribersAndLogs();
        }
      } else {
        const text = await res.text().catch(() => '');
        console.warn(`Subscribe failed with status ${res.status}:`, text);
      }
    } catch (err) {
      console.error("Error subscribing to ward alerts:", err);
    } finally {
      setIsSubscribing(false);
    }
  };

  // Advanced Google Map States
  const [centerState, setCenterState] = useState({ lat: 17.4085, lng: 78.4725 });
  const [zoomState, setZoomState] = useState(13);
  const [mapStyleMode, setMapStyleMode] = useState<'dark' | 'satellite' | 'hybrid' | 'terrain'>('dark');
  const [anchorPoint, setAnchorPoint] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusFilter, setRadiusFilter] = useState<number | 'all'>('all');

  // National Ward presets for interactive click simulation
  const INDIA_WARDS = [
    { name: "Ward 12 (North Delhi Block)", reports: 8, safetyIndex: "84%", activeCrews: 3 },
    { name: "Ward 15 (Mumbai Commercial Zone)", reports: 12, safetyIndex: "91%", activeCrews: 5 },
    { name: "Ward 8 (Bengaluru Transit Corridor)", reports: 5, safetyIndex: "79%", activeCrews: 2 },
    { name: "Ward 22 (Chennai Heritage Block)", reports: 14, safetyIndex: "73%", activeCrews: 4 },
    { name: "Ward 4 (Kolkata Trading Sector)", reports: 7, safetyIndex: "81%", activeCrews: 2 },
  ];

  // Dynamic map centering to support global coordinates automatically!
  let centerLat = 28.6304;
  let centerLng = 77.2177;
  let isDefaultCity = true;

  if (issues.length > 0) {
    const validCoords = issues.filter(i => i.location && i.location.latitude && i.location.longitude);
    if (validCoords.length > 0) {
      // Center around the newest coordinate to focus on user's active geolocations across India!
      const newestWithCoords = validCoords[0];
      centerLat = newestWithCoords.location.latitude;
      centerLng = newestWithCoords.location.longitude;
      isDefaultCity = false;
    }
  }

  // Synchronize Google Map camera on initial load or when database center shifts
  useEffect(() => {
    setCenterState({ lat: centerLat, lng: centerLng });
  }, [centerLat, centerLng]);

  // Haversine distance formula to calculate exact KM distances between coordinates
  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of earth in km
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

  // Filtering issues with search, categories, severity, status, and proximity radius
  const filteredIssues = issues.filter(issue => {
    if (selectedCategory !== 'all' && issue.category !== selectedCategory) return false;
    if (selectedSeverity !== 'all' && issue.severity !== selectedSeverity) return false;
    if (selectedStatus !== 'all' && issue.status !== selectedStatus) return false;
    
    // Proximity radius filter
    if (anchorPoint && radiusFilter !== 'all' && issue.location) {
      const dist = getDistanceInKm(
        issue.location.latitude,
        issue.location.longitude,
        anchorPoint.lat,
        anchorPoint.lng
      );
      if (dist > radiusFilter) return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = issue.title.toLowerCase().includes(q);
      const matchDesc = issue.description.toLowerCase().includes(q);
      const matchAddr = issue.address.toLowerCase().includes(q);
      const matchCat = issue.category.toLowerCase().includes(q);
      return matchTitle || matchDesc || matchAddr || matchCat;
    }
    return true;
  });

  const selectedIssue = issues.find(i => i.id === selectedIssueId) || filteredIssues[0] || issues[0];

  const labelLake = isDefaultCity ? "Central Park" : "Central Reservoir";
  const labelNorthWest = isDefaultCity ? "Karol Bagh" : "North West Sector";
  const labelNorthEast = isDefaultCity ? "Noida Sector" : "North East Sector";
  const labelSouthWest = isDefaultCity ? "Vasant Kunj" : "South West Sector";
  const labelSouthEast = isDefaultCity ? "India Gate" : "South East Sector";
  const cityNameHeader = isDefaultCity ? "NATIONAL LIVE URBAN LEDGER" : "GLOBAL LIVE URBAN LEDGER";

  // Convert GPS coordinate to grid percentage for our interactive visual map
  const getGridCoords = (lat: number, lng: number) => {
    const latDiff = lat - (centerLat - 0.0175);
    const lngDiff = lng - (centerLng - 0.0175);
    const y = 100 - Math.min(Math.max((latDiff / 0.035) * 100, 5), 95);
    const x = Math.min(Math.max((lngDiff / 0.035) * 100, 5), 95);
    return { x, y };
  };

  const handleVectorMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (selectingPointMode === 'none') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Reverse coordinates mapping
    const lng = (xPercent / 100) * 0.035 + centerLng - 0.0175;
    const lat = ((100 - yPercent) / 100) * 0.035 + centerLat - 0.0175;

    if (selectingPointMode === 'start') {
      setCustomRouteStart({
        name: `📍 Start (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng
      });
      setSelectingPointMode('end'); // Auto-advance to destination selection
      setRoutingResult(null);
    } else if (selectingPointMode === 'end') {
      setCustomRouteEnd({
        name: `🏁 Destination (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
        lat,
        lng
      });
      setSelectingPointMode('none'); // Done selecting
      setRoutingResult(null);
    }
  };

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentInput.trim() || !selectedIssue) return;
    onAddComment(selectedIssue.id, commentInput);
    setCommentInput('');
  };

  const getCategoryColor = (cat: IssueCategory) => {
    switch (cat) {
      case 'pothole': return 'from-amber-500 to-orange-600';
      case 'water': return 'from-blue-500 to-cyan-600';
      case 'light': return 'from-yellow-400 to-amber-500';
      case 'garbage': return 'from-emerald-500 to-teal-600';
      case 'traffic': return 'from-rose-500 to-red-600';
      case 'drainage': return 'from-indigo-500 to-purple-600';
      default: return 'from-slate-500 to-slate-700';
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-5">
      {/* Overview Stats Dashboard Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { 
            label: t('active_hazards', 'ACTIVE HAZARDS'), 
            val: issues.filter(i => i.status !== 'resolved').length, 
            color: 'text-slate-900', 
            sub: t('requires_urgent_attention', 'Requires urgent attention'),
            bg: 'bg-white' 
          },
          { 
            label: t('resolved_by_councils', 'RESOLVED BY COUNCILS'), 
            val: issues.filter(i => i.status === 'resolved').length, 
            color: 'text-emerald-600', 
            sub: t('resolved_last_7_days', 'Resolved in last 7 days'),
            bg: 'bg-emerald-50/25 border-emerald-500/10' 
          },
          { 
            label: t('citizen_verifications', 'CITIZEN VERIFICATIONS'), 
            val: issues.reduce((acc, curr) => acc + curr.verificationStatus.upvotes, 0), 
            color: 'text-amber-600', 
            sub: t('total_consensus_votes', 'Total consensus votes cast'),
            bg: 'bg-amber-50/25 border-amber-500/10' 
          },
          { 
            label: t('ai_classification_rate', 'AI CLASSIFICATION RATE'), 
            val: '94.2%', 
            color: 'text-purple-600', 
            sub: t('direct_routing_precision', 'Direct routing precision'),
            bg: 'bg-purple-50/25 border-purple-500/10' 
          },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className={`p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between ${stat.bg}`}
          >
            <div>
              <span className="text-[10px] font-extrabold text-slate-400 font-mono tracking-wider uppercase">{stat.label}</span>
              <p className={`text-xl font-black ${stat.color} font-mono mt-0.5`}>{stat.val}</p>
            </div>
            <p className="text-[9px] text-slate-500 font-sans mt-1.5">{stat.sub}</p>
          </motion.div>
        ))}
      </div>

      {/* Main Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* FILTERS & SEARCH COLLATOR (Left 3 Columns) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs lg:h-[650px] h-auto flex flex-col overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Filter className="w-4 h-4 text-emerald-600" />
              <span>{t('filters_layer', 'Filters & Layer')}</span>
            </h3>
            <button
              onClick={() => {
                setSelectedCategory('all');
                setSelectedSeverity('all');
                setSelectedStatus('all');
                setSearchQuery('');
              }}
              className="text-[10px] font-black uppercase text-emerald-600 hover:text-emerald-700 tracking-wider transition-colors cursor-pointer"
            >
              {t('reset_all', 'Reset All')}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-5 pr-1 mt-4">
            {/* Search bar inside the filter list */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder={t('search_reports_placeholder', 'Search reports or wards...')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs py-2.5 pl-10 pr-4 focus:outline-none transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-2.5 text-[10px] text-slate-400 hover:text-slate-600"
              >
                {t('clear', 'Clear')}
              </button>
            )}
          </div>

          {/* Map Layer Toggle */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('view_mode', 'View Mode')}</label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100/80 p-1 rounded-xl border border-slate-200/50">
              <button
                onClick={() => setViewMode('pins')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'pins' 
                    ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                <span>{t('issue_pins', 'Issue Pins')}</span>
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  viewMode === 'heatmap' 
                    ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/40' 
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Flame className="w-3.5 h-3.5 text-orange-500" />
                <span>{t('live_heatmap', 'Live Heatmap')}</span>
              </button>
            </div>
          </div>

          {/* Map Engine - Google Maps locked per user request */}
          <div className="space-y-2">
            <div className="flex justify-between items-center bg-slate-100 p-2.5 rounded-xl border border-slate-200/40">
              <span className="text-[10px] font-extrabold text-slate-800 uppercase font-mono tracking-wide flex items-center space-x-1.5">
                <Compass className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '12s' }} />
                <span>{t('google_maps_engine', 'Google Maps Engine')}</span>
              </span>
              <span className="bg-emerald-500/10 text-emerald-600 text-[8px] font-bold uppercase px-1.5 py-0.5 rounded">
                {t('active_status', 'ACTIVE')}
              </span>
            </div>
          </div>

          {/* Advanced Google Maps Panel (visible only when Google Maps engine is active) */}
          {mapEngine === 'google' && (
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5 space-y-4 animate-fadeIn">
              <div className="border-b border-slate-200/50 pb-2 flex items-center justify-between">
                <span className="text-[10px] font-extrabold text-slate-800 tracking-wider uppercase font-mono flex items-center space-x-1.5">
                  <Compass className="w-3.5 h-3.5 text-emerald-600 animate-spin" style={{ animationDuration: '10s' }} />
                  <span>{t('google_gis_tools', 'Google GIS Tools')}</span>
                </span>
                <span className="text-[8px] bg-emerald-500/10 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold font-mono uppercase">
                  {t('connected_status', 'Connected')}
                </span>
              </div>

              {/* Map Theme / Layer Toggles */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('map_style_layer', 'Map Style / Layer')}</label>
                <div className="grid grid-cols-2 gap-1 text-[9px]">
                  {(['dark', 'satellite', 'hybrid', 'terrain'] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setMapStyleMode(style)}
                      className={`py-1.5 px-2 rounded-lg font-bold border capitalize transition-all cursor-pointer text-center ${
                        mapStyleMode === style
                          ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              {/* Proximity Radius Filter */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[8px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('proximity_filter', 'Proximity Filter')}</label>
                  {anchorPoint && (
                    <button
                      onClick={() => {
                        setAnchorPoint(null);
                        setRadiusFilter('all');
                      }}
                      className="text-[8px] text-red-600 hover:underline font-extrabold font-mono uppercase"
                    >
                      Reset
                    </button>
                  )}
                </div>
                
                {!anchorPoint ? (
                  <div className="text-[9px] text-slate-500 bg-white/80 p-2.5 rounded-xl border border-slate-200/60 leading-relaxed text-center font-sans">
                    {t('set_search_hub_desc', '💡 Set search hub: Click anywhere on the map or click a report to set a proximity search center!')}
                  </div>
                ) : (
                  <div className="space-y-1.5 bg-white p-2.5 rounded-xl border border-slate-200/60">
                    <div className="flex justify-between items-center text-[9px] font-mono">
                      <span className="text-slate-500">Hub: {anchorPoint.lat.toFixed(4)}, {anchorPoint.lng.toFixed(4)}</span>
                      <span className="font-bold text-emerald-600">{radiusFilter === 'all' ? 'All Areas' : `Within ${radiusFilter} KM`}</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="15"
                      step="1"
                      value={radiusFilter === 'all' ? 15 : radiusFilter}
                      onChange={(e) => setRadiusFilter(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer h-1 bg-slate-200 rounded-lg"
                    />
                    <div className="flex justify-between text-[7.5px] font-mono text-slate-400">
                      <span>1 km</span>
                      <span>5 km</span>
                      <span>10 km</span>
                      <span>15 km</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Jump presets */}
              <div className="space-y-1.5">
                <label className="text-[8px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('gis_quick_fly_to', '🌍 GIS Quick Fly-To')}</label>
                <div className="flex flex-wrap gap-1">
                  {[
                    { name: "New Delhi", lat: 28.6139, lng: 77.2090, zoom: 13, key: 'city_new_delhi' },
                    { name: "Mumbai", lat: 18.9430, lng: 72.8225, zoom: 13, key: 'city_mumbai' },
                    { name: "Bengaluru", lat: 12.9719, lng: 77.5937, zoom: 13, key: 'city_bengaluru' },
                    { name: "Kolkata", lat: 22.5726, lng: 88.3639, zoom: 13, key: 'city_kolkata' },
                    { name: "Chennai", lat: 13.0827, lng: 80.2707, zoom: 13, key: 'city_chennai' },
                    { name: "Jaipur", lat: 26.9124, lng: 75.7873, zoom: 13, key: 'city_jaipur' }
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        setCenterState({ lat: preset.lat, lng: preset.lng });
                        setZoomState(preset.zoom);
                        setAnchorPoint({ lat: preset.lat, lng: preset.lng });
                        setRadiusFilter(3); // Default to 3km on preset click for super cool GIS visual context!
                      }}
                      className="text-[8.5px] font-bold px-2 py-1 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
                    >
                      {t(preset.key, preset.name)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}



          {/* Category Dropdown */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('category', 'Category')}</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs py-2 px-3 font-semibold text-slate-700 focus:outline-none transition-colors"
            >
              <option value="all">{t('all_incident_types', '📁 All Incident Types')}</option>
              <option value="pothole">{t('cat_pothole', '🚧 Roads & Potholes')}</option>
              <option value="water">{t('cat_water', '💧 Water & Sewers')}</option>
              <option value="light">{t('cat_light', '💡 Streetlights')}</option>
              <option value="garbage">{t('cat_garbage', '🗑️ Garbage & Sanitation')}</option>
              <option value="traffic">{t('cat_traffic', '🚦 Traffic & Signs')}</option>
              <option value="drainage">{t('cat_drainage', '🌀 Drainage Problems')}</option>
              <option value="other">{t('cat_other', '📍 Other Civic Issues')}</option>
            </select>
          </div>

          {/* Severity Filters */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('severity_level', 'Severity Level')}</label>
            <div className="flex flex-wrap gap-1.5">
              {(['all', 'low', 'medium', 'high', 'critical'] as const).map((sev) => {
                const isActive = selectedSeverity === sev;
                return (
                  <button
                    key={sev}
                    onClick={() => setSelectedSeverity(sev)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border capitalize transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    {t(`severity_${sev}`, sev)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status filter selection */}
          <div className="space-y-2">
            <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('status', 'Status')}</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full bg-slate-50/50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs py-2 px-3 font-semibold text-slate-700 focus:outline-none transition-colors"
            >
              <option value="all">{t('all_incident_statuses', '🔄 All Incident Statuses')}</option>
              <option value="reported">{t('status_reported', 'Reported')}</option>
              <option value="verified">{t('status_verified', 'Verified (AI or Citizen)')}</option>
              <option value="assigned">{t('status_assigned', 'Assigned to Department')}</option>
              <option value="in_progress">{t('status_in_progress', 'Currently In Progress')}</option>
              <option value="resolved">{t('status_resolved', 'Resolved & Closed')}</option>
              <option value="rejected">{t('status_rejected', 'Rejected Reports')}</option>
            </select>
          </div>

          {/* Dynamic Feed results summary */}
          <div className="pt-3 border-t border-slate-100">
            <div className="flex justify-between items-center mb-2">
              <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider">
                {t('results_label', 'RESULTS')} ({filteredIssues.length})
              </label>
              {searchQuery && <span className="text-[9px] text-slate-400 font-mono">{t('filtered_label', 'Filtered')}</span>}
            </div>
            
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {filteredIssues.map((issue) => {
                const isSelected = selectedIssue?.id === issue.id;
                return (
                  <motion.div
                    key={issue.id}
                    onClick={() => setSelectedIssueId(issue.id)}
                    whileHover={{ x: 2 }}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-start space-x-2.5 ${
                      isSelected
                        ? 'bg-emerald-50/40 border-emerald-500/50 ring-1 ring-emerald-500/10 shadow-xs'
                        : 'bg-slate-50/50 border-slate-200/75 hover:bg-slate-50 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-base mt-0.5">{getCategoryEmoji(issue.category)}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate leading-snug">{issue.title}</p>
                      <p className="text-[9px] text-slate-500 font-mono truncate mt-0.5">{issue.address}</p>
                      <div className="flex items-center space-x-2 mt-1.5">
                        <span className={`text-[8px] font-bold font-mono px-1.5 py-0.5 rounded uppercase ${
                          issue.severity === 'critical' ? 'bg-red-50 text-red-700 border border-red-100' :
                          issue.severity === 'high' ? 'bg-orange-50 text-orange-700' :
                          'bg-amber-50 text-amber-700'
                        }`}>
                          {t(`severity_${issue.severity}`, issue.severity)}
                        </span>
                        <span className="text-[8px] text-slate-400 font-mono font-bold">
                          👍 {issue.verificationStatus.upvotes} {t('verification_label', 'Verification')}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
              {filteredIssues.length === 0 && (
                <div className="text-center py-6">
                  <p className="text-xs text-slate-400">{t('no_reports_match', 'No reports match search parameters.')}</p>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>

        {/* HIGH-TECH VECTOR MAP GRID (Center 5 Columns) */}
        <div className="lg:col-span-5 bg-slate-900 rounded-3xl p-3 shadow-xl border border-slate-800 relative lg:h-[650px] flex flex-col space-y-3 overflow-hidden">
          
          {/* Static Monsoon Route Bypass Control Panel - Now statically above the Map and Ledger */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-3 shadow-2xl shrink-0 text-left text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <span className="text-[10px] font-extrabold text-blue-400 tracking-wider uppercase font-mono flex items-center space-x-1.5">
                <Navigation className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                <span>{t('monsoon_bypass_title', 'Monsoon Route Bypass')}</span>
              </span>
              <span className="text-[8px] font-mono text-emerald-400 bg-emerald-950/50 border border-emerald-800/60 px-2 py-0.5 rounded-full uppercase tracking-wider flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>AUTOMATED ROUTING ACTIVE</span>
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[8px] font-black font-mono uppercase text-slate-500 block tracking-wider">
                    Start Point
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectingPointMode(selectingPointMode === 'start' ? 'none' : 'start')}
                    className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                      selectingPointMode === 'start'
                        ? 'bg-emerald-500 text-slate-950 animate-pulse'
                        : customRouteStart
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-850 text-slate-400 hover:text-white'
                    }`}
                    title="Click on the map to place start pin"
                  >
                    {selectingPointMode === 'start' ? 'Selecting...' : customRouteStart ? '📍 Pin Active' : '🎯 Pin Map'}
                  </button>
                </div>
                {customRouteStart ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={customRouteStart.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = val.match(/([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/);
                        if (match) {
                          setCustomRouteStart({
                            name: val,
                            lat: parseFloat(match[1]),
                            lng: parseFloat(match[2])
                          });
                        } else {
                          setCustomRouteStart({
                            ...customRouteStart,
                            name: val
                          });
                        }
                        setRoutingResult(null);
                      }}
                      placeholder="Type name or lat,lng"
                      className="w-full bg-slate-900 border border-blue-900/60 rounded-lg py-1 pl-2 pr-6 font-bold text-blue-300 focus:outline-none text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomRouteStart(null);
                        setRoutingResult(null);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <select
                    value={routeStart}
                    onChange={(e) => {
                      setRouteStart(e.target.value);
                      setCustomRouteStart(null);
                      setRoutingResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 font-bold text-slate-300 focus:outline-none text-[10px]"
                  >
                    {Object.keys(PRESET_COORDINATES).map(k => (
                      <option key={`start-${k}`} value={k}>{k}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[8px] font-black font-mono uppercase text-slate-500 block tracking-wider">
                    Destination Target
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectingPointMode(selectingPointMode === 'end' ? 'none' : 'end')}
                    className={`text-[7px] font-mono font-bold uppercase px-1.5 py-0.5 rounded transition-all cursor-pointer ${
                      selectingPointMode === 'end'
                        ? 'bg-red-500 text-slate-950 animate-pulse'
                        : customRouteEnd
                        ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                        : 'bg-slate-850 text-slate-400 hover:text-white'
                    }`}
                    title="Click on the map to place destination pin"
                  >
                    {selectingPointMode === 'end' ? 'Selecting...' : customRouteEnd ? '🏁 Pin Active' : '🎯 Pin Map'}
                  </button>
                </div>
                {customRouteEnd ? (
                  <div className="relative">
                    <input
                      type="text"
                      value={customRouteEnd.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        const match = val.match(/([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)/);
                        if (match) {
                          setCustomRouteEnd({
                            name: val,
                            lat: parseFloat(match[1]),
                            lng: parseFloat(match[2])
                          });
                        } else {
                          setCustomRouteEnd({
                            ...customRouteEnd,
                            name: val
                          });
                        }
                        setRoutingResult(null);
                      }}
                      placeholder="Type name or lat,lng"
                      className="w-full bg-slate-900 border border-red-900/60 rounded-lg py-1 pl-2 pr-6 font-bold text-red-300 focus:outline-none text-[10px]"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCustomRouteEnd(null);
                        setRoutingResult(null);
                      }}
                      className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-red-400 font-bold"
                    >
                      ×
                    </button>
                  </div>
                ) : (
                  <select
                    value={routeEnd}
                    onChange={(e) => {
                      setRouteEnd(e.target.value);
                      setCustomRouteEnd(null);
                      setRoutingResult(null);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 font-bold text-slate-300 focus:outline-none text-[10px]"
                  >
                    {Object.keys(PRESET_COORDINATES).map(k => (
                      <option key={`end-${k}`} value={k}>{k}</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={async () => {
                    if (isCalculatingRoute) return;
                    setIsCalculatingRoute(true);
                    try {
                      const startObj = customRouteStart || PRESET_COORDINATES[routeStart];
                      const endObj = customRouteEnd || PRESET_COORDINATES[routeEnd];

                      const response = await fetch('/api/safe-routing', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          startLandmark: startObj.name,
                          endLandmark: endObj.name,
                          startCoords: startObj,
                          endCoords: endObj,
                          activeIssues: issues
                        })
                      });
                      const data = await response.json();
                      if (data.success) {
                        setRoutingResult(data);
                        if (data.pathSteps && data.pathSteps.length > 0) {
                          const midIdx = Math.floor(data.pathSteps.length / 2);
                          const midPoint = data.pathSteps[midIdx];
                          setCenterState({ lat: midPoint.lat, lng: midPoint.lng });
                          setZoomState(13.5);
                        }
                      }
                    } catch (err) {
                      console.error("Safe route calculation failed:", err);
                    } finally {
                      setIsCalculatingRoute(false);
                    }
                  }}
                  disabled={isCalculatingRoute}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 transition-all text-white font-mono font-bold text-[9px] uppercase tracking-wider rounded-lg cursor-pointer flex items-center justify-center space-x-1.5 border border-blue-500 h-[28px]"
                >
                  {isCalculatingRoute ? (
                    <>
                      <div className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Calculating...</span>
                    </>
                  ) : (
                    <>
                      <Navigation className="w-3.5 h-3.5 text-blue-200" />
                      <span>Safe Route</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Custom Location Click Hint */}
            {customRouteStart || customRouteEnd ? (
              <div className="flex items-center justify-between text-[8px] bg-blue-950/40 border border-blue-900/40 p-1.5 rounded-lg text-blue-300 font-mono">
                <span className="truncate">
                  📍 Active: {customRouteStart?.name || 'Preset'} → {customRouteEnd?.name || 'Preset'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomRouteStart(null);
                    setCustomRouteEnd(null);
                    setRoutingResult(null);
                  }}
                  className="text-red-400 hover:text-red-300 font-bold uppercase shrink-0 cursor-pointer"
                >
                  Reset
                </button>
              </div>
            ) : selectingPointMode !== 'none' ? (
              <div className="bg-blue-950/40 border border-blue-900/50 p-1.5 rounded-lg text-[8px] text-blue-300 font-mono animate-pulse">
                🎯 Click on the map to set your <strong>{selectingPointMode === 'start' ? 'Start' : 'Destination'}</strong>.
              </div>
            ) : null}

            {/* Routing Results integrated inside the panel */}
            {routingResult && (
              <div className="border-t border-slate-800 pt-2 space-y-2 text-[9px] max-h-[140px] overflow-y-auto scrollbar-thin pr-1 text-slate-100">
                <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-2 rounded-xl">
                  <div>
                    <span className="text-slate-500 block font-mono text-[7px] uppercase">{t('risk_assessment', 'RISK ASSESSMENT')}</span>
                    <span className={`font-black font-mono text-[9px] ${
                      routingResult.hazardRisk === 'high' 
                        ? 'text-red-400' 
                        : routingResult.hazardRisk === 'medium'
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}>
                      {routingResult.hazardRisk.toUpperCase()} RISK
                    </span>
                  </div>
                  <div className="text-right flex items-center space-x-3">
                    <div>
                      <span className="text-slate-500 block font-mono text-[7px] uppercase">{t('estimated_eta', 'ESTIMATED ETA')}</span>
                      <span className="font-bold text-slate-200 font-mono text-[9px]">{routingResult.etaMinutes} MINS</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRoutingResult(null)}
                      className="px-1.5 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded text-[8px] font-mono uppercase cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                <p className="text-[8.5px] text-slate-300 leading-normal font-sans bg-slate-900 p-2 rounded-xl border border-slate-800">
                  <strong>🤖 GuardBot:</strong> {routingResult.detourSummary}
                </p>

                {routingResult.bypassedHazards && routingResult.bypassedHazards.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-red-400 font-mono font-extrabold text-[7px] uppercase tracking-wider block">🛡️ {t('avoided_hazards', 'AVOIDED HAZARDS')}:</span>
                    <div className="space-y-1">
                      {routingResult.bypassedHazards.map((h: any, hIdx: number) => (
                        <div key={hIdx} className="bg-red-950/40 border border-red-900/40 p-1 rounded-lg text-slate-300 flex items-start space-x-1 text-[8px]">
                          <span className="text-red-400">⚠️</span>
                          <span className="truncate"><strong className="text-white">{h.title}</strong> ({h.reason})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Interactive Core Map Stage */}
          <div className="w-full flex-1 relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden flex flex-col mt-0">
            
            {/* Map Controls Floating Header - Positioned absolute on top of the Map Viewport */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20 pointer-events-none">
              <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-800 flex items-center space-x-2.5 shadow-xl pointer-events-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                <span className="text-[9px] font-extrabold text-slate-100 tracking-widest uppercase font-mono">
                  {cityNameHeader}
                </span>
              </div>
              
              <div className="bg-slate-950/90 backdrop-blur-md px-2.5 py-1.5 rounded-2xl border border-slate-800 text-[8.5px] font-mono text-slate-300 pointer-events-auto flex items-center space-x-1">
                <Compass className="w-3 h-3 text-emerald-500 animate-spin" style={{ animationDuration: '8s' }} />
                <span>LAT: {centerState.lat.toFixed(4)}°N | LNG: {centerState.lng.toFixed(4)}°E</span>
              </div>
            </div>
            {mapEngine === 'google' ? (
              hasValidKey ? (
                <APIProvider apiKey={API_KEY} version="weekly">
                  <Map
                    center={centerState}
                    zoom={zoomState}
                    onCameraChanged={(ev) => {
                      setCenterState(ev.detail.center);
                      setZoomState(ev.detail.zoom);
                    }}
                    onClick={(ev) => {
                      if (ev.detail.latLng) {
                        const lat = ev.detail.latLng.lat;
                        const lng = ev.detail.latLng.lng;
                        if (selectingPointMode === 'start') {
                          setCustomRouteStart({
                            name: `Point A (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                            lat,
                            lng
                          });
                          setSelectingPointMode('end'); // Auto-advance to destination
                          setRoutingResult(null);
                        } else if (selectingPointMode === 'end') {
                          setCustomRouteEnd({
                            name: `Point B (${lat.toFixed(4)}, ${lng.toFixed(4)})`,
                            lat,
                            lng
                          });
                          setSelectingPointMode('none'); // Done selecting custom points
                          setRoutingResult(null);
                        } else {
                          setAnchorPoint(ev.detail.latLng);
                          if (radiusFilter === 'all') setRadiusFilter(3); // default to 3km
                        }
                      }
                    }}
                    mapId="DEMO_MAP_ID"
                    gestureHandling="greedy"
                    disableDefaultUI={true}
                    zoomControl={true}
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%' }}
                    mapTypeId={mapStyleMode === 'dark' ? 'roadmap' : mapStyleMode}
                    defaultMapOptions={{ styles: mapStyleMode === 'dark' ? darkMapStyle : [] }}
                  >
                    {/* Visual search hub / anchor point marker overlay */}
                    {anchorPoint && (
                      <AdvancedMarker position={anchorPoint} title="Search Hub Center">
                        <div className="relative flex items-center justify-center pointer-events-none">
                          <div className="absolute w-12 h-12 bg-blue-500/20 rounded-full animate-ping border border-blue-400" />
                          <div className="absolute w-6 h-6 bg-blue-500/40 rounded-full animate-pulse border border-blue-300" />
                          <div className="w-3.5 h-3.5 bg-blue-600 rounded-full border-2 border-white shadow-lg flex items-center justify-center">
                            <span className="text-[7px] text-white font-extrabold font-mono">H</span>
                          </div>
                        </div>
                      </AdvancedMarker>
                    )}

                    {/* Google Maps Route Start Anchor Marker */}
                    {(customRouteStart || routeStart) && (() => {
                      const startObj = customRouteStart || PRESET_COORDINATES[routeStart];
                      if (!startObj) return null;
                      return (
                        <AdvancedMarker
                          position={{ lat: startObj.lat, lng: startObj.lng }}
                          title={`Starting Point: ${startObj.name}`}
                        >
                          <div className="relative flex flex-col items-center justify-center pointer-events-none">
                            <div className="absolute w-8 h-8 bg-emerald-500/20 rounded-full animate-ping border border-emerald-400" />
                            <div className="w-4 h-4 bg-emerald-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                              <span className="text-[7px] text-white font-extrabold font-mono">A</span>
                            </div>
                            <div className="bg-slate-900/95 border border-emerald-800/60 px-1.5 py-0.5 rounded text-[7px] text-emerald-200 font-mono mt-1 shadow-md whitespace-nowrap">
                              🟢 {startObj.name}
                            </div>
                          </div>
                        </AdvancedMarker>
                      );
                    })()}

                    {/* Google Maps Route Destination Anchor Marker */}
                    {(customRouteEnd || routeEnd) && (() => {
                      const endObj = customRouteEnd || PRESET_COORDINATES[routeEnd];
                      if (!endObj) return null;
                      return (
                        <AdvancedMarker
                          position={{ lat: endObj.lat, lng: endObj.lng }}
                          title={`Destination Target: ${endObj.name}`}
                        >
                          <div className="relative flex flex-col items-center justify-center pointer-events-none">
                            <div className="absolute w-8 h-8 bg-red-500/20 rounded-full animate-ping border border-red-400" />
                            <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                              <span className="text-[7px] text-white font-extrabold font-mono">B</span>
                            </div>
                            <div className="bg-slate-900/95 border border-red-800/60 px-1.5 py-0.5 rounded text-[7px] text-red-200 font-mono mt-1 shadow-md whitespace-nowrap">
                              🏁 {endObj.name}
                            </div>
                          </div>
                        </AdvancedMarker>
                      );
                    })()}

                    {filteredIssues.map((issue) => {
                      const lat = issue.location.latitude;
                      const lng = issue.location.longitude;
                      const isSelected = selectedIssue?.id === issue.id;

                      let pinBg = '#ef4444'; // Red
                      if (issue.severity === 'low') pinBg = '#10b981'; // Emerald
                      else if (issue.severity === 'medium') pinBg = '#fbbf24'; // Amber

                      return (
                        <AdvancedMarker 
                          key={issue.id} 
                          position={{ lat, lng }} 
                          title={issue.title}
                          onClick={() => {
                            setSelectedIssueId(issue.id);
                            // Also center on it nicely!
                            setCenterState({ lat, lng });
                            setZoomState(15);
                            // Set search anchor to this issue coordinates so they can explore nearby hazards!
                            setAnchorPoint({ lat, lng });
                          }}
                        >
                          <div className={`p-1 px-2.5 rounded-full text-white shadow-xl flex items-center space-x-1 border-2 transition-all cursor-pointer ${
                            isSelected ? 'scale-125 border-emerald-400 bg-slate-900 ring-4 ring-emerald-500/20' : 'bg-slate-950/90 border-slate-700 hover:border-slate-400'
                          }`} style={{ backgroundColor: isSelected ? undefined : pinBg }}>
                            <span className="text-xs">{getCategoryEmoji(issue.category)}</span>
                            {isSelected && <span className="text-[9px] font-mono font-bold tracking-tight pr-1 text-white">{issue.title.substring(0, 12)}...</span>}
                          </div>
                        </AdvancedMarker>
                      );
                    })}

                    {routingResult?.pathSteps?.map((step: any, idx: number) => (
                      <AdvancedMarker
                        key={`route-node-${idx}`}
                        position={{ lat: step.lat, lng: step.lng }}
                        title={step.name}
                      >
                        <div className="relative flex items-center justify-center pointer-events-none">
                          <div className="absolute w-6 h-6 bg-blue-500/30 rounded-full animate-ping border border-blue-400/50" />
                          <div className="w-3 h-3 bg-blue-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
                            <span className="text-[6px] text-white font-bold font-mono">{idx + 1}</span>
                          </div>
                          <div className="absolute top-4 bg-slate-900/95 border border-slate-700 px-1.5 py-0.5 rounded text-[7px] text-blue-200 font-mono whitespace-nowrap">
                            {step.name}
                          </div>
                        </div>
                      </AdvancedMarker>
                    ))}
                  </Map>
                </APIProvider>
              ) : (
                <div className="flex flex-col items-center justify-center h-full p-6 text-center space-y-4 bg-slate-950 text-slate-100 rounded-2xl overflow-y-auto">
                  <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 animate-pulse">
                    <MapIcon className="w-8 h-8" />
                  </div>
                  <div className="space-y-1.5">
                    <h3 className="text-xs font-extrabold font-mono uppercase tracking-wider text-white">Google Maps API Key Required</h3>
                    <p className="text-[10px] text-slate-400 max-w-sm leading-relaxed">
                      To unlock actual satellite, terrain, and geocoded maps of interactive city hubs across India, please connect your Google Maps Platform API Key.
                    </p>
                  </div>
                  <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 text-left space-y-2 max-w-xs w-full text-[9px] font-mono leading-relaxed">
                    <p className="text-slate-300 font-sans font-bold text-[10px]">Follow these steps:</p>
                    <p className="text-slate-400">1. <a href="https://console.cloud.google.com/google/maps-apis/start?utm_campaign=gmp-code-assist-ais" target="_blank" rel="noopener noreferrer" className="text-emerald-400 underline hover:text-emerald-300">Get an API Key</a> from GCP</p>
                    <p className="text-slate-400">2. Open <span className="text-slate-200">Settings</span> (⚙️ gear icon, top-right)</p>
                    <p className="text-slate-400">3. Select <span className="text-slate-200">Secrets</span> and create <code className="text-emerald-400 bg-emerald-950/40 px-1 py-0.5 rounded">GOOGLE_MAPS_PLATFORM_KEY</code></p>
                    <p className="text-slate-400">4. Paste your key and press Enter</p>
                  </div>
                  <button
                    onClick={() => setMapEngine('vector')}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-[9px] font-extrabold font-mono uppercase tracking-wider transition-all cursor-pointer"
                  >
                    ← Use Fallback Vector Map
                  </button>
                </div>
              )
            ) : (
              <div className="w-full h-full relative" onClick={handleVectorMapClick}>
                {/* Grid Matrix backdrop */}
                <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 opacity-10 pointer-events-none">
                  {Array.from({ length: 144 }).map((_, i) => (
                    <div key={i} className="border-t border-l border-emerald-500/20" />
                  ))}
                </div>

                {/* Simulated Central Park - heart of New Delhi */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="lakeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#1e3a8a" stopOpacity="0.4" />
                      <stop offset="50%" stopColor="#2563eb" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#1e40af" stopOpacity="0.4" />
                    </linearGradient>
                    <linearGradient id="roadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#34d399" stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                  
                  {/* Hussain Sagar Lake representation */}
                  <path 
                    d="M 160 220 C 190 200, 260 210, 270 240 C 280 270, 240 330, 200 320 C 160 310, 130 240, 160 220 Z" 
                    fill="url(#lakeGradient)" 
                    stroke="#3b82f6" 
                    strokeWidth="1" 
                    strokeDasharray="2 3"
                    className="opacity-90"
                  />
                  
                  {/* Major Ring Roads & Expressways */}
                  <path d="M 0 120 C 150 180, 350 140, 500 160" stroke="url(#roadGradient)" strokeWidth="6" fill="none" />
                  <path d="M 120 0 C 180 240, 110 380, 140 500" stroke="url(#roadGradient)" strokeWidth="4" fill="none" />
                  <path d="M 320 0 C 280 180, 390 350, 420 500" stroke="url(#roadGradient)" strokeWidth="3.5" fill="none" />
                  <path d="M 0 420 H 500" stroke="url(#roadGradient)" strokeWidth="5" fill="none" />
                </svg>

                {/* Geographical landmark text identifiers on map */}
                <div className="absolute top-1/2 left-[38%] -translate-y-1/2 -translate-x-1/2 pointer-events-none opacity-40 select-none">
                  <span className="text-[9px] font-black tracking-widest text-blue-400 uppercase font-mono">{labelLake}</span>
                </div>
                <div className="absolute top-[12%] left-[15%] pointer-events-none opacity-30 select-none text-[9px] font-bold text-slate-400 uppercase font-mono">
                  {labelNorthWest}
                </div>
                <div className="absolute top-[18%] right-[10%] pointer-events-none opacity-30 select-none text-[9px] font-bold text-slate-400 uppercase font-mono">
                  {labelNorthEast}
                </div>
                <div className="absolute bottom-[20%] left-[25%] pointer-events-none opacity-30 select-none text-[9px] font-bold text-slate-400 uppercase font-mono">
                  {labelSouthWest}
                </div>
                <div className="absolute bottom-[10%] right-[20%] pointer-events-none opacity-30 select-none text-[9px] font-bold text-slate-400 uppercase font-mono">
                  {labelSouthEast}
                </div>

                {/* Map Quadrant Interactive hover detectors */}
                <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
                  {[
                    `North West (${labelNorthWest} Block)`,
                    `North East (${labelNorthEast} Block)`,
                    `South West (${labelSouthWest} Sector)`,
                    `South East (${labelSouthEast} Block)`
                  ].map((wardName, wIdx) => (
                    <div
                      key={wIdx}
                      onMouseEnter={() => setHoveredWard(wardName)}
                      onMouseLeave={() => setHoveredWard(null)}
                      onClick={() => setSelectedWard(wardName)}
                      className="hover:bg-emerald-500/[0.02] cursor-crosshair transition-colors duration-200 relative group"
                    >
                      <div className="absolute bottom-2 left-2 bg-slate-950/70 border border-slate-800/80 rounded-lg px-2 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-[8px] font-mono text-slate-400">
                        Sectors Grid {wIdx+1}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Fallback Vector Map Route Drawing */}
                {routingResult?.pathSteps && (
                  <>
                    <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                      <path
                        d={routingResult.pathSteps.map((step: any, idx: number) => {
                          const { x, y } = getGridCoords(step.lat, step.lng);
                          return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                        }).join(' ')}
                        stroke="#3b82f6"
                        strokeWidth="1.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        className="animate-pulse"
                        strokeDasharray="2 2"
                      />
                    </svg>

                    {routingResult.pathSteps.map((step: any, idx: number) => {
                      const { x, y } = getGridCoords(step.lat, step.lng);
                      return (
                        <div
                          key={`fallback-route-node-${idx}`}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-auto group"
                        >
                          <div className="w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white shadow-md flex items-center justify-center cursor-pointer hover:scale-125 transition-transform" />
                          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/95 border border-slate-800 px-1.5 py-0.5 rounded text-[7px] text-blue-200 font-mono whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {step.name}
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Fallback Vector Map Custom Start Pin */}
                {(customRouteStart || routeStart) && (() => {
                  const startObj = customRouteStart || PRESET_COORDINATES[routeStart];
                  if (!startObj) return null;
                  const { x, y } = getGridCoords(startObj.lat, startObj.lng);
                  return (
                    <div
                      style={{ left: `${x}%`, top: `${y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-auto"
                    >
                      <div className="relative flex flex-col items-center justify-center">
                        <div className="absolute w-6 h-6 bg-emerald-500/25 rounded-full animate-ping border border-emerald-400" />
                        <div className="w-3.5 h-3.5 bg-emerald-600 rounded-full border border-white shadow-md flex items-center justify-center">
                          <span className="text-[6px] text-white font-extrabold font-mono">A</span>
                        </div>
                        <div className="bg-slate-950/95 border border-emerald-800/60 px-1.5 py-0.5 rounded text-[6.5px] text-emerald-200 font-mono mt-1 shadow-md whitespace-nowrap">
                          🟢 {startObj.name}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Fallback Vector Map Custom End Pin */}
                {(customRouteEnd || routeEnd) && (() => {
                  const endObj = customRouteEnd || PRESET_COORDINATES[routeEnd];
                  if (!endObj) return null;
                  const { x, y } = getGridCoords(endObj.lat, endObj.lng);
                  return (
                    <div
                      style={{ left: `${x}%`, top: `${y}%` }}
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-25 pointer-events-auto"
                    >
                      <div className="relative flex flex-col items-center justify-center">
                        <div className="absolute w-6 h-6 bg-red-500/25 rounded-full animate-ping border border-red-400" />
                        <div className="w-3.5 h-3.5 bg-red-600 rounded-full border border-white shadow-md flex items-center justify-center">
                          <span className="text-[6px] text-white font-extrabold font-mono">B</span>
                        </div>
                        <div className="bg-slate-950/95 border border-red-800/60 px-1.5 py-0.5 rounded text-[6.5px] text-red-200 font-mono mt-1 shadow-md whitespace-nowrap">
                          🛑 {endObj.name}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* RENDER MODE A: Live Heatmap glowing vectors */}
                {viewMode === 'heatmap' && (
                  <AnimatePresence>
                    {filteredIssues.map((issue) => {
                      const { x, y } = getGridCoords(issue.location.latitude, issue.location.longitude);
                      let pulseColor = 'rgba(239, 68, 68, '; // Red for high/crit
                      if (issue.severity === 'low') pulseColor = 'rgba(16, 185, 129, ';
                      else if (issue.severity === 'medium') pulseColor = 'rgba(245, 158, 11, ';

                      return (
                        <motion.div
                          key={`heat-${issue.id}`}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center z-10"
                        >
                          <div
                            style={{ backgroundColor: `${pulseColor} 0.12)` }}
                            className="w-24 h-24 rounded-full animate-ping absolute"
                          />
                          <div
                            style={{ backgroundColor: `${pulseColor} 0.22)` }}
                            className="w-12 h-12 rounded-full animate-pulse absolute"
                          />
                          <div
                            style={{ backgroundColor: `${pulseColor} 0.85)` }}
                            className="w-3.5 h-3.5 rounded-full shadow-lg border-2 border-white"
                          />
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}

                {/* RENDER MODE B: Detailed Interactive Location Pins */}
                {viewMode === 'pins' && (
                  <AnimatePresence>
                    {filteredIssues.map((issue) => {
                      const { x, y } = getGridCoords(issue.location.latitude, issue.location.longitude);
                      const isSelected = selectedIssue?.id === issue.id;

                      let pinBg = 'bg-red-500 shadow-red-500/30';
                      if (issue.severity === 'low') pinBg = 'bg-emerald-500 shadow-emerald-500/30';
                      else if (issue.severity === 'medium') pinBg = 'bg-amber-400 shadow-amber-400/30';

                      return (
                        <motion.button
                          key={`pin-${issue.id}`}
                          initial={{ scale: 0, y: -20 }}
                          animate={{ scale: isSelected ? 1.25 : 1, y: 0 }}
                          whileHover={{ scale: 1.35, zIndex: 50 }}
                          style={{ left: `${x}%`, top: `${y}%` }}
                          onClick={() => setSelectedIssueId(issue.id)}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all ${
                            isSelected ? 'z-30' : 'z-20'
                          }`}
                        >
                          <div className="relative flex flex-col items-center">
                            {/* Hover visual title box */}
                            <div className="absolute bottom-full mb-1.5 bg-slate-950 border border-slate-800 text-[9px] font-bold text-slate-100 px-2 py-1 rounded-lg shadow-2xl opacity-0 hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                              {getCategoryEmoji(issue.category)} {issue.title}
                            </div>
                            
                            {/* High-fidelity custom pins layout */}
                            <div className={`p-2 rounded-xl ${pinBg} text-white shadow-xl flex items-center justify-center border-2 border-slate-900 transition-transform ${
                              isSelected ? 'scale-110 border-white' : ''
                            }`}>
                              <span className="text-[10px] font-black">{getCategoryEmoji(issue.category)}</span>
                            </div>
                            
                            {/* Indicator pulse only for critical safety hazards */}
                            {(issue.severity === 'critical' || issue.severity === 'high') && (
                              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border border-white animate-pulse" />
                            )}
                            <div className={`w-1.5 h-1.5 rotate-45 -mt-1 border-r border-b border-slate-900 ${pinBg}`} />
                          </div>
                        </motion.button>
                      );
                    })}
                  </AnimatePresence>
                )}
              </div>
            )}


          </div>

          {/* Interactive Map Footer telemetry panel */}
          <div className="mt-3 bg-slate-950 p-3 rounded-2xl border border-slate-800/80 flex flex-col md:flex-row justify-between items-start md:items-center text-[10px] text-slate-300 font-mono space-y-2 md:space-y-0">
            <div className="flex items-center space-x-1.5">
              <Compass className="w-3.5 h-3.5 text-emerald-500" />
              <span>ACTIVE SCAN:</span>
              <span className="text-emerald-400 font-bold">{hoveredWard || selectedWard || "Move cursor to inspect wards"}</span>
            </div>
            <div className="flex space-x-3 text-[9px] text-slate-400">
              <span>🚧 Roads</span>
              <span>💧 Water</span>
              <span>🗑️ Garbage</span>
              <span>💡 Lights</span>
            </div>
          </div>
        </div>

        {/* DETAILED INCIDENT ACCOUNTABILITY PANEL (Right 4 Columns) */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-slate-200/80 shadow-md p-5 lg:h-[650px] h-[560px] flex flex-col justify-between overflow-hidden">
          {selectedIssue ? (
            <div className="h-full flex flex-col justify-between overflow-hidden">
              <div className="overflow-y-auto flex-1 pr-1 space-y-4">
                
                {/* Visual Header card */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`text-[9px] font-extrabold uppercase bg-emerald-50 text-emerald-800 border border-emerald-100 px-2 py-0.5 rounded-md font-mono`}>
                        {getCategoryEmoji(selectedIssue.category)} {selectedIssue.category}
                      </span>
                      <span className="text-[9px] text-slate-400 font-mono">ID: #{selectedIssue.id.substring(0,6)}</span>
                    </div>
                    <h2 className="text-sm font-extrabold text-slate-950 mt-2 tracking-tight leading-snug">
                      {selectedIssue.title}
                    </h2>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">{selectedIssue.address}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-xl text-[9px] font-extrabold uppercase font-mono border ${
                    selectedIssue.severity === 'critical' ? 'bg-rose-50 text-rose-700 border-rose-100' :
                    selectedIssue.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                    selectedIssue.severity === 'medium' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                    'bg-emerald-50 text-emerald-700 border-emerald-100'
                  }`}>
                    {selectedIssue.severity}
                  </span>
                </div>

                {/* SLA countdown and dynamic resolution SLA status (Feature 1) */}
                {selectedIssue.status !== 'resolved' && (
                  (() => {
                    const hoursMap: Record<string, number> = {
                      pothole: 72,
                      water: 48,
                      light: 24,
                      garbage: 48,
                      traffic: 48,
                      drainage: 48,
                      other: 72
                    };
                    const allowedHours = hoursMap[selectedIssue.category] || 48;
                    const reportedDate = new Date(selectedIssue.timeline.reportedAt);
                    const expiryDate = new Date(reportedDate.getTime() + allowedHours * 60 * 60 * 1000);
                    const now = new Date();
                    const remainingMs = expiryDate.getTime() - now.getTime();
                    const isBreached = remainingMs <= 0;
                    
                    const totalMs = allowedHours * 60 * 60 * 1000;
                    const percent = isBreached ? 100 : Math.max(0, Math.min(100, (remainingMs / totalMs) * 100));
                    
                    const remHours = Math.max(0, Math.floor(Math.abs(remainingMs) / (1000 * 60 * 60)));
                    const remMinutes = Math.max(0, Math.floor((Math.abs(remainingMs) % (1000 * 60 * 60)) / (1000 * 60)));

                    const radius = 22;
                    const circumference = 2 * Math.PI * radius;
                    const strokeDashoffset = circumference - (percent / 100) * circumference;

                    return (
                      <div className={`p-4 rounded-2xl border ${
                        isBreached 
                          ? 'bg-rose-50/50 border-rose-200 text-rose-800 shadow-[inset_0_0_12px_rgba(244,63,94,0.04)]' 
                          : remainingMs < 12 * 3600 * 1000
                          ? 'bg-amber-50/50 border-amber-200 text-amber-900 shadow-[inset_0_0_12px_rgba(245,158,11,0.04)]'
                          : 'bg-slate-50/80 border-slate-200 text-slate-700 shadow-2xs'
                      } flex items-center space-x-4`}>
                        {/* Circular SLA Ring */}
                        <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                          <svg className="w-full h-full transform -rotate-90">
                            <circle
                              cx="28"
                              cy="28"
                              r={radius}
                              className="stroke-slate-200/60"
                              strokeWidth="3.5"
                              fill="transparent"
                            />
                            <motion.circle
                              cx="28"
                              cy="28"
                              r={radius}
                              className={`${
                                isBreached 
                                  ? 'stroke-rose-500' 
                                  : remainingMs < 12 * 3600 * 1000
                                  ? 'stroke-amber-400'
                                  : 'stroke-emerald-500'
                              }`}
                              strokeWidth="3.5"
                              fill="transparent"
                              strokeDasharray={circumference}
                              initial={{ strokeDashoffset: circumference }}
                              animate={{ strokeDashoffset }}
                              transition={{ duration: 1 }}
                            />
                          </svg>
                          <div className="absolute flex flex-col items-center justify-center font-mono">
                            <span className={`text-[10px] font-black ${isBreached ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                              {isBreached ? '!' : `${Math.round(percent)}%`}
                            </span>
                          </div>
                        </div>

                        <div className="flex-1 space-y-1">
                          <div className="flex justify-between items-center text-[10px] font-mono font-black">
                            <span className="flex items-center space-x-1.5 uppercase tracking-wide">
                              <Clock className={`w-3.5 h-3.5 ${isBreached ? 'text-rose-600 animate-pulse' : 'text-slate-400'}`} />
                              <span>SLA COUNTDOWN</span>
                            </span>
                            <span className={`${isBreached ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`}>
                              {isBreached ? 'BREACHED' : 'IN COMPLIANCE'}
                            </span>
                          </div>
                          
                          <p className="text-[12px] font-extrabold text-slate-950 leading-none">
                            {isBreached 
                              ? `Breached by ${remHours}h ${remMinutes}m` 
                              : `${remHours}h ${remMinutes}m remaining`}
                          </p>

                          <div className="flex justify-between items-center text-[9px] font-mono text-slate-400 font-bold pt-0.5">
                            <span>SLA Window: {allowedHours}h</span>
                            {isBreached ? (
                              <span className="text-rose-500 font-extrabold animate-pulse">⚠️ ESCALATED TO P1</span>
                            ) : (
                              <span>Healthy</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Attached Incident Evidence photo */}
                {selectedIssue.photoUrl && (
                  <div className="rounded-2xl overflow-hidden border border-slate-150 h-32 relative bg-slate-100 shadow-inner group">
                    <img
                      src={selectedIssue.photoUrl}
                      alt={selectedIssue.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover transition-transform group-hover:scale-102 duration-300"
                    />
                    <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-md text-[8px] font-bold text-slate-100 px-2.5 py-1 rounded-lg border border-slate-800 font-mono">
                      CIVIC LEDGER EVIDENCE
                    </div>
                  </div>
                )}

                {/* Description comment */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/50 space-y-1 shadow-2xs">
                  <span className="text-[8px] font-black tracking-wider text-slate-400 uppercase font-mono block">CITIZEN DESCRIPTION</span>
                  <p className="text-xs text-slate-700 leading-relaxed font-sans">
                    {selectedIssue.description}
                  </p>
                  {selectedIssue.voiceUrl && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-[9px] font-bold font-mono text-slate-500">Citizen Audio:</span>
                      </div>
                      <audio controls src={selectedIssue.voiceUrl} className="h-6 max-w-[170px] md:max-w-[210px] text-[10px] focus:outline-none" />
                    </div>
                  )}
                </div>

                {/* HIGH-TECH AI INSPECTION CERTIFICATE */}
                {selectedIssue.photoAnalysis && (
                  <motion.div 
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-br from-emerald-50/20 to-emerald-100/10 p-4 rounded-2xl border border-emerald-500/20 space-y-2.5 relative"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-extrabold text-emerald-800 tracking-wider uppercase font-mono flex items-center space-x-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Gemini Auto-Routing Certificate</span>
                      </h4>
                      <span className="text-[8px] font-mono font-black bg-emerald-600/10 text-emerald-800 border border-emerald-200/30 px-1.5 py-0.5 rounded">
                        {selectedIssue.photoAnalysis.confidence}% Match
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="bg-white/80 p-2 rounded-xl border border-emerald-500/5 shadow-2xs">
                        <span className="text-slate-400 block text-[8px] uppercase">PRESCRIBED REMEDY</span>
                        <span className="font-extrabold text-emerald-800 block text-[9px] mt-0.5 line-clamp-1">{selectedIssue.photoAnalysis.requiredAction}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-emerald-500/5 shadow-2xs">
                        <span className="text-slate-400 block text-[8px] uppercase">RESPONSIBLE WARD</span>
                        <span className="font-bold text-slate-800 block text-[9px] mt-0.5 truncate">{selectedIssue.photoAnalysis.recommendedAuthority}</span>
                      </div>
                    </div>
                    
                    <div className="text-[10px] leading-relaxed text-slate-600 font-sans border-t border-emerald-500/10 pt-2">
                      <span className="font-extrabold text-emerald-800 font-mono text-[8px] block uppercase">ASSESSMENT SCOPE:</span>
                      {selectedIssue.photoAnalysis.impactAssessment}
                    </div>
                  </motion.div>
                )}

                {/* 🤖 AGENTIC DISPATCH & ENGINEERING AUDIT */}
                {selectedIssue.aiAudit ? (
                  <motion.div 
                    initial={{ scale: 0.98, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-gradient-to-br from-purple-50/40 to-indigo-100/10 p-4 rounded-2xl border border-purple-500/20 space-y-3 relative shadow-xs text-left"
                  >
                    <div className="flex justify-between items-center">
                      <h4 className="text-[10px] font-extrabold text-purple-800 tracking-wider uppercase font-mono flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 animate-pulse" />
                        <span>GuardBot Dispatch & Engineering Audit</span>
                      </h4>
                      <span className={`text-[8px] font-mono font-black border px-2 py-0.5 rounded-md ${
                        selectedIssue.aiAudit.slaFailureRisk === 'high' 
                          ? 'bg-red-50 text-red-700 border-red-200' 
                          : selectedIssue.aiAudit.slaFailureRisk === 'medium'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        SLA RISK: {selectedIssue.aiAudit.slaFailureRisk.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-[10px] leading-relaxed text-slate-600 font-sans bg-white/50 p-2.5 rounded-xl border border-purple-500/5">
                      <span className="font-extrabold text-purple-800 font-mono text-[8px] block uppercase mb-0.5">TECHNICAL ENGINEERING ASSESSMENT:</span>
                      {selectedIssue.aiAudit.engineeringAssessment}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                      <div className="bg-white/80 p-2 rounded-xl border border-purple-500/5 shadow-2xs">
                        <span className="text-slate-400 block text-[8px] uppercase">REQUIRED SUBUNIT</span>
                        <span className="font-extrabold text-purple-900 block text-[9px] mt-0.5 truncate">{selectedIssue.aiAudit.requiredSubunit}</span>
                      </div>
                      <div className="bg-white/80 p-2 rounded-xl border border-purple-500/5 shadow-2xs">
                        <span className="text-slate-400 block text-[8px] uppercase">CREW STATUS</span>
                        <span className="font-bold text-slate-800 block text-[9px] mt-0.5 flex items-center space-x-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping shrink-0" />
                          <span>Dispatched</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <span className="font-extrabold text-purple-800 font-mono text-[8px] block uppercase">AUTONOMOUS DISPATCH BLUEPRINT:</span>
                      <div className="space-y-1.5">
                        {selectedIssue.aiAudit.patchSteps.map((step, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-[9px] text-slate-600 font-sans">
                            <span className="w-4 h-4 bg-purple-100 text-purple-800 rounded-md font-mono font-bold text-[8px] flex items-center justify-center shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="leading-tight">{step}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex flex-col items-center justify-center text-center space-y-3">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-full border border-purple-100">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-extrabold text-slate-800 font-mono uppercase">GuardBot Audit Blueprint</h4>
                      <p className="text-[9px] text-slate-400 max-w-xs">
                        Generate engineering patch steps and SLA risk metrics for this coordinate locus.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        if (auditingIssueId) return;
                        setAuditingIssueId(selectedIssue.id);
                        try {
                          await fetch('/api/agentic-audit', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              issueId: selectedIssue.id,
                              title: selectedIssue.title,
                              description: selectedIssue.description,
                              category: selectedIssue.category,
                              severity: selectedIssue.severity,
                              address: selectedIssue.address
                            })
                          });
                        } catch (err) {
                          console.error("Manual audit failed:", err);
                        } finally {
                          setAuditingIssueId(null);
                        }
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 active:scale-98 text-white rounded-xl text-[9px] font-black font-mono uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm shadow-purple-500/10"
                    >
                      {auditingIssueId === selectedIssue.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>Generating Dispatch...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3 h-3 text-white" />
                          <span>Request GuardBot Dispatch Audit</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Upvotes consensus checks (Feature 2) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-200/60">
                    <div className="flex flex-col text-left">
                      <span className="text-[8px] font-extrabold text-slate-400 font-mono uppercase">CONGREGATION VERIFICATION</span>
                      <span className="text-[10px] text-slate-600 font-semibold font-sans mt-0.5">Do you verify this hazard exists?</span>
                    </div>
                    
                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => onVote(selectedIssue.id, 'up')}
                        className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-2xs cursor-pointer"
                        title="Verify and Upvote"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                        <span>{selectedIssue.verificationStatus.upvotes}</span>
                      </button>
                      
                      <button
                        onClick={() => onVote(selectedIssue.id, 'down')}
                        className="p-2 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-rose-600 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 shadow-2xs cursor-pointer"
                        title="Report Spurious/Spam"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                        <span>{selectedIssue.verificationStatus.downvotes}</span>
                      </button>

                      {selectedIssue.verificationStatus.upvotes >= 5 && (
                        <span className="bg-emerald-500 text-white text-[8px] font-black px-2 py-1 rounded-lg font-mono flex items-center space-x-0.5 shadow-md shadow-emerald-500/10 border border-emerald-400">
                          <CheckCircle className="w-3 h-3 text-white" />
                          <span>CITIZEN CONFIRMED</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Citizen Endorsement Avatar list */}
                  {selectedIssue.verificationStatus.upvotes > 0 && (
                    <div className="flex items-center justify-between bg-slate-50/50 p-2.5 px-3 rounded-xl border border-slate-200/40">
                      <div className="flex items-center space-x-2">
                        {/* Avatar stack */}
                        <div className="flex -space-x-2">
                          {Array.from({ length: Math.min(5, selectedIssue.verificationStatus.upvotes) }).map((_, idx) => (
                            <img
                              key={idx}
                              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=voter_${selectedIssue.id}_${idx}`}
                              alt="Voter"
                              className="w-5.5 h-5.5 rounded-full border border-white shadow-2xs bg-slate-100"
                            />
                          ))}
                          {selectedIssue.verificationStatus.upvotes > 5 && (
                            <div className="w-5.5 h-5.5 rounded-full border border-white bg-slate-200 text-[8px] font-bold flex items-center justify-center text-slate-600 font-mono shadow-2xs">
                              +{selectedIssue.verificationStatus.upvotes - 5}
                            </div>
                          )}
                        </div>
                        <span className="text-[9px] text-slate-500 font-sans font-semibold">
                          Verified by {selectedIssue.verificationStatus.upvotes} neighborhood {selectedIssue.verificationStatus.upvotes === 1 ? 'guardian' : 'guardians'}
                        </span>
                      </div>
                      <span className="text-[8px] font-mono text-emerald-600 font-bold bg-emerald-50/60 border border-emerald-100/40 px-1.5 py-0.5 rounded-md">
                        ACTIVE CONSENSUS
                      </span>
                    </div>
                  )}
                </div>

                {/* Resolution timeline steps */}
                <div className="space-y-2.5">
                  <h4 className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider">Operational Audit timeline</h4>
                  <div className="border-l border-slate-200 pl-3.5 ml-2 space-y-4 relative">
                    
                    {/* Item 1 */}
                    <div className="relative">
                      <span className="absolute -left-[20.5px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-100" />
                      <p className="text-[10px] font-extrabold text-slate-900 leading-none">Hazard Filed</p>
                      <p className="text-[8px] text-slate-400 font-mono mt-1">
                        {new Date(selectedIssue.timeline.reportedAt).toLocaleString()}
                      </p>
                    </div>

                    {/* Item 2 */}
                    {selectedIssue.timeline.verifiedAt && (
                      <div className="relative">
                        <span className="absolute -left-[20.5px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white ring-4 ring-emerald-100" />
                        <p className="text-[10px] font-extrabold text-slate-900 leading-none">Automated Routing Completed</p>
                        <p className="text-[8px] text-slate-400 font-mono mt-1">
                          {new Date(selectedIssue.timeline.verifiedAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Item 3 */}
                    {selectedIssue.timeline.assignedAt && (
                      <div className="relative">
                        <span className="absolute -left-[20.5px] top-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 border-2 border-white ring-4 ring-amber-100" />
                        <p className="text-[10px] font-extrabold text-slate-900 leading-none">
                          Routed to: {selectedIssue.assignedDepartment}
                        </p>
                        {selectedIssue.assignedOfficer && (
                          <p className="text-[9px] font-bold text-slate-600 font-sans mt-0.5">Assigned: {selectedIssue.assignedOfficer}</p>
                        )}
                        <p className="text-[8px] text-slate-400 font-mono mt-1">
                          {new Date(selectedIssue.timeline.assignedAt).toLocaleString()}
                        </p>
                      </div>
                    )}

                    {/* Item 4 */}
                    {selectedIssue.status === 'resolved' && selectedIssue.timeline.resolvedAt && (
                      <div className="relative">
                        <span className="absolute -left-[20.5px] top-0.5 w-2.5 h-2.5 rounded-full bg-emerald-600 border-2 border-white ring-4 ring-emerald-100 animate-pulse" />
                        <p className="text-[10px] font-extrabold text-emerald-800 leading-none">Repaired & Completed ✅</p>
                        <p className="text-[8px] text-slate-400 font-mono mt-1">
                          {new Date(selectedIssue.timeline.resolvedAt).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Discussions log bubble feed */}
                <div className="border-t border-slate-100 pt-3.5 space-y-2.5">
                  <h4 className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider flex items-center space-x-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                    <span>Citizen Dispatch Discussion ({(Array.isArray(selectedIssue.updates) ? selectedIssue.updates : []).length})</span>
                  </h4>
                  
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {(Array.isArray(selectedIssue.updates) ? selectedIssue.updates : []).map((update, index) => {
                      let tagBg = 'bg-slate-100 text-slate-600';
                      let roleLabel = 'Citizen';
                      if (update.byRole === 'system') {
                        tagBg = 'bg-emerald-50 text-emerald-800 border border-emerald-100/50';
                        roleLabel = 'System Ledger';
                      } else if (update.byRole === 'officer') {
                        tagBg = 'bg-amber-50 text-amber-800 border border-amber-100/50';
                        roleLabel = 'Municipal Officer';
                      }

                      return (
                        <div key={index} className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200/50 text-[10px]">
                          <div className="flex justify-between items-center text-[8px] text-slate-400 font-mono mb-1">
                            <span className={`font-bold px-1.5 py-0.2 rounded ${tagBg}`}>
                              {roleLabel}
                            </span>
                            <span>{new Date(update.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-slate-700 font-sans leading-relaxed">{update.message}</p>
                        </div>
                      );
                    })}
                    {(!selectedIssue.updates || !Array.isArray(selectedIssue.updates) || selectedIssue.updates.length === 0) && (
                      <div className="text-center py-4 text-slate-400 font-mono text-[9px]">
                        No dispatch updates on this ledger entry yet.
                      </div>
                    )}
                  </div>

                  {/* Add update comment input form */}
                  <form onSubmit={handleCommentSubmit} className="flex space-x-2 mt-2">
                    <input
                      type="text"
                      placeholder="Contribute information or coordinate..."
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-xl text-xs px-3 py-2 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-emerald-600/10"
                    >
                      Post
                    </button>
                  </form>
                </div>

              </div>
            </div>
          ) : (
            <div className="text-center my-auto space-y-2">
              <MapIcon className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400">Select any reported incident pin on the map to audit live repair logs.</p>
            </div>
          )}
        </div>

      </div>

      {/* Ward Alerts SMS Subscription & Dispatch Logs Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
        
        {/* Subscription Form Card */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-5 text-left">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <Compass className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-wider uppercase font-mono">{t('ward_alerts_subscription', 'Ward Alerts Subscription Gateway')}</h3>
              <p className="text-[10px] text-slate-500 font-sans mt-0.5">{t('subscribe_leaders_desc', 'Subscribe neighborhood leaders and local residents to live critical safety bulletins')}</p>
            </div>
          </div>

          <form onSubmit={handleSubscribeSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('full_name_role', 'Full Name / Role')}</label>
                <input
                  type="text"
                  placeholder={t('placeholder_fullname', 'e.g. Corporator Reddy')}
                  value={subscriberName}
                  onChange={(e) => setSubscriberName(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs py-2 px-3.5 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('mobile_number_sms', 'Mobile Number (SMS/WhatsApp)')}</label>
                <input
                  type="tel"
                  placeholder={t('placeholder_mobile', 'e.g. +91-98765-43210')}
                  value={subscriberPhone}
                  onChange={(e) => setSubscriberPhone(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs py-2 px-3.5 focus:outline-none transition-all placeholder:text-slate-400"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('target_ward_jurisdiction', 'Target Ward Jurisdiction')}</label>
                <select
                  value={subscriberWard}
                  onChange={(e) => setSubscriberWard(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-emerald-500 focus:bg-white rounded-xl text-xs py-2 px-3 focus:outline-none font-semibold text-slate-700"
                >
                  <option value="All">{t('ward_all', 'All Wards (Global Lead)')}</option>
                  <option value="Central Delhi">{t('ward_central_delhi', 'Central Delhi Ward')}</option>
                  <option value="South Delhi">{t('ward_south_delhi', 'South Delhi Ward')}</option>
                  <option value="Connaught Place">{t('ward_connaught_place', 'Connaught Place Ward')}</option>
                  <option value="Karol Bagh">{t('ward_karol_bagh', 'Karol Bagh Ward')}</option>
                  <option value="Noida Sector">{t('ward_noida_sector', 'Noida Sector Ward')}</option>
                  <option value="Marine Drive">{t('ward_marine_drive', 'Marine Drive Ward')}</option>
                  <option value="Brigade Road">{t('ward_brigade_road', 'Brigade Road Ward')}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">{t('dispatch_channel', 'Dispatch Channel')}</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl border border-slate-200/40">
                  <button
                    type="button"
                    onClick={() => setSubscriberChannel('sms')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      subscriberChannel === 'sms'
                        ? 'bg-white text-slate-900 shadow-xs border border-slate-200/40'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{t('sms_text_channel', '💬 SMS Text')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubscriberChannel('whatsapp')}
                    className={`py-1.5 px-2 rounded-lg text-[10px] font-bold flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      subscriberChannel === 'whatsapp'
                        ? 'bg-white text-emerald-700 shadow-xs border border-slate-200/40'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    <span>{t('whatsapp_channel', '🟢 WhatsApp')}</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubscribing}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-mono font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md shadow-emerald-600/10 flex items-center justify-center space-x-1.5"
            >
              {isSubscribing ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{t('subscribing', 'Subscribing...')}</span>
                </>
              ) : (
                <>
                  <span>{t('subscribe_to_ward_alerts_btn', 'Subscribe to Ward Alerts')}</span>
                </>
              )}
            </button>
          </form>

          {/* Active Subscribers Roll list */}
          <div className="space-y-2 border-t border-slate-100 pt-4">
            <span className="text-[9px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block">
              {t('active_ward_observers', 'Active Ward Observers ({count})').replace('{count}', subscribersList.length.toString())}
            </span>
            <div className="flex flex-wrap gap-2 max-h-[110px] overflow-y-auto pr-1">
              {subscribersList.map((sub, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-2 px-3 text-[10px] flex items-center space-x-2 shadow-2xs">
                  <img
                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=sub_${sub.name}`}
                    alt={sub.name}
                    className="w-5 h-5 rounded-full bg-slate-200"
                  />
                  <div>
                    <strong className="text-slate-800 font-sans block leading-none">{sub.name}</strong>
                    <span className="text-[8px] text-slate-400 font-mono block mt-0.5">
                      {getWardTranslationKey(sub.ward) ? t(getWardTranslationKey(sub.ward), sub.ward) : sub.ward} • {sub.channel?.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Real-time SMS Dispatch Carrier logs */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col justify-between overflow-hidden h-full text-left">
          <div className="space-y-4 flex-1 flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <Navigation className="w-4 h-4 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-100 tracking-wider uppercase font-mono">{t('live_dispatch_feed', 'Live SMS/WhatsApp Dispatch Feed')}</h3>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">{t('live_dispatch_feed_desc', 'Real-time telemetry and logs of Twilio carrier message dispatches')}</p>
                </div>
              </div>
              <span className="text-[8px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-mono font-bold uppercase animate-pulse">
                {t('carrier_connected', 'Carrier Connected')}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1 flex-1 min-h-[250px]">
              {alertsLog.map((log, idx) => (
                <motion.div
                  key={log.id || idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-slate-950 border border-slate-850 p-3 rounded-2xl space-y-2 text-[10px] font-mono shadow-inner"
                >
                  <div className="flex justify-between items-center text-[8px] text-slate-400 border-b border-slate-850 pb-1.5">
                    <div className="flex items-center space-x-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${log.channel === 'whatsapp' ? 'bg-emerald-500' : 'bg-blue-400'}`} />
                      <strong className="text-slate-200">{log.recipientName} ({log.recipientPhone})</strong>
                    </div>
                    <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  
                  <p className="text-slate-300 font-sans leading-relaxed text-[10.5px]">
                    {log.message}
                  </p>

                  <div className="flex justify-between items-center text-[7.5px] pt-1">
                    <span className="text-slate-500">GATEWAY: TWILIO_LIVE_PROXY_A</span>
                    <span className="bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-md font-bold uppercase border border-emerald-500/20">
                      ● Delivered
                    </span>
                  </div>
                </motion.div>
              ))}

              {alertsLog.length === 0 && (
                <div className="flex flex-col items-center justify-center h-48 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 text-lg">
                    📢
                  </div>
                  <p className="text-xs text-slate-400">{t('no_telemetry_alerts', 'No telemetry alerts dispatched yet.')}</p>
                  <p className="text-[10px] text-slate-500 max-w-xs">{t('telemetry_alerts_desc', 'Reports classified as High/Critical severity will trigger simulated Twilio alerts automatically to matching Ward subscribers.')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
