import React, { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, RefreshCw, Send, MapPin, AlertTriangle, 
  MessageSquare, Smartphone, Bell, Clock, Eye, Trash2, CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from './LanguageContext';
import { Issue } from '../types';

interface NotificationTerminalProps {
  issues: Issue[];
  isOfflineSimulated: boolean;
  onToggleOffline: () => void;
  offlineQueue: any[];
  onForceSync: () => Promise<void>;
  userSimulatedLat: number;
  userSimulatedLng: number;
  onSimulatedLocationChange: (lat: number, lng: number, address: string) => void;
}

export default function NotificationTerminal({
  issues,
  isOfflineSimulated,
  onToggleOffline,
  offlineQueue,
  onForceSync,
  userSimulatedLat,
  userSimulatedLng,
  onSimulatedLocationChange
}: NotificationTerminalProps) {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'terminal' | 'offline' | 'geofence'>('terminal');
  const [gpsPreset, setGpsPreset] = useState<string>('custom');

  // Load live SMS & Push logs from backend
  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/alerts-log');
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = await res.json();
        if (data && data.success && data.logs) {
          setLogs(data.logs);
        }
      } else {
        const text = await res.text().catch(() => '');
        console.warn(`Dispatched logs fetch omitted or failed with status ${res.status}:`, text);
      }
    } catch (err: any) {
      console.warn("Failed to fetch notification broadcast logs from server:", err.message);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000); // Poll every 5s for live updates
    return () => clearInterval(interval);
  }, []);

  const handleSyncClick = async () => {
    setIsSyncing(true);
    await onForceSync();
    await fetchLogs();
    setIsSyncing(false);
  };

  // Pre-configured geofence simulation presets
  const GEOLOCATION_PRESETS = [
    {
      name: "Connaught Place, Delhi (Near Street Pothole)",
      lat: 28.6310,
      lng: 77.2185,
      address: "Connaught Place Road, New Delhi, India"
    },
    {
      name: "Marine Drive, Mumbai (Near Pipeline Leak)",
      lat: 18.9435,
      lng: 72.8230,
      address: "Marine Drive Walkway, Mumbai, India"
    },
    {
      name: "Indiranagar, Bengaluru (Near Overflowing Bin)",
      lat: 12.9723,
      lng: 77.6416,
      address: "100 Feet Road, Indiranagar, Bengaluru, India"
    },
    {
      name: "T. Nagar, Chennai (Near Heritage Light Fault)",
      lat: 13.0405,
      lng: 80.2337,
      address: "Usman Road, T. Nagar, Chennai, India"
    }
  ];

  const handlePresetSelect = (preset: any) => {
    setGpsPreset(preset.name);
    onSimulatedLocationChange(preset.lat, preset.lng, preset.address);
  };

  // Find issues near simulated location (under 500 meters)
  const getHaversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // in metres
  };

  // Unresolved issues near simulated location (< 500 meters)
  const proximalHazards = issues
    .filter(issue => issue.status !== 'resolved' && issue.status !== 'rejected')
    .map(issue => {
      const distance = getHaversineDistance(
        userSimulatedLat,
        userSimulatedLng,
        issue.location.latitude,
        issue.location.longitude
      );
      return { ...issue, distance };
    })
    .filter(item => item.distance < 500)
    .sort((a, b) => a.distance - b.distance);

  return (
    <div id="notification-terminal-panel" className="bg-slate-900 border border-slate-800 text-white rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[680px] md:h-[580px]">
      
      {/* Side Navigation Rail */}
      <div className="w-full md:w-64 bg-slate-950 p-4 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 shrink-0 gap-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between md:justify-start md:space-x-2 pb-2.5 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full animate-ping" />
              <h3 className="font-mono text-xs sm:text-sm tracking-widest font-black text-indigo-400 uppercase">
                {t('command_deck', 'Command Deck')}
              </h3>
            </div>
            <span className="md:hidden bg-indigo-950 text-indigo-400 text-[8px] font-mono px-1.5 py-0.5 rounded border border-indigo-900/40 font-bold uppercase">
              {t('simulator', 'Simulator')}
            </span>
          </div>

          <div className="grid grid-cols-3 md:flex md:flex-col gap-1.5">
            <button 
              onClick={() => setActiveTab('terminal')}
              className={`text-center md:text-left font-mono text-[10px] sm:text-xs p-2 rounded-lg flex flex-col md:flex-row items-center md:space-x-2.5 transition-all border ${activeTab === 'terminal' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'text-slate-400 border-transparent hover:bg-slate-900'}`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0 mb-1 md:mb-0" />
              <span>{t('broadcasts', 'Broadcasts')}</span>
            </button>

            <button 
              onClick={() => setActiveTab('offline')}
              className={`text-center md:text-left font-mono text-[10px] sm:text-xs p-2 rounded-lg flex flex-col md:flex-row items-center md:space-x-2.5 transition-all border ${activeTab === 'offline' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'text-slate-400 border-transparent hover:bg-slate-900'}`}
            >
              <div className="relative mb-1 md:mb-0">
                {isOfflineSimulated ? <WifiOff className="w-3.5 h-3.5 text-amber-500" /> : <Wifi className="w-3.5 h-3.5 text-emerald-500" />}
                {offlineQueue.length > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-[8px] font-bold rounded-full flex items-center justify-center text-white animate-bounce">
                    {offlineQueue.length}
                  </span>
                )}
              </div>
              <span>{t('offline_queue_tab', 'Offline Queue')}</span>
            </button>

            <button 
              onClick={() => setActiveTab('geofence')}
              className={`text-center md:text-left font-mono text-[10px] sm:text-xs p-2 rounded-lg flex flex-col md:flex-row items-center md:space-x-2.5 transition-all border ${activeTab === 'geofence' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'text-slate-400 border-transparent hover:bg-slate-900'}`}
            >
              <div className="relative mb-1 md:mb-0">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                {proximalHazards.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
                )}
              </div>
              <span>{t('geofence_tab', 'Geofence')}</span>
            </button>
          </div>
        </div>

        {/* Quick Offline Switch */}
        <div className="pt-3 border-t border-slate-800 space-y-2 flex flex-col sm:flex-row md:flex-col sm:items-center md:items-stretch sm:justify-between gap-3 md:gap-0">
          <div className="bg-slate-900/50 p-2 rounded-lg border border-slate-800/80 flex-1 w-full">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{t('device_mode', 'Device Mode')}</span>
              <span className={`text-[8px] font-mono uppercase px-1 py-0.5 rounded ${isOfflineSimulated ? 'bg-amber-950 text-amber-400' : 'bg-emerald-950 text-emerald-400'}`}>
                {isOfflineSimulated ? t('offline', 'Offline') : t('online', 'Online')}
              </span>
            </div>
            <button 
              onClick={onToggleOffline}
              className={`w-full font-mono text-[9px] uppercase font-bold py-1 px-2 rounded flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${isOfflineSimulated ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-amber-600 hover:bg-amber-500 text-white'}`}
            >
              {isOfflineSimulated ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>{isOfflineSimulated ? t('go_online', 'Go Online') : t('go_offline', 'Go Offline')}</span>
            </button>
          </div>
          <p className="hidden sm:block text-[8px] text-slate-500 font-mono italic leading-normal md:mt-2">
            *Simulate offline queueing and spatial geofences for extreme hackathon proof of capability.
          </p>
        </div>
      </div>

      {/* Primary Display Pane */}
      <div className="flex-1 p-4 md:p-5 flex flex-col h-full overflow-hidden bg-slate-900/40">
        
        {/* TAB 1: Broadcast Terminal */}
        {activeTab === 'terminal' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800 gap-2">
              <div className="min-w-0">
                <h4 className="text-sm font-mono font-bold text-indigo-400 flex items-center space-x-2 truncate">
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>{t('outgoing_ward_broadcast_log', 'Outgoing Ward Broadcast Log')}</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{t('outgoing_ward_broadcast_desc', 'Real-time simulation of cellular SMS broadcasts, WhatsApp groups, and Officer Push notifications.')}</p>
              </div>
              <button 
                onClick={fetchLogs}
                className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-all shrink-0 cursor-pointer"
                title="Refresh Logs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 font-mono text-[11px] leading-relaxed select-text scrollbar-thin">
              {logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2">
                  <Clock className="w-8 h-8 text-slate-700 animate-pulse" />
                  <p>{t('no_broadcast_communications', 'No broadcast communications recorded in the active ledger yet.')}</p>
                  <p className="text-[10px]">{t('trigger_live_alerts_desc', 'Submit an incident or perform auto-dispatch to trigger live alerts.')}</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="bg-slate-950/85 p-3 sm:p-4 rounded-xl border border-slate-850 hover:border-indigo-500/30 hover:bg-slate-950 transition-all space-y-2">
                    <div className="flex flex-col gap-2 border-b border-slate-900/60 pb-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        {log.channel === 'sms' && (
                          <span className="bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-900/30 flex items-center space-x-1.5 text-[9px] font-bold tracking-wide shrink-0">
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>CELLULAR SMS</span>
                          </span>
                        )}
                        {log.channel === 'whatsapp' && (
                          <span className="bg-teal-950 text-teal-400 px-2 py-0.5 rounded-md border border-teal-900/30 flex items-center space-x-1.5 text-[9px] font-bold tracking-wide shrink-0">
                            <MessageSquare className="w-2.5 h-2.5" />
                            <span>WHATSAPP</span>
                          </span>
                        )}
                        {log.channel === 'push' && (
                          <span className="bg-indigo-950 text-indigo-400 px-2 py-0.5 rounded-md border border-indigo-900/30 flex items-center space-x-1.5 text-[9px] font-bold tracking-wide shrink-0">
                            <Bell className="w-2.5 h-2.5" />
                            <span>OFFICER PUSH</span>
                          </span>
                        )}
                        <span className="text-slate-500 text-[10px] shrink-0 font-medium">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                      
                      <div className="text-[10px] text-slate-400 bg-slate-900/30 px-2 py-1 rounded-md border border-slate-800/40 truncate select-all" title={`to ${log.recipientName} (${log.recipientPhone})`}>
                        <span className="text-slate-500 uppercase text-[8px] tracking-wider font-extrabold mr-1">To:</span>
                        <span className="text-indigo-300 font-extrabold">{log.recipientName}</span>{' '}
                        <span className="text-slate-400 font-mono">({log.recipientPhone})</span>
                      </div>
                    </div>
                    
                    <p className="text-slate-200 font-medium pl-2.5 border-l-2 border-indigo-500/60 break-words whitespace-pre-wrap leading-relaxed text-[11px] select-text">{log.message}</p>
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-y-1 gap-x-3 text-[9px] text-slate-500 border-t border-slate-900/40 pt-1.5 mt-1">
                      <span>Locus Ward: <strong className="text-slate-400 font-bold">{log.ward}</strong></span>
                      <span className="flex items-center space-x-1">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                        <span>Carrier: <strong className="text-slate-400 font-medium">Delivered via API gateway</strong></span>
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Offline Sync Queue */}
        {activeTab === 'offline' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-mono font-bold text-indigo-400 flex items-center space-x-2">
                  <WifiOff className="w-4 h-4 text-amber-500" />
                  <span>{t('offline_transactions_title', 'Indexed Offline Transactions')}</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('offline_transactions_desc', 'When simulated offline, civic reports, votes, and comments write immediately to dynamic IndexedDB/localStorage. Returning online triggers automatic cloud upload.')}</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {offlineQueue.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-3">
                  <CheckCircle className="w-10 h-10 text-emerald-500/40" />
                  <p className="font-mono text-xs text-center">{t('offline_queue_empty', 'Offline Transaction Queue is currently pristine and empty.')}</p>
                  <p className="text-[10px] max-w-sm text-center">{t('offline_queue_empty_desc', 'Enable "Go Offline" in the deck, then file an issue, leave a comment, or cast a verification vote to watch items populate locally!')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between bg-slate-950 p-3 rounded-lg border border-dashed border-indigo-500/30">
                    <div className="space-y-1">
                      <p className="font-mono text-xs font-bold text-indigo-400 flex items-center space-x-1.5">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>{offlineQueue.length} {t('pending_outbound_sync', 'Pending Outbound Sync Actions')}</span>
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono">{t('offline_sync_desc', 'Simulated offline state captures precise client operations securely.')}</p>
                    </div>
                    <button 
                      onClick={handleSyncClick}
                      disabled={isSyncing || isOfflineSimulated}
                      className={`font-mono text-xs px-3 py-1.5 rounded font-bold uppercase transition-all flex items-center space-x-1.5 ${isOfflineSimulated ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                    >
                      <span>{t('sync_ledger', 'Sync Ledger')}</span>
                    </button>
                  </div>

                  <div className="space-y-2 font-mono text-xs">
                    {offlineQueue.map((item, idx) => (
                      <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-1.5">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className={`px-1.5 py-0.5 rounded font-bold uppercase ${item.type === 'report' ? 'bg-indigo-950 text-indigo-400' : item.type === 'vote' ? 'bg-emerald-950 text-emerald-400' : 'bg-purple-950 text-purple-400'}`}>
                            {item.type.toUpperCase()} ACTION
                          </span>
                          <span className="text-slate-500">{new Date(item.timestamp).toLocaleTimeString()}</span>
                        </div>
                        {item.type === 'report' && (
                          <div className="space-y-1">
                            <p className="font-bold text-slate-200">{item.payload.title}</p>
                            <p className="text-[10px] text-slate-400 truncate">{item.payload.description}</p>
                            <p className="text-[9px] text-slate-500">📍 Coords: {item.payload.location.latitude.toFixed(4)}, {item.payload.location.longitude.toFixed(4)}</p>
                          </div>
                        )}
                        {item.type === 'comment' && (
                          <div>
                            <p className="text-slate-300">"{(item.payload as any).comment.message}"</p>
                            <p className="text-[9px] text-slate-500">Ref Issue ID: {item.payload.issueId}</p>
                          </div>
                        )}
                        {item.type === 'vote' && (
                          <div className="flex items-center space-x-1.5">
                            <p className="text-slate-300">Voted <strong>{(item.payload as any).voteType === 'upvote' ? 'SUPPORT' : 'DISPUTE'}</strong></p>
                            <span className="text-[9px] text-slate-500">on Issue: {item.payload.issueId}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: Geofence Simulator */}
        {activeTab === 'geofence' && (
          <div className="flex flex-col h-full overflow-hidden">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800">
              <div>
                <h4 className="text-sm font-mono font-bold text-indigo-400 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>{t('proximity_simulator_title', 'Dynamic Citizen Proximity Simulator')}</span>
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('proximity_simulator_desc', 'Simulate citizen or responder movement near active hazard sites. Approaching within 500 meters of a recorded hazard triggers immediate audio-visual proximity alerts.')}</p>
              </div>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Geofence presets */}
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">{t('select_locus', '1. Select Simulated Location Locus')}</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {GEOLOCATION_PRESETS.map((preset) => (
                    <button 
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset)}
                      className={`text-left font-mono text-[10px] p-2.5 rounded-lg border transition-all space-y-0.5 ${gpsPreset === preset.name ? 'bg-cyan-650/20 text-cyan-400 border-cyan-500' : 'bg-slate-950 text-slate-400 border-slate-850 hover:bg-slate-900 hover:text-white'}`}
                    >
                      <p className="font-bold truncate">{preset.name.split(' (')[0]}</p>
                      <p className="text-[9px] text-slate-500 truncate">{preset.address}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Coordinate entry */}
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">{t('simulated_coordinates', 'Simulated Coordinates')}</span>
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <div className="flex-1 w-full flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded px-2 py-1.5">
                    <span className="text-[10px] font-mono text-slate-500">Lat:</span>
                    <input 
                      type="number" 
                      value={userSimulatedLat} 
                      onChange={(e) => {
                        setGpsPreset('custom');
                        onSimulatedLocationChange(parseFloat(e.target.value) || 0, userSimulatedLng, "Simulated Coordinate Point");
                      }}
                      step="0.0001"
                      className="bg-transparent text-white outline-none w-full font-mono text-xs"
                    />
                  </div>
                  <div className="flex-1 w-full flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded px-2 py-1.5">
                    <span className="text-[10px] font-mono text-slate-500">Lng:</span>
                    <input 
                      type="number" 
                      value={userSimulatedLng} 
                      onChange={(e) => {
                        setGpsPreset('custom');
                        onSimulatedLocationChange(userSimulatedLat, parseFloat(e.target.value) || 0, "Simulated Coordinate Point");
                      }}
                      step="0.0001"
                      className="bg-transparent text-white outline-none w-full font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Proximity calculations */}
              <div className="space-y-2.5">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">{t('active_geofenced_zones', '2. Active Geofenced Hazard Zones Near You')}</span>
                
                {proximalHazards.length === 0 ? (
                  <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 text-center text-slate-500 font-mono text-xs space-y-1">
                    <CheckCircle className="w-6 h-6 text-emerald-500/30 mx-auto" />
                    <p>{t('no_hazards_within_locus', 'No public hazards within 500 meters of current simulated locus.')}</p>
                    <p className="text-[9px] text-slate-600">{t('select_preset_desc', 'Select a preset to enter the geofenced envelope of recorded street failures.')}</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {proximalHazards.map((item) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={item.id} 
                        className="bg-rose-950/20 border border-rose-500/40 p-3 rounded-lg flex items-start space-x-3"
                      >
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="font-mono text-xs font-bold text-rose-300 truncate max-w-[200px]">
                              {item.title}
                            </h5>
                            <span className="bg-rose-900/60 text-rose-300 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded">
                              {Math.round(item.distance)}m AHEAD
                            </span>
                          </div>
                          <p className="font-mono text-[10px] text-slate-300 leading-relaxed">
                            ⚠️ <strong>PROXIMITY WARNING:</strong> {item.description}
                          </p>
                          <div className="flex items-center justify-between text-[9px] text-rose-400/80 font-mono pt-1">
                            <span>Category: {item.category.toUpperCase()} | Severity: {item.severity.toUpperCase()}</span>
                            <span>Assigned: {item.assignedOfficer || 'Municipal Crew'}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
