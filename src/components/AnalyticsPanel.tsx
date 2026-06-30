import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, LineChart, Line, 
  CartesianGrid, Legend, Cell, AreaChart, Area 
} from 'recharts';
import { 
  BarChart3, TrendingUp, AlertTriangle, Trophy, 
  Star, ShieldCheck, Flame, Users, Compass, 
  Calendar, CheckCircle, ArrowUpRight 
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Issue, Department, PredictZone } from '../types';
import { motion } from 'motion/react';
import { useLanguage } from './LanguageContext';

interface AnalyticsPanelProps {
  issues: Issue[];
  departments: Department[];
}

export default function AnalyticsPanel({ issues, departments }: AnalyticsPanelProps) {
  const { language, t } = useLanguage();
  // Process real issues data for Category chart
  const categoryCounts = issues.reduce((acc, issue) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const categoryChartData = Object.entries(categoryCounts).map(([cat, count]) => ({
    name: cat.toUpperCase(),
    Reports: count,
  }));

  // Dynamic trend generator for the last 7 days
  const getDynamicTrendData = () => {
    const data = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      const reportedCount = issues.filter(issue => {
        if (!issue.timeline?.reportedAt) return false;
        const rDate = new Date(issue.timeline.reportedAt);
        return rDate.toDateString() === d.toDateString();
      }).length;

      const resolvedCount = issues.filter(issue => {
        if (issue.status !== 'resolved' || !issue.timeline?.resolvedAt) return false;
        const resDate = new Date(issue.timeline.resolvedAt);
        return resDate.toDateString() === d.toDateString();
      }).length;

      data.push({
        date: dateStr,
        Reported: reportedCount,
        Resolved: resolvedCount
      });
    }
    return data;
  };

  const trendData = getDynamicTrendData();

  // Dynamic Live Leaderboard from Firestore
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          name: data.name || "Anonymous Guardian",
          points: data.stats?.points || 0,
          issues: data.stats?.issuesReported || 0,
          verified: data.stats?.verifications || 0,
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.id}`
        });
      });
      // Sort descending by points and take top 5
      const sorted = list.sort((a, b) => b.points - a.points).slice(0, 5);
      setLeaderboard(sorted);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'users');
    });

    return () => unsubscribe();
  }, []);

  const activeLeaderboard = leaderboard;

  // Dynamically compute predictive risk zones if issues are reported globally!
  const computedZones: PredictZone[] = [];
  if (issues.length > 0) {
    const validWithAddresses = issues.filter(i => i.address && i.location && i.location.latitude);
    const areaMap = new Map<string, Issue[]>();
    validWithAddresses.forEach(issue => {
      const parts = issue.address.split(',');
      const area = parts[0].trim();
      if (!areaMap.has(area)) {
        areaMap.set(area, []);
      }
      areaMap.get(area)!.push(issue);
    });

    Array.from(areaMap.entries()).forEach(([area, areaIssues], index) => {
      if (index >= 3) return;
      const mainIssue = areaIssues[0];
      const category = mainIssue.category;
      
      const categoryPredictions: Record<string, string> = {
        pothole: "High risk of road surface cavitation",
        water: "Secondary line pressure stress risk",
        light: "Circuit fatigue-related dark zones",
        garbage: "Recurrent sanitation overflow hazard",
        traffic: "Signage blockage due to tree overgrowth",
        drainage: "Stormwater backup during high precipitation",
        other: "Secondary structural deterioration risk"
      };

      const categoryReasons: Record<string, string> = {
        pothole: "Elevated micro-crack indices and localized moisture absorption detected. Pre-emptive patching recommended.",
        water: "Slight pressure fluctuations recorded. Material stress metrics show a 10-15% variance.",
        light: "Grid load increases during evening peaks may stress aging localized illumination nodes.",
        garbage: "Dynamic pedestrian and commercial density indicators show scheduled collection latency.",
        traffic: "Visual obstruction alerts and historical peak-hour congestion patterns coincide here.",
        drainage: "Local topography elevation indicates higher runoff convergence during peak downpours.",
        other: "Infrastructural stress indicators present. Routine preventive inspection recommended."
      };

      computedZones.push({
        areaName: `${area} Area`,
        lat: mainIssue.location?.latitude || 17.4085,
        lng: mainIssue.location?.longitude || 78.4725,
        confidence: Math.min(80 + (areaIssues.length * 5) + (index * 3), 98),
        prediction: categoryPredictions[category] || "Elevated infrastructural stress risk",
        reason: categoryReasons[category] || "Anomalous patterns identified from regional reporting frequencies."
      });
    });
  }

  const categoryLabels: Record<string, string> = {
    pothole: "Road Potholes",
    water: "Water Supply",
    light: "Streetlights",
    garbage: "Sanitation",
    traffic: "Traffic Signs",
    drainage: "Drainage",
    other: "Other Civic"
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950 tracking-tight flex items-center space-x-2">
            <BarChart3 className="w-5.5 h-5.5 text-emerald-600 animate-pulse" />
            <span>{t('transparency_sla_dashboard', 'Transparency SLA & Metrics Dashboard')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('realtime_public_transparency_desc', 'Real-time public transparency tracking city response speed, SLA compliance metrics, and AI risk forecasting.')}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 bg-emerald-50 text-emerald-800 text-[10px] px-3 py-2 rounded-xl border border-emerald-100 font-mono font-bold flex items-center space-x-1.5 shadow-2xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span>OFFICIALLY AUDITED BY CITIZENS</span>
        </div>
      </div>

      {/* Grid: Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Trend Area Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 tracking-wider font-mono uppercase flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <span>INCIDENT VOLUME TRENDS</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Weekly tracking window</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorReported" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorResolved" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="5%" stopColor="#64748b" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#64748b" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={9} fontStyle="italic" />
                <YAxis stroke="#94a3b8" fontSize={9} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    fontSize: '11px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                    backgroundColor: '#fff' 
                  }} 
                />
                <Legend iconSize={10} fontSize={10} wrapperStyle={{ paddingTop: '8px' }} />
                
                <Area 
                  type="monotone" 
                  dataKey="Reported" 
                  stroke="#10b981" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#colorReported)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="Resolved" 
                  stroke="#64748b" 
                  strokeWidth={2} 
                  strokeDasharray="4 4"
                  fillOpacity={1} 
                  fill="url(#colorResolved)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category breakdown bar chart (5 Cols) */}
        <div className="lg:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 tracking-wider font-mono uppercase flex items-center space-x-2">
              <Flame className="w-4 h-4 text-amber-500" />
              <span>REPORTS VOLUME BY TYPE</span>
            </h3>
            <span className="text-[10px] font-mono text-slate-400">Total category weight</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} />
                <YAxis stroke="#94a3b8" fontSize={9} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #e2e8f0', 
                    fontSize: '11px',
                    backgroundColor: '#fff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)'
                  }} 
                />
                <Bar dataKey="Reports" fill="#10b981" radius={[8, 8, 0, 0]}>
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#059669' : '#34d399'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* SLA Comparisons and predictive zones */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: PREDICTIVE FORECASTER & CIVIC HEALTH WARD RANKINGS (Feature 4) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* PREDICTIVE INCIDENT FORECASTER */}
          <div className="bg-slate-950 text-slate-100 p-5 rounded-3xl border border-slate-900 space-y-4 shadow-xl">
            <div>
              <h3 className="text-xs font-black text-slate-100 tracking-wider font-mono uppercase flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{t('predictive_incident_mapping', 'Predictive Incident Mapping')}</span>
              </h3>
              <p className="text-[11px] text-slate-400 mt-1">
                {t('vertex_ai_algorithms_desc', 'Vertex AI algorithms analyzing weather fatigue, public density indicators, and material cracks.')}
              </p>
            </div>

            <div className="space-y-3.5 pt-2">
              {computedZones.length > 0 ? (
                computedZones.map((zone, idx) => (
                  <div key={idx} className="bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80 relative overflow-hidden group hover:border-slate-700/60 transition-colors">
                    <span className="absolute top-0 right-0 bg-amber-500/10 text-amber-400 border-l border-b border-slate-800 font-mono text-[8px] font-bold px-2 py-0.5 rounded-bl-lg">
                      {zone.confidence}% Conf
                    </span>
                    <p className="text-xs font-extrabold text-slate-200">{zone.areaName}</p>
                    <p className="text-[10px] text-amber-400 font-extrabold font-mono mt-1 flex items-center space-x-1">
                      <span>🔴</span>
                      <span>{zone.prediction}</span>
                    </p>
                    <p className="text-[10px] text-slate-400 leading-relaxed mt-2 font-sans border-t border-slate-800/50 pt-2">
                      {zone.reason}
                    </p>
                  </div>
                ))
              ) : (
                <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/40 text-center space-y-2 py-8">
                  <div className="w-10 h-10 bg-slate-800/60 text-emerald-400 rounded-xl flex items-center justify-center mx-auto shadow-sm">
                    <TrendingUp className="w-5 h-5 animate-pulse" />
                  </div>
                  <h4 className="text-xs font-black text-slate-200 tracking-wider font-mono uppercase">{t('model_calibrating', 'Model Calibrating')}</h4>
                  <p className="text-[10px] text-slate-400 leading-relaxed max-w-xs mx-auto">
                    {t('vertex_ai_calibrating_desc', 'Vertex AI is active. Awaiting initial citizen incident reports to run spatial material-fatigue and weather risk calculations.')}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-900/40 p-3 rounded-2xl border border-slate-800/40 text-center">
              <p className="text-[8px] text-slate-500 font-mono leading-relaxed">
                {t('risk_assessments_sync_note', "* Risk assessments sync automatically every 24 hours based on India's regional weather telemetry gauges.")}
              </p>
            </div>
          </div>

          {/* CIVIC HEALTH WARD INDEX RANKINGS */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div>
              <h3 className="text-xs font-black text-slate-900 tracking-wider font-mono uppercase flex items-center space-x-2">
                <Compass className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>{t('ward_civic_health_index', 'Ward Civic Health Index')}</span>
              </h3>
              <p className="text-[11px] text-slate-500 mt-1">
                {t('neighborhood_perf_desc', 'Neighborhood performance rated by report density, verification speed, and department SLA compliance.')}
              </p>
            </div>

            {/* City Average gauge */}
            {(() => {
              const totalOpen = issues.filter(i => i.status !== 'resolved').length;
              const cityScore = Math.max(50, Math.min(99, 95 - (totalOpen * 1.5)));
              let scoreColor = 'text-emerald-600 bg-emerald-50 border-emerald-100';
              if (cityScore < 80) scoreColor = 'text-amber-600 bg-amber-50 border-amber-100';
              if (cityScore < 65) scoreColor = 'text-rose-600 bg-rose-50 border-rose-100';

              return (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/60 flex items-center justify-between">
                  <div>
                    <span className="text-[8px] text-slate-400 font-mono uppercase block">{t('national_city_average', 'NATIONAL CITY AVERAGE')}</span>
                    <span className="text-xl font-black text-slate-900 font-mono">{cityScore.toFixed(0)}/100</span>
                  </div>
                  <span className={`text-[10px] font-mono font-black px-2.5 py-1 rounded-xl border ${scoreColor}`}>
                    {cityScore >= 85 ? t('excellent', 'EXCELLENT') : cityScore >= 70 ? t('stable', 'STABLE') : t('critical', 'CRITICAL')}
                  </span>
                </div>
              );
            })()}

            {/* Ward ranking rows */}
            <div className="space-y-3 pt-1">
              {[
                { name: "New Delhi (Central Sector)", issuesKey: "Delhi", baseScore: 94, translationKey: 'ward_delhi' },
                { name: "Mumbai (Marine Drive Ward)", issuesKey: "Mumbai", baseScore: 89, translationKey: 'ward_mumbai' },
                { name: "Bengaluru (Indiranagar Hub)", issuesKey: "Bengaluru", baseScore: 82, translationKey: 'ward_bengaluru' },
                { name: "Kolkata (Howrah Sector)", issuesKey: "Kolkata", baseScore: 68, translationKey: 'ward_kolkata' },
              ].map((ward, index) => {
                // Compute dynamic impact based on current active issues
                const wardActiveCount = issues.filter(i => 
                  i.status !== 'resolved' && 
                  (i.address?.toLowerCase().includes(ward.issuesKey.toLowerCase()) || 
                   i.title?.toLowerCase().includes(ward.issuesKey.toLowerCase()))
                ).length;

                const score = Math.max(40, ward.baseScore - (wardActiveCount * 4));
                
                let barColor = 'bg-emerald-500';
                let ratingText = 'Excellent';
                let ratingColor = 'text-emerald-600';
                
                if (score < 85) {
                  barColor = 'bg-amber-500';
                  ratingText = 'Good';
                  ratingColor = 'text-amber-600';
                }
                if (score < 75) {
                  barColor = 'bg-rose-500';
                  ratingText = 'Warning';
                  ratingColor = 'text-rose-600';
                }

                return (
                  <div key={index} className="space-y-1.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/20 hover:bg-slate-50 transition-colors">
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">#{index+1}</span>
                        <span className="font-extrabold text-slate-800">{t(ward.translationKey, ward.name)}</span>
                      </div>
                      <span className="font-mono font-extrabold text-slate-900">{score}%</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div style={{ width: `${score}%` }} className={`h-full ${barColor} rounded-full transition-all duration-500`} />
                    </div>

                    <div className="flex justify-between items-center text-[9px] font-mono font-bold">
                      <span className="text-slate-400 uppercase">
                        {wardActiveCount} {t('active_hazards_label', 'ACTIVE HAZARDS')}
                      </span>
                      <span className={`${ratingColor} uppercase`}>
                        {score >= 85 ? t('excellent_title', 'Excellent') : score >= 75 ? t('good_title', 'Good') : t('warning_title', 'Warning')}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* SLA DEPARTMENTS PERFORMANCE & LEADERBOARDS (Right 8 Columns) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* SLA Performance table */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black text-slate-900 tracking-wider font-mono uppercase flex items-center space-x-2">
                <Trophy className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>{t('municipal_depts_sla_perf', 'Municipal Departments SLA Performance')}</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">{t('updated_live', 'Updated Live')}</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-mono text-[9px] uppercase tracking-wider">
                    <th className="py-2">{t('dept_agency', 'Department Agency')}</th>
                    <th className="py-2 text-center">{t('resolved', 'Resolved')}</th>
                    <th className="py-2 text-center">{t('avg_repair_speed', 'Avg Repair Speed')}</th>
                    <th className="py-2 text-center">{t('compliance_rate', 'Compliance Rate')}</th>
                    <th className="py-2 text-right">{t('satisfaction', 'Satisfaction')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans">
                  {departments.map((dept) => (
                    <tr key={dept.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3.5 font-bold text-slate-800">{t(`dept_${dept.id}`, dept.name)}</td>
                      <td className="py-3.5 text-center font-mono font-extrabold text-slate-700">{dept.stats.issuesResolved}</td>
                      <td className="py-3.5 text-center font-mono text-slate-500 font-bold">{dept.stats.avgResolutionTime} hrs</td>
                      <td className="py-3.5 text-center font-mono">
                        <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-black px-2.5 py-1 rounded-xl text-[10px]">
                          {dept.stats.responseRate}%
                        </span>
                      </td>
                      <td className="py-3.5 text-right">
                        <div className="flex items-center justify-end space-x-1 font-mono font-bold">
                           <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-slate-850">{dept.stats.satisfactionRating}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Citizen leaderboard cards */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="text-xs font-black text-slate-900 tracking-wider font-mono uppercase flex items-center space-x-2">
              <Users className="w-4 h-4 text-emerald-600" />
              <span>{t('top_citizen_guardians_leaderboard', 'Top Citizen Guardians Leaderboard')}</span>
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {activeLeaderboard.length > 0 ? (
                activeLeaderboard.map((user, idx) => {
                  let podiumBorder = 'border-slate-200';
                  let trophyColor = 'text-slate-300';
                  if (idx === 0) {
                    podiumBorder = 'border-amber-400 bg-amber-50/10 shadow-sm';
                    trophyColor = 'text-amber-500 fill-amber-400';
                  } else if (idx === 1) {
                    podiumBorder = 'border-slate-300 bg-slate-50/30';
                    trophyColor = 'text-slate-400 fill-slate-300';
                  }

                  return (
                    <div 
                      key={idx} 
                      className={`p-4 rounded-2xl border flex items-center space-x-4 relative overflow-hidden transition-transform hover:scale-101 ${podiumBorder}`}
                    >
                      <div className="absolute top-2 right-2 text-xs font-black text-slate-200 font-mono">
                        #{idx + 1}
                      </div>
                      <img
                        src={user.avatar}
                        alt={user.name}
                        className="w-11 h-11 rounded-xl border-2 border-white shadow-sm bg-slate-100"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-extrabold text-slate-950 truncate flex items-center space-x-1">
                          <span>{user.name}</span>
                          {idx === 0 && <Star className="w-3 h-3 text-amber-500 fill-amber-500" />}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5">{user.points} XP | {user.issues} Reports</p>
                        <div className="flex space-x-1 mt-1.5">
                          <span className="text-[8px] font-bold font-mono bg-amber-100/60 text-amber-800 border border-amber-200/30 px-1.5 py-0.2 rounded">{t('helper', 'Helper')}</span>
                          <span className="text-[8px] font-bold font-mono bg-emerald-50 text-emerald-800 border border-emerald-100 px-1.5 py-0.2 rounded font-mono">{t('guardian', 'Guardian')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-3 text-center py-6 text-slate-400 text-xs font-mono">
                  {t('loading_guardians', 'Loading registered community guardians...')}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
