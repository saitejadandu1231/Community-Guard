import React, { useState } from 'react';
import { 
  CheckCircle2, AlertCircle, ShieldAlert, Award, 
  MapPin, Clock, Search, Building, MessageSquare, 
  Sparkles, ThumbsUp, ThumbsDown, Check, Send, 
  ChevronRight, Calendar, UserCheck, ShieldCheck,
  TrendingUp, Database, ArrowRightLeft, Eye, Volume2
} from 'lucide-react';
import { Issue, IssueStatus, Department } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from './LanguageContext';

interface ResolvedShowcaseProps {
  issues: Issue[];
  currentUserProfile: {
    id: string;
    name: string;
    avatar: string;
    role: string;
    stats: { points: number };
  } | null;
  onAuditResolution: (
    issueId: string, 
    type: 'verify' | 'dispute', 
    commentText?: string
  ) => Promise<void>;
  departments: Department[];
}

export default function ResolvedShowcase({ 
  issues, 
  currentUserProfile, 
  onAuditResolution,
  departments 
}: ResolvedShowcaseProps) {
  const { language, t } = useLanguage();
  // We only show issues that have been marked as 'resolved' or have resolution audits
  const resolvedIssues = issues.filter(issue => 
    issue.status === 'resolved' || 
    (issue.resolutionAudit && (issue.resolutionAudit.verifiedCount > 0 || issue.resolutionAudit.disputedCount > 0))
  );

  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(
    resolvedIssues[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [auditFilter, setAuditFilter] = useState<'all' | 'needs_audit' | 'my_audits'>('all');
  
  // Interactive Slider State
  const [sliderPosition, setSliderPosition] = useState<number>(50); // percentage (0 to 100)
  const [isSliding, setIsSliding] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side-by-side'>('slider');

  // Audit Form States
  const [disputeMessage, setDisputeMessage] = useState('');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newCommentText, setNewCommentText] = useState('');

  // Selected Issue
  const selectedIssue = resolvedIssues.find(i => i.id === selectedIssueId);

  // Fallback high-fidelity "After" images for Indian resolved categories if none provided
  const categoryAfterFallbacks: Record<string, string> = {
    pothole: "https://images.unsplash.com/photo-1594913785162-e678ac3b2df2?q=80&w=600&auto=format&fit=crop", // clean freshly paved smooth asphalt road
    water: "https://images.unsplash.com/photo-1581094288338-2314dddb7ecc?q=80&w=600&auto=format&fit=crop", // clean hydraulic pipeline joint repair
    light: "https://images.unsplash.com/photo-1540959733332-eab4deceeaf7?q=80&w=600&auto=format&fit=crop", // bright night city lights with functional pole
    garbage: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?q=80&w=600&auto=format&fit=crop", // clean swept pavement/park pathway
    traffic: "https://images.unsplash.com/photo-1563986768609-322da13575f3?q=80&w=600&auto=format&fit=crop", // clean painted crosswalk or sign
    drainage: "https://images.unsplash.com/photo-1621905252507-b354bc25edac?q=80&w=600&auto=format&fit=crop", // professional concrete drainage channel
    other: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=600&auto=format&fit=crop" // neat urban infrastructure facade
  };

  const getResolvedPhotoUrl = (issue: Issue) => {
    return issue.resolvedPhotoUrl || categoryAfterFallbacks[issue.category] || categoryAfterFallbacks.other;
  };

  // Helper: check if current user already audited
  const hasUserAudited = (issue: Issue) => {
    if (!currentUserProfile) return { verified: false, disputed: false };
    const audit = issue.resolutionAudit;
    if (!audit) return { verified: false, disputed: false };
    return {
      verified: audit.verifiedBy.includes(currentUserProfile.id),
      disputed: audit.disputedBy.includes(currentUserProfile.id)
    };
  };

  // Handle slide mouse / touch drag
  const handleSliderMove = (clientX: number, containerLeft: number, containerWidth: number) => {
    const relativeX = clientX - containerLeft;
    const position = Math.max(0, Math.min(100, (relativeX / containerWidth) * 100));
    setSliderPosition(position);
  };

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSliding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handleSliderMove(e.clientX, rect.left, rect.width);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isSliding) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.touches[0]) {
      handleSliderMove(e.touches[0].clientX, rect.left, rect.width);
    }
  };

  // Handle Verify Action
  const handleVerify = async () => {
    if (!selectedIssue || !currentUserProfile || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAuditResolution(selectedIssue.id, 'verify');
      setShowDisputeForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Dispute Action
  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !currentUserProfile || !disputeMessage.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onAuditResolution(selectedIssue.id, 'dispute', disputeMessage);
      setDisputeMessage('');
      setShowDisputeForm(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Post Comment / Feedback only
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue || !currentUserProfile || !newCommentText.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      // Post as a commendation / praise comment in verification path
      await onAuditResolution(selectedIssue.id, 'verify', newCommentText);
      setNewCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate stats for Leadership table
  // Group resolved issues by assigned department or category
  const deptPerformance = departments.map(dept => {
    const deptIssues = issues.filter(i => i.assignedDepartment === dept.name);
    const resolvedDeptIssues = deptIssues.filter(i => i.status === 'resolved');
    
    // Calculate custom citizen trust score for each department
    // Formula: percentage of resolved issues that received verified vs disputed audits
    let totalAuditCount = 0;
    let totalVerifiedCount = 0;
    
    deptIssues.forEach(i => {
      if (i.resolutionAudit) {
        totalAuditCount += i.resolutionAudit.verifiedCount + i.resolutionAudit.disputedCount;
        totalVerifiedCount += i.resolutionAudit.verifiedCount;
      }
    });

    const trustScore = totalAuditCount === 0 
      ? 90 // Default starter trust score is high (90%)
      : Math.round((totalVerifiedCount / totalAuditCount) * 100);

    const idColorMap: Record<string, string> = {
      pwd: 'emerald',
      water: 'blue',
      electricity: 'amber',
      sanitation: 'indigo',
      traffic: 'rose'
    };
    const mappedColor = idColorMap[dept.id] || 'emerald';

    return {
      id: dept.id,
      name: dept.name,
      total: deptIssues.length,
      resolved: resolvedDeptIssues.length,
      trustScore: Math.min(100, Math.max(40, trustScore)),
      color: mappedColor
    };
  }).sort((a, b) => b.trustScore - a.trustScore);

  // Filter & Search Logic for resolved cases
  const filteredResolvedIssues = resolvedIssues.filter(issue => {
    const matchesSearch = 
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.id.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDept = 
      selectedDeptFilter === 'all' || 
      issue.assignedDepartment === selectedDeptFilter;
    
    const auditStatus = hasUserAudited(issue);
    const matchesAudit = 
      auditFilter === 'all' ||
      (auditFilter === 'needs_audit' && !auditStatus.verified && !auditStatus.disputed) ||
      (auditFilter === 'my_audits' && (auditStatus.verified || auditStatus.disputed));

    return matchesSearch && matchesDept && matchesAudit;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header section with high visual design */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-emerald-500 text-white font-extrabold text-[9px] uppercase px-2 py-0.5 rounded tracking-widest font-mono">
              {t('phase_6_specialized', 'PHASE 6 SPECIALIZED')}
            </span>
            <span className="text-slate-400 text-xs font-mono font-bold">• {t('municipal_ledger_resolutions_audit', 'MUNICIPAL LEDGER RESOLUTIONS AUDIT')}</span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-950 tracking-tight flex items-center space-x-2.5 mt-1">
            <ShieldCheck className="w-6.5 h-6.5 text-emerald-600" />
            <span>{t('citizen_verification_portal', 'Citizen Verification Portal & Showcase')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('browse_before_after_desc', "Browse before-and-after photographic repairs completed by municipal engineers. Audit, verify, or dispute resolutions to protect India's public spaces.")}
          </p>
        </div>
        
        {/* Dynamic Rewards Card Banner inside header */}
        <div className="mt-4 md:mt-0 bg-gradient-to-r from-emerald-50 to-blue-50/50 rounded-2xl p-4 border border-emerald-200/50 shadow-2xs flex items-center space-x-4 max-w-xs shrink-0">
          <div className="p-3 bg-white rounded-xl shadow-xs text-emerald-600 shrink-0">
            <Award className="w-6 h-6 animate-bounce" />
          </div>
          <div>
            <p className="text-[10px] font-black font-mono text-emerald-800 uppercase tracking-wider">{t('audit_rewards', 'AUDIT REWARDS')}</p>
            <p className="text-xs text-slate-600 font-medium leading-tight mt-0.5">
              {t('verify_resolutions_xp', 'Verify resolutions to earn +15 XP points directly.')}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Performance Leaderboard & Filters (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Municipal Department Trust Leaderboard */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 mb-4">
              <h3 className="text-xs font-bold text-slate-950 tracking-tight flex items-center space-x-2">
                <Building className="w-4 h-4 text-emerald-600" />
                <span>{t('dept_trust_leaderboard', 'Department Trust Leaderboard')}</span>
              </h3>
              <span className="text-[9px] bg-emerald-50 text-emerald-700 font-mono font-bold px-1.5 py-0.5 rounded">
                {t('live_rating', 'Live Rating')}
              </span>
            </div>

            <div className="space-y-3">
              {deptPerformance.map((dept, index) => {
                const colorsMap: Record<string, string> = {
                  emerald: 'bg-emerald-500',
                  blue: 'bg-blue-500',
                  rose: 'bg-rose-500',
                  amber: 'bg-amber-500',
                  indigo: 'bg-indigo-500'
                };
                const bgTailwind = colorsMap[dept.color] || 'bg-slate-500';

                return (
                  <div key={dept.id} className="flex flex-col space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <div className="flex items-center space-x-2">
                        <span className="w-4 text-slate-400 font-mono font-black text-right text-[10px]">#{index + 1}</span>
                        <span className="font-bold text-slate-800 truncate max-w-[170px]">{t(`dept_${dept.id}`, dept.name)}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-black text-slate-900 font-mono">{dept.trustScore}%</span>
                        <span className="text-[9px] text-slate-400">({dept.resolved}/{dept.total})</span>
                      </div>
                    </div>
                    {/* Performance Progress bar */}
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${dept.trustScore}%` }}
                      className={`h-full rounded-full ${bgTailwind}`}
                      transition={{ duration: 0.8, delay: index * 0.1 }}
                    />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter & Search Dashboard */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-950 tracking-tight pb-3 border-b border-slate-100">
              {t('audit_search_filters', 'Audit Search & Filters')}
            </h3>

            {/* Search Input */}
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('search_resolved_placeholder', 'Search resolved reports or address...')}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl text-xs pl-9 pr-4 py-2.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>

            {/* Audit Status Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              {(['all', 'needs_audit', 'my_audits'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setAuditFilter(tab)}
                  className={`text-[10px] font-bold py-2 rounded-lg cursor-pointer transition-all ${
                    auditFilter === tab
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab === 'all' && t('all_resolved', 'All Resolved')}
                  {tab === 'needs_audit' && t('needs_audit', 'Needs Audit')}
                  {tab === 'my_audits' && t('my_audits', 'My Audits')}
                </button>
              ))}
            </div>

            {/* Department Filter list */}
            <div>
              <label className="text-[9px] font-bold text-slate-400 font-mono uppercase block mb-1.5">{t('municipal_ward_department', 'MUNICIPAL WARD DEPARTMENT')}</label>
              <select
                value={selectedDeptFilter}
                onChange={(e) => setSelectedDeptFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200/80 rounded-xl text-xs p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="all">{t('all_departments', 'All Departments')} ({resolvedIssues.length})</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>{t(`dept_${dept.id}`, dept.name)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Quick resolved list feed */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
            <h3 className="text-xs font-bold text-slate-950 pb-3 border-b border-slate-100 mb-3 flex items-center justify-between">
              <span>{t('audit_target_list', 'Audit Target List')}</span>
              <span className="text-[10px] font-mono font-black text-slate-400">{filteredResolvedIssues.length} {t('matches_label', 'matches')}</span>
            </h3>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
              {filteredResolvedIssues.map(issue => {
                const isSelected = selectedIssueId === issue.id;
                const auditState = hasUserAudited(issue);

                return (
                  <button
                    key={issue.id}
                    onClick={() => {
                      setSelectedIssueId(issue.id);
                      setShowDisputeForm(false);
                      setDisputeMessage('');
                    }}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-1.5 ${
                      isSelected
                        ? 'bg-emerald-50/20 border-emerald-500/40 ring-1 ring-emerald-500/10'
                        : 'bg-slate-50/40 border-slate-200/60 hover:bg-slate-50/80'
                    }`}
                  >
                    <div className="flex justify-between items-start w-full">
                      <span className="text-[9px] font-mono font-black text-slate-400 truncate max-w-[80px]">#{issue.id.substring(0, 6)}</span>
                      {auditState.verified && (
                        <span className="bg-emerald-100 text-emerald-800 text-[8px] px-1.5 py-0.5 rounded-md font-bold flex items-center space-x-0.5 font-mono">
                          <Check className="w-2.5 h-2.5" /> <span>VERIFIED</span>
                        </span>
                      )}
                      {auditState.disputed && (
                        <span className="bg-rose-100 text-rose-800 text-[8px] px-1.5 py-0.5 rounded-md font-bold flex items-center space-x-0.5 font-mono">
                          <ShieldAlert className="w-2.5 h-2.5" /> <span>DISPUTED</span>
                        </span>
                      )}
                      {!auditState.verified && !auditState.disputed && (
                        <span className="bg-amber-100/60 text-amber-850 text-[8px] px-1.5 py-0.5 rounded-md font-bold font-mono">
                          UNAUDITED
                        </span>
                      )}
                    </div>
                    <h4 className="text-xs font-bold text-slate-900 truncate leading-tight w-full">{issue.title}</h4>
                    <p className="text-[10px] text-slate-500 font-mono truncate w-full">📍 {issue.address.split(',')[0]}</p>
                  </button>
                );
              })}
              {filteredResolvedIssues.length === 0 && (
                <div className="text-center py-6">
                  <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-medium">{t('no_matching_resolved', 'No matching resolved cases found.')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Selected Resolution Detail & Before-and-After Slider (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200/80 p-5 md:p-6 shadow-sm min-h-[500px] flex flex-col justify-between">
          {selectedIssue ? (
            <div className="h-full flex flex-col justify-between space-y-6">
              
              {/* Header metadata about selected resolved issue */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-2 py-0.5 rounded font-mono">
                      RESOLVED
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                      📍 {selectedIssue.address.split(',')[0]}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-950 tracking-tight mt-1">{selectedIssue.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{selectedIssue.description}</p>
                  {selectedIssue.voiceUrl && (
                    <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between max-w-sm">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-[10px] font-bold font-mono text-slate-500">Citizen Audio:</span>
                      </div>
                      <audio controls src={selectedIssue.voiceUrl} className="h-6 max-w-[170px] md:max-w-[190px] text-[10px] focus:outline-none" />
                    </div>
                  )}
                </div>

                <div className="text-left sm:text-right font-mono font-semibold shrink-0">
                  <p className="text-[9px] text-slate-400 uppercase">WARD DEPARTMENT</p>
                  <p className="text-[11px] text-slate-950 font-bold mt-0.5 flex items-center sm:justify-end space-x-1">
                    <Building className="w-3.5 h-3.5 text-slate-500" />
                    <span>{selectedIssue.assignedDepartment || "Not Assigned"}</span>
                  </p>
                </div>
              </div>

              {/* Before and After Interactive Showcase Box */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-600">
                    <Eye className="w-4 h-4 text-emerald-600" />
                    <span>Visual Repair Evidence Audit</span>
                  </div>

                  {/* Mode select buttons */}
                  <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-lg">
                    <button
                      onClick={() => setViewMode('slider')}
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md cursor-pointer transition-all flex items-center space-x-1 ${
                        viewMode === 'slider' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Interactive Slider</span>
                    </button>
                    <button
                      onClick={() => setViewMode('side-by-side')}
                      className={`px-2.5 py-1 text-[10px] font-extrabold rounded-md cursor-pointer transition-all flex items-center space-x-1 ${
                        viewMode === 'side-by-side' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      <Database className="w-3 h-3" />
                      <span>Side-by-Side</span>
                    </button>
                  </div>
                </div>

                {/* Main comparison viewport */}
                {viewMode === 'slider' ? (
                  <div 
                    className="relative w-full h-[320px] rounded-2xl overflow-hidden shadow-inner border border-slate-200 bg-slate-900 select-none cursor-ew-resize"
                    onMouseMove={onMouseMove}
                    onTouchMove={onTouchMove}
                    onMouseDown={() => setIsSliding(true)}
                    onMouseUp={() => setIsSliding(false)}
                    onMouseLeave={() => setIsSliding(false)}
                    onTouchStart={() => setIsSliding(true)}
                    onTouchEnd={() => setIsSliding(false)}
                  >
                    {/* Before Image (Base layer) */}
                    <img 
                      src={selectedIssue.photoUrl} 
                      alt="Before Repair" 
                      className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-3 left-3 bg-rose-600/90 backdrop-blur-xs text-white text-[9px] font-extrabold px-2.5 py-1 rounded-lg font-mono tracking-widest shadow-xs">
                      BEFORE HAP-HAZARD
                    </div>

                    {/* After Image (Overlay layer - width controlled by slider) */}
                    <div 
                      className="absolute inset-y-0 left-0 overflow-hidden pointer-events-none border-r border-white/60"
                      style={{ width: `${sliderPosition}%` }}
                    >
                      <img 
                        src={getResolvedPhotoUrl(selectedIssue)} 
                        alt="After Repair Proof" 
                        className="absolute inset-0 w-full h-[320px] object-cover max-w-none pointer-events-none"
                        style={{ width: '100%', height: '100%' }}
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 left-3 bg-emerald-600/95 backdrop-blur-xs text-white text-[9px] font-extrabold px-2.5 py-1 rounded-lg font-mono tracking-widest shadow-xs whitespace-nowrap">
                        ✅ AFTER REPAIRED
                      </div>
                    </div>

                    {/* Draggable Divider Handle */}
                    <div 
                      className="absolute inset-y-0 w-1 bg-white cursor-ew-resize flex items-center justify-center pointer-events-none shadow-xl"
                      style={{ left: `${sliderPosition}%` }}
                    >
                      <div className="w-7 h-7 bg-white text-slate-800 rounded-full border border-slate-200 flex items-center justify-center shadow-lg pointer-events-auto active:scale-110 transition-transform">
                        <ArrowRightLeft className="w-3.5 h-3.5 text-slate-600 font-bold" />
                      </div>
                    </div>

                    {/* Subtle User Instructions Prompt overlay */}
                    <div className="absolute bottom-3 right-3 bg-slate-900/70 backdrop-blur-xs text-slate-200 text-[8px] font-semibold px-2 py-1 rounded font-mono pointer-events-none">
                      Drag / Hover over image to compare
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Before card */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs h-[180px]">
                      <img 
                        src={selectedIssue.photoUrl} 
                        alt="Before" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-3 left-3 bg-rose-600/90 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded">
                        BEFORE HAZARD
                      </span>
                    </div>

                    {/* After card */}
                    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-xs h-[180px]">
                      <img 
                        src={getResolvedPhotoUrl(selectedIssue)} 
                        alt="After" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute top-3 left-3 bg-emerald-600/90 text-white font-mono font-black text-[9px] px-2 py-0.5 rounded">
                        AFTER RESOLVED
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Civic SLA & Audit Metadata Indicators */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50/70 p-4 rounded-2xl border border-slate-200/50">
                <div className="font-mono">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">SLA LIMITS</p>
                  <p className="text-xs text-slate-900 font-black mt-0.5">48 Hours</p>
                </div>
                <div className="font-mono">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">TIME TO FIX</p>
                  <p className="text-xs text-emerald-600 font-black mt-0.5">38 Hours (MET)</p>
                </div>
                <div className="font-mono">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">POSITIVE AUDITS</p>
                  <p className="text-xs text-emerald-600 font-black mt-0.5 flex items-center space-x-1">
                    <ThumbsUp className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500/10" />
                    <span>{selectedIssue.resolutionAudit?.verifiedBy?.length || 0} approvals</span>
                  </p>
                </div>
                <div className="font-mono">
                  <p className="text-[9px] text-slate-400 font-bold uppercase">DISPUTED LOGS</p>
                  <p className="text-xs text-rose-600 font-black mt-0.5 flex items-center space-x-1">
                    <ThumbsDown className="w-3.5 h-3.5 text-rose-500 fill-rose-500/10" />
                    <span>{selectedIssue.resolutionAudit?.disputedBy?.length || 0} / 3 concerns</span>
                  </p>
                </div>
              </div>

              {/* Citizen Audit Interaction Panel */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 tracking-tight font-mono uppercase">
                  CITIZEN DECISION BOARD
                </h4>

                {currentUserProfile ? (
                  (() => {
                    const auditState = hasUserAudited(selectedIssue);
                    if (auditState.verified) {
                      return (
                        <div className="bg-emerald-50 text-emerald-950 p-4 rounded-2xl border border-emerald-200/50 flex items-center space-x-3 shadow-2xs">
                          <div className="bg-emerald-500 text-white p-2 rounded-xl">
                            <Check className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold font-sans">You verified this resolution order!</p>
                            <p className="text-[10px] text-emerald-700 font-medium font-sans mt-0.5">
                              Thank you for keeping our national civic ledger safe and validated. Your +15 XP bonus is loaded.
                            </p>
                          </div>
                        </div>
                      );
                    }
                    if (auditState.disputed) {
                      return (
                        <div className="bg-rose-50 text-rose-950 p-4 rounded-2xl border border-rose-200/50 flex items-center space-x-3 shadow-2xs">
                          <div className="bg-rose-500 text-white p-2 rounded-xl">
                            <ShieldAlert className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold font-sans">You disputed this resolution!</p>
                            <p className="text-[10px] text-rose-700 font-medium font-sans mt-0.5">
                              Your feedback report has been routed back to the commission. Thank you for your rigorous citizen oversight.
                            </p>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-500 font-sans">
                          Have you inspected this location or do you trust the photographic repair proof? Please cast your official vote:
                        </p>
                        
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                          <button
                            onClick={handleVerify}
                            disabled={isSubmitting}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-xs cursor-pointer active:scale-98 transition-all"
                          >
                            <CheckCircle2 className="w-4.5 h-4.5 text-white animate-pulse" />
                            <span>Verify and Approve Resolution (+15 XP)</span>
                          </button>

                          <button
                            onClick={() => setShowDisputeForm(!showDisputeForm)}
                            disabled={isSubmitting}
                            className="bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-950 text-xs font-extrabold py-3.5 px-5 rounded-2xl flex items-center justify-center space-x-2 cursor-pointer transition-colors"
                          >
                            <ShieldAlert className="w-4.5 h-4.5 text-slate-500 hover:text-rose-600" />
                            <span>Dispute Repair Quality</span>
                          </button>
                        </div>

                        {/* Dispute Expanded Form */}
                        {showDisputeForm && (
                          <motion.form 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            onSubmit={handleDisputeSubmit}
                            className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3 mt-3"
                          >
                            <div className="flex items-center space-x-1.5 text-rose-950 font-bold text-xs">
                              <AlertCircle className="w-4 h-4 text-rose-500" />
                              <span>Audit Dispute Form</span>
                            </div>
                            <div className="bg-amber-50 text-amber-900 text-[10px] p-2.5 rounded-xl border border-amber-200/50 leading-relaxed font-sans mt-1">
                              ⚠️ <strong>Dispute Protocol:</strong> If an incident accumulates <strong>3 or more verified dispute flags</strong> from distinct citizens, the case is automatically <strong>re-opened</strong> and marked as <strong>In Progress</strong> for immediate corrective works by the assigned department.
                            </div>
                            <textarea
                              value={disputeMessage}
                              onChange={(e) => setDisputeMessage(e.target.value)}
                              placeholder="Please describe why this repair is insufficient or incorrect (e.g., asphalt cracking, trash still present)..."
                              className="w-full bg-white border border-slate-200 rounded-xl text-xs p-3 h-20 focus:outline-none focus:ring-1 focus:ring-rose-500 resize-none text-slate-700 font-medium"
                              required
                            />
                            <div className="flex justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => setShowDisputeForm(false)}
                                className="px-3 py-2 text-[10px] text-slate-500 font-bold hover:text-slate-700 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                type="submit"
                                disabled={isSubmitting}
                                className="bg-rose-600 text-white font-extrabold text-[10px] px-4 py-2 rounded-xl hover:bg-rose-700 cursor-pointer shadow-xs"
                              >
                                {isSubmitting ? 'Submitting...' : 'Register Formal Dispute Alert'}
                              </button>
                            </div>
                          </motion.form>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <div className="bg-slate-50 text-slate-500 text-xs p-4 rounded-2xl text-center font-mono">
                    Please log in to audit municipal repairs and claim points.
                  </div>
                )}
              </div>

              {/* Live Commendations & Notes feed */}
              <div className="border-t border-slate-100 pt-5 space-y-4">
                <h4 className="text-xs font-bold text-slate-900 tracking-tight font-mono uppercase flex items-center space-x-1.5">
                  <MessageSquare className="w-4 h-4 text-emerald-600" />
                  <span>Citizen Audit Notes & Commendations ({selectedIssue.resolutionAudit?.feedbackComments?.length || 0})</span>
                </h4>

                {/* List comments */}
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-1">
                  {selectedIssue.resolutionAudit?.feedbackComments?.map((comment, index) => (
                    <div key={index} className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 flex items-start space-x-3">
                      <img 
                        src={comment.userAvatar || `https://api.dicebear.com/7.x/pixel-art/svg?seed=${comment.userId}`} 
                        alt={comment.userName} 
                        className="w-7 h-7 rounded-full border border-slate-200 shadow-3xs mt-0.5 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] font-black text-slate-900 truncate">{comment.userName}</p>
                          <span className="text-[8px] text-slate-400 font-mono font-bold">
                            {new Date(comment.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                        <p className={`text-[11px] mt-1 leading-normal ${
                          comment.type === 'concern' ? 'text-rose-800 bg-rose-50/50 p-2 rounded-lg border border-rose-100/30' : 'text-slate-600'
                        }`}>
                          {comment.text}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(!selectedIssue.resolutionAudit?.feedbackComments || selectedIssue.resolutionAudit.feedbackComments.length === 0) && (
                    <p className="text-[11px] text-slate-400 text-center py-4 font-sans italic">No commendation comments submitted yet. Be the first to thank the service crew!</p>
                  )}
                </div>

                {/* Post comment input form */}
                {currentUserProfile && (
                  <form onSubmit={handlePostComment} className="flex space-x-2 items-center">
                    <input
                      type="text"
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      placeholder="Add an appreciation comment or repair log note..."
                      className="flex-1 bg-slate-50 border border-slate-200/80 rounded-xl text-xs px-3 py-2.5 text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:bg-white transition-all font-semibold"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !newCommentText.trim()}
                      className="bg-emerald-600 text-white p-2.5 rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer shadow-xs disabled:opacity-40 shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center my-auto space-y-3">
              <ShieldAlert className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400 font-bold font-mono">{t('no_resolved_selected', 'No resolved record selected. Use search or filter to pick an audited incident report.')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
