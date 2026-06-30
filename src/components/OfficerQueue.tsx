import React, { useState, useEffect } from 'react';
import { 
  Shield, Hammer, ClipboardCheck, ArrowRight, 
  UserCheck, AlertCircle, Calendar, Users, 
  HelpCircle, CheckCircle, FileText, Send, 
  Clock, ShieldAlert, Sparkles, Volume2,
  Search, Filter, ArrowUpDown, Mail, Download, RefreshCw, X, Database
} from 'lucide-react';
import { Issue, IssueStatus, Department } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { useLanguage } from './LanguageContext';

interface OfficerQueueProps {
  issues: Issue[];
  onStatusUpdate: (
    issueId: string, 
    newStatus: IssueStatus, 
    commentMessage: string, 
    assignedOfficer?: string,
    severity?: any,
    assignedDepartment?: string
  ) => void;
  departments: Department[];
  onAddComment?: (issueId: string, commentText: string) => void;
  currentUser?: any;
}

export default function OfficerQueue({ issues, onStatusUpdate, departments, onAddComment, currentUser }: OfficerQueueProps) {
  const { language, t } = useLanguage();
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(issues.find(i => i.status !== 'resolved')?.id || issues[0]?.id || null);
  const [statusMessage, setStatusMessage] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus>('in_progress');
  const [showNotification, setShowNotification] = useState<string | null>(null);

  const [overrideSeverity, setOverrideSeverity] = useState<string>('');
  const [reassignDepartment, setReassignDepartment] = useState<string>('');
  const [replyText, setReplyText] = useState('');

  // Report Modal & Dispatch states
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedReportType, setSelectedReportType] = useState<'workorders' | 'dispatch_hotlist'>('workorders');
  const [reportEmailRecipient, setReportEmailRecipient] = useState(currentUser?.email || 'officer@communityguard.org');
  const [isSendingReportEmail, setIsSendingReportEmail] = useState(false);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'resolved' | 'all'>('pending');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'severity' | 'newest' | 'oldest'>('severity');

  // Sync real-time sent emails log
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "sent_emails"), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEmailHistory(logs);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'sent_emails');
    });
    return () => unsubscribe();
  }, []);

  const generateOfficerReportData = () => {
    if (selectedReportType === 'workorders') {
      const activeIssues = issues.filter(i => i.status !== 'resolved');
      const csvHeader = "Incident ID,Title,Category,Severity,Address,Reported Date,Current Status\n";
      const csvRows = activeIssues.map(i => 
        `"${i.id.substring(0,6)}","${i.title.replace(/"/g, '""')}","${i.category.toUpperCase()}","${i.severity.toUpperCase()}","${i.address.replace(/"/g, '""')}","${new Date(i.timeline.reportedAt).toLocaleDateString()}","${i.status.toUpperCase()}"`
      ).join("\n");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #b45309; margin-bottom: 4px;">Civic Guard - Departmental Outstanding Workorders</h2>
          <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Generated at: ${new Date().toLocaleString()} | Role: Supervising Officer</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #fef3c7; text-align: left; font-size: 12px; color: #92400e;">
                <th style="padding: 10px; border-bottom: 2px solid #fde68a;">ID</th>
                <th style="padding: 10px; border-bottom: 2px solid #fde68a;">Incident Title</th>
                <th style="padding: 10px; border-bottom: 2px solid #fde68a;">Category</th>
                <th style="padding: 10px; border-bottom: 2px solid #fde68a;">Severity</th>
                <th style="padding: 10px; border-bottom: 2px solid #fde68a;">Address</th>
              </tr>
            </thead>
            <tbody>
              ${activeIssues.map(i => `
                <tr style="font-size: 11px; border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #b45309;">#${i.id.substring(0,6)}</td>
                  <td style="padding: 10px; font-weight: bold; color: #0f172a;">${i.title}</td>
                  <td style="padding: 10px; text-transform: uppercase;">${i.category}</td>
                  <td style="padding: 10px; font-weight: bold; color: ${i.severity === 'critical' ? '#b91c1c' : '#d97706'}; text-transform: uppercase;">${i.severity}</td>
                  <td style="padding: 10px; color: #475569;">${i.address}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      return {
        filename: `officer_outstanding_workorders_${new Date().toISOString().split('T')[0]}.csv`,
        csvContent: csvHeader + csvRows,
        subject: "Field Report: Outstanding Departmental Workorders",
        htmlContent: html,
        textMsg: `Supervising officer, please find attached the active workorders report generated on ${new Date().toLocaleDateString()}.`
      };
    } else {
      const urgentIssues = issues.filter(i => i.severity === 'high' || i.severity === 'critical');
      const csvHeader = "Incident ID,Title,Category,Severity,Address,Escalation status\n";
      const csvRows = urgentIssues.map(i => 
        `"${i.id.substring(0,6)}","${i.title.replace(/"/g, '""')}","${i.category.toUpperCase()}","${i.severity.toUpperCase()}","${i.address.replace(/"/g, '""')}","ACTIVE ESCALATION"`
      ).join("\n");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #dc2626; margin-bottom: 4px;">Civic Guard - Urgent Emergency Dispatch Ledger</h2>
          <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Urgent field repairs. Generated at: ${new Date().toLocaleString()}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #fee2e2; text-align: left; font-size: 12px; color: #991b1b;">
                <th style="padding: 10px; border-bottom: 2px solid #fecaca;">ID</th>
                <th style="padding: 10px; border-bottom: 2px solid #fecaca;">Title</th>
                <th style="padding: 10px; border-bottom: 2px solid #fecaca;">Category</th>
                <th style="padding: 10px; border-bottom: 2px solid #fecaca;">Address</th>
              </tr>
            </thead>
            <tbody>
              ${urgentIssues.map(i => `
                <tr style="font-size: 11px; border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #dc2626;">#${i.id.substring(0,6)}</td>
                  <td style="padding: 10px; font-weight: bold; color: #0f172a;">${i.title}</td>
                  <td style="padding: 10px; text-transform: uppercase;">${i.category}</td>
                  <td style="padding: 10px; color: #475569;">${i.address}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      return {
        filename: `officer_emergency_hotlist_${new Date().toISOString().split('T')[0]}.csv`,
        csvContent: csvHeader + csvRows,
        subject: "🚨 URGENT HOTLIST: High Severity Incident Dispatch Logs",
        htmlContent: html,
        textMsg: `Attention: There are active emergency civic hazards requiring supervisor assignment. Please find details attached.`
      };
    }
  };

  const handleDownloadCSV = () => {
    const report = generateOfficerReportData();
    const blob = new Blob([report.csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", report.filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSendEmail = async () => {
    setIsSendingReportEmail(true);
    setEmailStatusMessage(null);
    const report = generateOfficerReportData();
    const base64Content = btoa(unescape(encodeURIComponent(report.csvContent)));
    
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: reportEmailRecipient,
          subject: report.subject,
          bodyText: report.textMsg,
          bodyHtml: report.htmlContent,
          role: 'officer',
          senderName: 'Supervising Officer',
          attachments: [{
            filename: report.filename,
            content: base64Content,
            encoding: 'base64'
          }]
        })
      });
      const data = await response.json();
      if (data.success) {
        setEmailStatusMessage(`🎉 SUCCESS: Report successfully emailed to ${reportEmailRecipient}!`);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      console.error("Failed to transmit email:", err);
      setEmailStatusMessage(`❌ ERROR: Failed to dispatch mail. Error description: ${err.message}`);
    } finally {
      setIsSendingReportEmail(false);
    }
  };

  const filteredAndSortedIssues = issues
    .filter(issue => {
      if (statusFilter === 'pending' && issue.status === 'resolved') return false;
      if (statusFilter === 'resolved' && issue.status !== 'resolved') return false;
      if (categoryFilter !== 'all' && issue.category !== categoryFilter) return false;
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase();
        return (
          issue.title.toLowerCase().includes(query) ||
          issue.description.toLowerCase().includes(query) ||
          issue.address.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'severity') {
        const severityWeight = { critical: 4, high: 3, medium: 2, low: 1 };
        const weightA = severityWeight[a.severity] || 0;
        const weightB = severityWeight[b.severity] || 0;
        return weightB - weightA;
      } else if (sortBy === 'newest') {
        return new Date(b.timeline.reportedAt).getTime() - new Date(a.timeline.reportedAt).getTime();
      } else {
        return new Date(a.timeline.reportedAt).getTime() - new Date(b.timeline.reportedAt).getTime();
      }
    });

  const selectedIssue = issues.find(i => i.id === selectedIssueId);

  React.useEffect(() => {
    if (selectedIssue) {
      setOfficerName(selectedIssue.assignedOfficer || '');
      setOverrideSeverity(selectedIssue.severity);
      setReassignDepartment(selectedIssue.assignedDepartment || '');
      setSelectedStatus(selectedIssue.status === 'reported' || selectedIssue.status === 'verified' ? 'in_progress' : selectedIssue.status);
    }
  }, [selectedIssueId]);

  const isAlreadyDispatched = !selectedIssue || (
    selectedIssue.status === selectedStatus &&
    (officerName.trim() === (selectedIssue.assignedOfficer || '')) &&
    (overrideSeverity === selectedIssue.severity) &&
    (reassignDepartment === (selectedIssue.assignedDepartment || '')) &&
    statusMessage.trim() === ''
  );

  // Quick resolution presets to save time
  const RESOLUTION_TEMPLATES = {
    in_progress: [
      "Site inspected. Emergency repair crew mobilized with equipment.",
      "Primary valve shut down. Excavation starting to locate pipe breach.",
      "Sanitation crew scheduled for immediate dumpster pick-up."
    ],
    resolved: [
      "Pavement excavation backfilled and sealed with hot-asphalt compound.",
      "Corroded water connection replaced. Mains pressure stabilized.",
      "Decomposing organic garbage fully collected. Container disinfected."
    ]
  };

  const handleApplyTemplate = (text: string) => {
    setStatusMessage(text);
  };

  const handleSendReply = () => {
    if (!replyText.trim() || !selectedIssue) return;
    if (onAddComment) {
      onAddComment(selectedIssue.id, replyText);
      setReplyText('');
    }
  };

  const handleSubmitStatus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIssue) return;
    
    onStatusUpdate(
      selectedIssue.id,
      selectedStatus,
      statusMessage || `Officer status update: ${selectedStatus.toUpperCase()}`,
      officerName || undefined,
      overrideSeverity || undefined,
      reassignDepartment || undefined
    );

    const updatedStatusName = selectedStatus.toUpperCase();
    setStatusMessage('');
    setOfficerName('');
    
    // Set modern inline notification toast instead of window.alert
    setShowNotification(`Dispatched Service Order update for issue #${selectedIssue.id.substring(0, 6)}: ${updatedStatusName}`);
    setTimeout(() => {
      setShowNotification(null);
    }, 5000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Visual Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950 tracking-tight flex items-center space-x-2">
            <Shield className="w-5.5 h-5.5 text-amber-500 animate-pulse" />
            <span>{t('municipal_dispatch_console', 'Municipal Incident Dispatch Console')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            {t('dispatch_console_desc', 'Official dashboard for ward commissioners and public works supervisors to manage SLAs, assign engineers, and resolve hazards.')}
          </p>
        </div>
        
        <div className="mt-4 md:mt-0 flex items-center gap-3">
          <button
            onClick={() => setShowReportModal(true)}
            className="cursor-pointer bg-slate-900 hover:bg-slate-800 text-white text-[10px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-xl border border-slate-800 shadow-md flex items-center space-x-1.5 transition-all"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>{t('reports_mailer', 'Reports & Mailer')}</span>
          </button>

          <div className="bg-amber-50 text-amber-900 text-[10px] px-3.5 py-2.5 rounded-xl border border-amber-200/50 font-mono font-bold flex items-center space-x-1.5 shadow-2xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>{t('officer_credentials_authorized', 'OFFICER CREDENTIALS AUTHORIZED')}</span>
          </div>
        </div>
      </div>

      {/* Floating Status Notification Toast */}
      <AnimatePresence>
        {showNotification && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-800 flex items-center space-x-3 max-w-xl mx-auto z-50 relative"
          >
            <div className="bg-amber-400 text-amber-950 p-2 rounded-xl">
              <CheckCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 text-xs">
              <p className="font-bold text-slate-100">Service Order Dispatched Successfully</p>
              <p className="text-slate-400 mt-0.5">{showNotification}</p>
            </div>
            <button 
              onClick={() => setShowNotification(null)}
              className="text-slate-400 hover:text-white text-[11px] font-bold font-mono px-2"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Interactive incident queue (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <FileText className="w-4 h-4 text-amber-500" />
              <span>{t('incidents_queue', 'Incidents Queue')} ({filteredAndSortedIssues.length})</span>
            </h3>
            <span className="text-[9px] bg-slate-50 text-slate-500 font-mono font-bold px-2 py-0.5 rounded border border-slate-200/40">
              {issues.some(i => i.location && (Math.abs(i.location.latitude - 17.4) > 0.5 || Math.abs(i.location.longitude - 78.4) > 0.5)) ? t('all_india_hazards', 'All India Hazards') : t('local_wards', 'Local Wards')}
            </span>
          </div>

          {/* Quick Search & Filters Header toolbar */}
          <div className="space-y-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder={t('search_title_placeholder', 'Search by title, location or desc...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 hover:bg-slate-100/75 focus:bg-white text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200/80 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-400"
              />
            </div>

            {/* Status Tabs Selector */}
            <div className="grid grid-cols-3 gap-1 bg-slate-100 p-1 rounded-xl">
              {(['pending', 'resolved', 'all'] as const).map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`py-1 rounded-lg text-[10px] font-bold uppercase transition-all text-center cursor-pointer ${
                    statusFilter === status
                      ? 'bg-white text-amber-800 shadow-2xs'
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {t(status, status)}
                </button>
              ))}
            </div>

            {/* Sorting & Category Filtering controls */}
            <div className="grid grid-cols-2 gap-2 text-[9.5px]">
              {/* Category Dropdown */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 space-x-1">
                <Filter className="w-3 h-3 text-slate-400 shrink-0" />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-slate-600 font-bold border-none w-full focus:outline-none cursor-pointer"
                >
                  <option value="all">{t('all_categories', 'All Categories')}</option>
                  <option value="pothole">{t('cat_pothole', '🚧 Roads & Potholes')}</option>
                  <option value="water">{t('cat_water', '💧 Water & Sewers')}</option>
                  <option value="light">{t('cat_light', '💡 Streetlights')}</option>
                  <option value="garbage">{t('cat_garbage', '🗑️ Garbage & Sanitation')}</option>
                  <option value="traffic">{t('cat_traffic', '🚦 Traffic & Signs')}</option>
                  <option value="drainage">{t('cat_drainage', '🌀 Drainage Problems')}</option>
                </select>
              </div>

              {/* Sorting Dropdown */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 space-x-1">
                <ArrowUpDown className="w-3 h-3 text-slate-400 shrink-0" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="bg-transparent text-slate-600 font-bold border-none w-full focus:outline-none cursor-pointer"
                >
                  <option value="severity">{t('severity_rank', 'Severity Rank')}</option>
                  <option value="newest">{t('newest_first', 'Newest First')}</option>
                  <option value="oldest">{t('oldest_first', 'Oldest First')}</option>
                </select>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[360px] lg:max-h-[460px] overflow-y-auto pr-1">
            {filteredAndSortedIssues.map((issue) => {
              const isSelected = selectedIssueId === issue.id;
              const isResolved = issue.status === 'resolved';

              let dotColor = 'bg-amber-400';
              if (issue.severity === 'critical') dotColor = 'bg-rose-500 animate-pulse';
              else if (issue.severity === 'high') dotColor = 'bg-orange-500';

              return (
                <motion.div
                  key={issue.id}
                  onClick={() => {
                    setSelectedIssueId(issue.id);
                    setSelectedStatus(issue.status === 'reported' || issue.status === 'verified' ? 'in_progress' : issue.status);
                  }}
                  whileHover={{ x: 2 }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col space-y-2 ${
                    isSelected
                      ? 'bg-amber-50/20 border-amber-500/50 ring-1 ring-amber-500/10 shadow-xs'
                      : 'bg-slate-50/50 border-slate-200/60 hover:bg-slate-50/80'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-2">
                      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
                      <h4 className="text-[11px] font-black text-slate-900 truncate max-w-[160px] leading-tight">{issue.title}</h4>
                    </div>
                    <span className={`text-[8px] font-mono font-black uppercase px-1.5 py-0.5 rounded border shrink-0 ${
                      isResolved 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-100/60' 
                        : 'bg-amber-50 text-amber-800 border-amber-100/60'
                    }`}>
                      {issue.status}
                    </span>
                  </div>

                  <p className="text-[10px] text-slate-500 line-clamp-2 leading-relaxed font-sans">
                    {issue.description}
                  </p>

                  <div className="flex items-center justify-between text-[8px] text-slate-400 font-mono border-t border-slate-100 pt-1.5 font-bold">
                    <span className="text-slate-600 uppercase font-mono">{issue.category}</span>
                    <span className="truncate max-w-[130px]">📍 {issue.address}</span>
                  </div>
                </motion.div>
              );
            })}
            {filteredAndSortedIssues.length === 0 && (
              <div className="text-center py-10 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                <ShieldAlert className="w-6 h-6 mx-auto mb-2 text-slate-300" />
                <p className="text-[11px] font-bold">{t('no_issues_match', 'No issues match current filters')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Operational dispatch controls (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200/80 p-5 shadow-md lg:h-[620px] h-auto flex flex-col justify-between">
          {selectedIssue ? (
            <div className="lg:h-full flex flex-col justify-between lg:overflow-hidden">
              <div className="lg:overflow-y-auto flex-1 pr-1 space-y-4 pb-4">
                
                {/* Selected issue brief info card */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200/50 flex items-start space-x-4">
                  {selectedIssue.photoUrl && (
                    <img
                      src={selectedIssue.photoUrl}
                      alt={selectedIssue.title}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 object-cover rounded-xl border border-slate-200 shadow-inner"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-[9px] font-extrabold font-mono bg-rose-50 text-rose-800 border border-rose-100 px-1.5 py-0.5 rounded">
                        {selectedIssue.severity.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-extrabold font-mono bg-slate-100 text-slate-700 border border-slate-200/80 px-1.5 py-0.5 rounded">
                        {selectedIssue.category.toUpperCase()}
                      </span>
                    </div>
                    <h4 className="text-sm font-extrabold text-slate-950 mt-1.5 truncate leading-tight">{selectedIssue.title}</h4>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">📍 {selectedIssue.address}</p>
                  </div>
                </div>

                {/* Selected issue full description & Voice note */}
                <div className="bg-slate-50/40 p-3.5 rounded-2xl border border-slate-200/40 space-y-2">
                  <span className="text-[8px] font-extrabold text-slate-400 font-mono uppercase tracking-wider block">CITIZEN EVIDENCE BRIEF</span>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                    {selectedIssue.description}
                  </p>
                  {selectedIssue.voiceUrl && (
                    <div className="mt-2 pt-2 border-t border-slate-200/40 flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-slate-700">
                        <Volume2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="text-[9px] font-bold font-mono text-slate-500">Citizen Audio:</span>
                      </div>
                      <audio controls src={selectedIssue.voiceUrl} className="h-6 max-w-[170px] md:max-w-[210px] text-[10px] focus:outline-none" />
                    </div>
                  )}
                </div>

                {/* SLA countdown and auto-escalation tracker */}
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

                    return (
                      <div className={`p-3.5 rounded-2xl border ${
                        isBreached 
                          ? 'bg-rose-50 border-rose-200 text-rose-950' 
                          : remainingMs < 12 * 3600 * 1000
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      } flex flex-col space-y-2`}>
                        <div className="flex justify-between items-center text-[10px] font-mono">
                          <span className="font-extrabold flex items-center space-x-1.5">
                            <Clock className={`w-3.5 h-3.5 ${isBreached ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`} />
                            <span>Response Target Tracker</span>
                          </span>
                          <span className="font-black">
                            {isBreached 
                              ? `OVERDUE BY ${remHours}h ${remMinutes}m` 
                              : `TIME REMAINING: ${remHours}h ${remMinutes}m`}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                          <div 
                            style={{ width: `${percent}%` }}
                            className={`h-full rounded-full transition-all duration-500 ${
                              isBreached 
                                ? 'bg-rose-500 animate-pulse' 
                                : remainingMs < 12 * 3600 * 1000
                                ? 'bg-amber-400'
                                : 'bg-emerald-500'
                            }`}
                          />
                        </div>

                        {/* Breach / Escalation Status Text */}
                        <div className="flex items-center justify-between text-[9px] font-semibold leading-normal pt-0.5 font-mono">
                          <span>Allowed: {allowedHours}h Response Target</span>
                          {isBreached ? (
                            <span className="text-rose-600 font-bold uppercase tracking-wider animate-pulse flex items-center space-x-1">
                              <span>⚠️ LATE RESPONSE ESCALATED</span>
                            </span>
                          ) : (
                            <span className="text-emerald-600">Within Target Window</span>
                          )}
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Live Citizen-Officer Comment Feed & Timeline */}
                <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-200/60 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-extrabold text-slate-450 font-mono uppercase tracking-wider block">Incident Feed & Community Chat ({(Array.isArray(selectedIssue.updates) ? selectedIssue.updates : []).length})</span>
                    <span className="text-[8px] bg-emerald-50 text-emerald-800 font-extrabold px-1.5 py-0.5 rounded uppercase font-mono">Live Sync</span>
                  </div>

                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {(Array.isArray(selectedIssue.updates) ? selectedIssue.updates : []).map((upd, idx) => {
                      const isSystem = upd.byRole === 'system';
                      const isOfc = upd.byRole === 'officer';
                      const badgeBg = isSystem ? 'bg-slate-200/70 text-slate-700' : isOfc ? 'bg-amber-100 text-amber-900 border-amber-200/50' : 'bg-blue-50 text-blue-800 border-blue-100';
                      
                      return (
                        <div key={idx} className="bg-white border border-slate-100 p-2.5 rounded-xl text-[10.5px] space-y-1 shadow-2xs">
                          <div className="flex items-center justify-between text-[8px] font-mono">
                            <div className="flex items-center space-x-1.5">
                              <span className={`px-1.5 py-0.5 rounded font-extrabold text-[7.5px] border ${badgeBg}`}>{upd.byRole.toUpperCase()}</span>
                              <span className="font-extrabold text-slate-500">Update</span>
                            </div>
                            <span className="text-slate-400">{new Date(upd.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          </div>
                          <p className="text-slate-700 font-sans leading-relaxed font-semibold">{upd.message}</p>
                        </div>
                      );
                    })}
                    {(!selectedIssue.updates || !Array.isArray(selectedIssue.updates) || selectedIssue.updates.length === 0) && (
                      <p className="text-[10px] text-slate-400 italic text-center py-2">No comments or activity log entries yet.</p>
                    )}
                  </div>

                  {onAddComment && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Type reply or note to citizen..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendReply();
                          }
                        }}
                        className="flex-1 bg-white hover:bg-slate-50/50 focus:bg-white text-xs py-2 px-3 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none transition-all placeholder:text-slate-400 font-semibold text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={handleSendReply}
                        className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-2 px-4 rounded-xl cursor-pointer transition-all shrink-0 flex items-center space-x-1"
                      >
                        <Send className="w-3 h-3" />
                        <span>Reply</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Form dispatch controls */}
                <form onSubmit={handleSubmitStatus} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Status selection */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 font-mono uppercase block mb-1">Service Action Order</label>
                      <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as IssueStatus)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-3 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="assigned">Assign To Department</option>
                        <option value="in_progress">Discharge Crew: IN PROGRESS</option>
                        <option value="resolved">Verify Repair: RESOLVED & CLOSED</option>
                        <option value="rejected">Audit Rejected: REJECTED</option>
                      </select>
                    </div>
 
                    {/* Officer name */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 font-mono uppercase block mb-1">Assigned Site Supervisor</label>
                      <input
                        type="text"
                        value={officerName}
                        onChange={(e) => setOfficerName(e.target.value)}
                        placeholder="e.g. Engineer Ramesh Kumar"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-3 focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Severity Override */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 font-mono uppercase block mb-1">Severity Rating Override</label>
                      <select
                        value={overrideSeverity}
                        onChange={(e) => setOverrideSeverity(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-3 font-semibold text-slate-750 focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700 font-bold"
                      >
                        <option value="low">🟢 Low Priority</option>
                        <option value="medium">🟡 Medium Priority</option>
                        <option value="high">🟠 High Priority</option>
                        <option value="critical">🔴 Critical Priority</option>
                      </select>
                    </div>

                    {/* Department Re-assignment */}
                    <div>
                      <label className="text-[9px] font-bold text-slate-400 font-mono uppercase block mb-1">Responsible Municipal Department</label>
                      <select
                        value={reassignDepartment}
                        onChange={(e) => setReassignDepartment(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-3 font-semibold text-slate-750 focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-700 font-bold"
                      >
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.name}>
                            🏢 {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
 
                  {/* Operational status comments */}
                  <div>
                    <label className="text-[9px] font-bold text-slate-400 font-mono uppercase block mb-1">Dispatch Logs / Progress update</label>
                    <textarea
                      value={statusMessage}
                      onChange={(e) => setStatusMessage(e.target.value)}
                      placeholder="Input official service crew field coordinates or repair completion logs..."
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-3 h-18 focus:outline-none focus:ring-1 focus:ring-amber-500 resize-none text-slate-700"
                    />
                  </div>
 
                  {/* Resolution quick presets */}
                  <div className="space-y-2">
                    <label className="text-[9px] font-bold text-slate-400 font-mono uppercase block">Activity History Log Templates</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      {selectedStatus === 'resolved'
                        ? RESOLUTION_TEMPLATES.resolved.map((text, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleApplyTemplate(text)}
                              className="bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 p-2.5 rounded-xl text-[10px] text-left leading-normal cursor-pointer transition-colors"
                            >
                              {text}
                            </button>
                          ))
                        : RESOLUTION_TEMPLATES.in_progress.map((text, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => handleApplyTemplate(text)}
                              className="bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-slate-700 p-2.5 rounded-xl text-[10px] text-left leading-normal cursor-pointer transition-colors"
                            >
                              {text}
                            </button>
                          ))}
                    </div>
                  </div>
 
                  {/* Action Dispatch Buttons */}
                  <button
                    type="submit"
                    disabled={isAlreadyDispatched}
                    className={`w-full font-extrabold p-3.5 rounded-2xl flex items-center justify-center space-x-2 transition-all shadow-md ${
                      isAlreadyDispatched
                        ? 'bg-slate-150 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                        : 'bg-slate-900 text-white hover:bg-slate-800 cursor-pointer'
                    }`}
                  >
                    {isAlreadyDispatched ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-xs">
                          {selectedIssue.status === 'resolved' 
                            ? "Service Order Closed & Resolved" 
                            : "Work Order Up to Date (No New Changes)"}
                        </span>
                      </>
                    ) : (
                      <>
                        <Hammer className="w-4 h-4 text-amber-400" />
                        <span className="text-xs">Dispatch Official Field Work Order</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="text-center my-auto space-y-2">
              <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="text-xs text-slate-400">Select any pending incident report from the left-hand queue to edit dispatch logs.</p>
            </div>
          )}
        </div>
      </div>

      {/* REPORTS & MAILER MODAL */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl border border-slate-200/80 shadow-2xl max-w-4xl w-full flex flex-col md:flex-row overflow-hidden h-[540px] text-left"
            >
              {/* Left Side: Controls */}
              <div className="flex-1 p-6 space-y-5 flex flex-col justify-between overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-amber-500" />
                      <h3 className="text-sm font-black text-slate-900">Officer's Executive Dispatch & Mail Hub</h3>
                    </div>
                    <button
                      onClick={() => {
                        setShowReportModal(false);
                        setEmailStatusMessage(null);
                      }}
                      className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer transition-colors focus:outline-none"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal font-sans">
                    Generate safe roadway bypass compliance records, department-wide pending workorders list, or emergency dispatch hotlists to send directly to city engineers.
                  </p>

                  {/* Report Type Selector */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black font-mono uppercase text-slate-400 block tracking-wider">Select Report Type</label>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'workorders', title: 'Departmental Workorders', desc: 'Outstanding active jobs listing' },
                        { id: 'dispatch_hotlist', title: 'Emergency Hotlist', desc: 'Active critical-priority roadway hazards' }
                      ].map(t => {
                        const isSelected = selectedReportType === t.id;
                        return (
                          <button
                            key={t.id}
                            onClick={() => setSelectedReportType(t.id as any)}
                            className={`p-3 rounded-xl border text-left flex flex-col justify-between h-20 transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                            }`}
                          >
                            <span className="text-[11px] font-black">{t.title}</span>
                            <span className={`text-[8.5px] leading-normal ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{t.desc}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Email Destination Input */}
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black font-mono uppercase text-slate-400 block tracking-wider">Email Recipient</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        value={reportEmailRecipient}
                        onChange={(e) => setReportEmailRecipient(e.target.value)}
                        placeholder="engineer@municipal.gov.in"
                        className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-amber-500 focus:outline-none transition-all font-semibold text-slate-800"
                      />
                    </div>
                  </div>
                </div>

                {/* Status message and action buttons */}
                <div className="space-y-3 pt-4 border-t border-slate-100">
                  {emailStatusMessage && (
                    <div className={`p-3 rounded-xl border text-[10px] font-semibold ${
                      emailStatusMessage.includes("ERROR") 
                        ? 'bg-rose-50 border-rose-100 text-rose-800' 
                        : 'bg-emerald-50 border-emerald-100 text-emerald-800'
                    }`}>
                      {emailStatusMessage}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={handleDownloadCSV}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-[10.5px] py-2.5 rounded-xl font-bold flex items-center justify-center space-x-1.5 border border-slate-200/50 cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download (CSV)</span>
                    </button>

                    <button
                      onClick={handleSendEmail}
                      disabled={isSendingReportEmail}
                      className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 text-slate-950 text-[10.5px] py-2.5 rounded-xl font-black flex items-center justify-center space-x-1.5 shadow-sm cursor-pointer transition-all"
                    >
                      {isSendingReportEmail ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Mailing Report...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-4 h-4" />
                          <span>Transmit Email</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Side: Audit Trail / History */}
              <div className="w-full md:w-[320px] bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 p-6 flex flex-col justify-between overflow-hidden">
                <div className="space-y-4 flex flex-col h-full justify-between">
                  <div>
                    <h4 className="text-[11px] font-black text-slate-900 uppercase font-mono tracking-wider flex items-center space-x-1.5">
                      <Database className="w-3.5 h-3.5 text-amber-500" />
                      <span>Email History Trail</span>
                    </h4>
                    <p className="text-[9px] text-slate-400 leading-normal mt-0.5">
                      Verifiable audit log of dispatched emails to community engineers synchronized with Firestore.
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto space-y-2 my-4 pr-1 scrollbar-thin">
                    {emailHistory.length > 0 ? (
                      emailHistory.map((log: any) => (
                        <div key={log.id} className="p-2.5 bg-white border border-slate-200/60 rounded-xl text-[9.5px] space-y-1 transition-all">
                          <div className="flex items-center justify-between font-mono font-bold">
                            <span className="text-slate-800 truncate max-w-[120px]">{log.to}</span>
                            <span className="text-slate-400 text-[8.5px]">{new Date(log.timestamp).toLocaleDateString()}</span>
                          </div>
                          <p className="font-extrabold text-slate-700 line-clamp-1">{log.subject}</p>
                          <div className="flex items-center gap-1.5 pt-0.5 text-[8px] font-mono text-slate-400">
                            <span className="bg-amber-50 border border-amber-100 text-amber-800 px-1 py-0.2 rounded font-black font-sans uppercase">{log.senderRole}</span>
                            {log.hasAttachments && <span className="text-slate-500">📎 CSV Attached</span>}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center text-slate-400 py-10">
                        <Mail className="w-6 h-6 text-slate-300 mb-1" />
                        <p className="text-[9px] font-bold">No dispatched records.</p>
                      </div>
                    )}
                  </div>

                  <div className="p-2.5 bg-white rounded-xl border border-slate-200/50 text-[8.5px] leading-relaxed text-slate-400">
                    Officially dispatched emails are delivered instantly utilizing sandboxed SMTP tunnels.
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
