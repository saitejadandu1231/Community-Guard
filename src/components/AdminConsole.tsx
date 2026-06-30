import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, Trash2, Megaphone, Bell, Clock, 
  Search, ShieldCheck, Database, RefreshCw, AlertTriangle, 
  CheckCircle, Plus, ToggleLeft, ToggleRight, X, Eye,
  Users, MapPin, Briefcase, UserCheck, Compass, Navigation,
  Settings, Mail, Download, ChevronRight, FileText
} from 'lucide-react';
import { collection, onSnapshot, doc, addDoc, deleteDoc, updateDoc, getDocs, setDoc, getDoc } from 'firebase/firestore';
import { db, OperationType, handleFirestoreError } from '../lib/firebase';
import { Issue, Department, UserProfile, UserRole, LatLng } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from './LanguageContext';

interface AdminConsoleProps {
  issues: Issue[];
  departments: Department[];
}

interface SystemAlert {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  createdAt: string;
  active: boolean;
}

export default function AdminConsole({ issues, departments }: AdminConsoleProps) {
  const { language, t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'alerts' | 'ledger' | 'slas' | 'officers' | 'system_settings' | 'reports'>('alerts');
  const [searchTerm, setSearchTerm] = useState('');
  const [alerts, setAlerts] = useState<SystemAlert[]>([]);
  const [newAlertTitle, setNewAlertTitle] = useState('');
  const [newAlertMsg, setNewAlertMsg] = useState('');
  const [newAlertType, setNewAlertType] = useState<'info' | 'warning' | 'critical'>('warning');
  
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const [submittingAlert, setSubmittingAlert] = useState(false);
  const [selectedLedgerIssue, setSelectedLedgerIssue] = useState<Issue | null>(null);

  // Executive Report & Email Dispatcher states
  const [selectedReportType, setSelectedReportType] = useState<'performance' | 'critical_log' | 'engagement'>('performance');
  const [reportEmailRecipient, setReportEmailRecipient] = useState('admin@communityguard.org');
  const [isSendingReportEmail, setIsSendingReportEmail] = useState(false);
  const [emailHistory, setEmailHistory] = useState<any[]>([]);
  const [emailStatusMessage, setEmailStatusMessage] = useState<string | null>(null);

  // System parameters configuration
  const [doubleXpActive, setDoubleXpActive] = useState(false);
  const [emergencyProtocolActive, setEmergencyProtocolActive] = useState(false);
  const [guardbotPersona, setGuardbotPersona] = useState<'standard' | 'crisis' | 'empathetic'>('standard');
  const [autoEscalationScore, setAutoEscalationScore] = useState(70);
  const [isSavingConfig, setIsSavingConfig] = useState(false);

  // SLA states loaded from departments
  const [pwdSLA, setPwdSLA] = useState(72);
  const [waterSLA, setWaterSLA] = useState(48);
  const [electricSLA, setElectricSLA] = useState(24);
  const [sanitationSLA, setSanitationSLA] = useState(48);
  const [trafficSLA, setTrafficSLA] = useState(48);
  const [savingSLAs, setSavingSLAs] = useState(false);

  // Officer & User Management states
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [userRoleEdit, setUserRoleEdit] = useState<UserRole>('citizen');
  const [userDeptEdit, setUserDeptEdit] = useState<string>('');
  const [userCityEdit, setUserCityEdit] = useState<string>('');
  const [userLatEdit, setUserLatEdit] = useState<number>(17.4265);
  const [userLngEdit, setUserLngEdit] = useState<number>(78.4116);
  const [savingUser, setSavingUser] = useState(false);
  const [officerFilter, setOfficerFilter] = useState<'all' | 'citizen' | 'officer' | 'admin'>('all');
  const [selectedAssignIssue, setSelectedAssignIssue] = useState<Issue | null>(null);

  // Add Officer Form states
  const [showAddOfficerForm, setShowAddOfficerForm] = useState(false);
  const [newOfficerName, setNewOfficerName] = useState('');
  const [newOfficerEmail, setNewOfficerEmail] = useState('');
  const [newOfficerDept, setNewOfficerDept] = useState('');
  const [newOfficerCity, setNewOfficerCity] = useState('New Delhi');
  const [newOfficerLat, setNewOfficerLat] = useState(28.6139);
  const [newOfficerLng, setNewOfficerLng] = useState(77.2090);
  const [addingOfficer, setAddingOfficer] = useState(false);

  // Indian regional presets
  const INDIAN_HUBS_PRESETS = [
    { name: 'Ahmedabad', lat: 23.0225, lng: 72.5714, state: 'Gujarat' },
    { name: 'New Delhi', lat: 28.6139, lng: 77.2090, state: 'Delhi NCR' },
    { name: 'Mumbai', lat: 19.0760, lng: 72.8777, state: 'Maharashtra' },
    { name: 'Bengaluru', lat: 12.9716, lng: 77.5946, state: 'Karnataka' },
    { name: 'Chennai', lat: 13.0827, lng: 80.2707, state: 'Tamil Nadu' },
    { name: 'Kolkata', lat: 22.5726, lng: 88.3639, state: 'West Bengal' },
    { name: 'Pune', lat: 18.5204, lng: 73.8567, state: 'Maharashtra' },
    { name: 'Nagpur', lat: 21.1458, lng: 79.0882, state: 'Maharashtra' },
  ];

  useEffect(() => {
    // Sync alerts from Firestore
    const unsubscribe = onSnapshot(collection(db, 'system_alerts'), (snapshot) => {
      const list: SystemAlert[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          title: data.title || '',
          message: data.message || '',
          type: data.type || 'info',
          createdAt: data.createdAt || new Date().toISOString(),
          active: data.active !== false
        });
      });
      // Sort newest first
      setAlerts(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setLoadingAlerts(false);
    }, (err) => {
      setLoadingAlerts(false);
      handleFirestoreError(err, OperationType.GET, 'system_alerts');
    });

    return () => unsubscribe();
  }, []);

  // Sync system configuration parameters from Firestore in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'system_config', 'parameters'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setDoubleXpActive(data.doubleXpActive || false);
        setEmergencyProtocolActive(data.emergencyProtocolActive || false);
        setGuardbotPersona(data.guardbotPersona || 'standard');
        setAutoEscalationScore(data.autoEscalationScore || 70);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'system_config/parameters');
    });
    return () => unsubscribe();
  }, []);

  const handleSaveConfig = async (updates: Partial<{
    doubleXpActive: boolean;
    emergencyProtocolActive: boolean;
    guardbotPersona: 'standard' | 'crisis' | 'empathetic';
    autoEscalationScore: number;
  }>) => {
    setIsSavingConfig(true);
    try {
      await setDoc(doc(db, 'system_config', 'parameters'), updates, { merge: true });
    } catch (err) {
      console.error("Failed to save system config:", err);
    } finally {
      setIsSavingConfig(false);
    }
  };

  // Sync users & officers from Firestore in real-time
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const list: UserProfile[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          id: doc.id,
          email: data.email || '',
          name: data.name || 'Anonymous User',
          avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${doc.id}`,
          role: data.role || 'citizen',
          department: data.department || '',
          joinedAt: data.joinedAt || new Date().toISOString(),
          stats: data.stats || { issuesReported: 0, issuesResolved: 0, verifications: 0, points: 0, badges: [] },
          claimedVouchers: data.claimedVouchers || [],
          assignedCity: data.assignedCity || '',
          assignedLocation: data.assignedLocation || undefined
        });
      });
      setUsers(list);
      setLoadingUsers(false);
    }, (err) => {
      setLoadingUsers(false);
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    return () => unsubscribe();
  }, []);

  // Sync editing fields when selecting a user
  useEffect(() => {
    if (selectedUser) {
      setUserRoleEdit(selectedUser.role);
      setUserDeptEdit(selectedUser.department || departments[0]?.name || 'Public Works Department (PWD)');
      setUserCityEdit(selectedUser.assignedCity || 'New Delhi');
      setUserLatEdit(selectedUser.assignedLocation?.latitude || 28.6139);
      setUserLngEdit(selectedUser.assignedLocation?.longitude || 77.2090);
    }
  }, [selectedUser]);

  // Sync initial SLAs from departments props
  useEffect(() => {
    if (departments && departments.length > 0) {
      departments.forEach(dept => {
        const hours = dept.sla?.resolutionTimeDays * 24 || 48;
        if (dept.id === 'pwd') setPwdSLA(hours);
        else if (dept.id === 'water') setWaterSLA(hours);
        else if (dept.id === 'electricity') setElectricSLA(hours);
        else if (dept.id === 'sanitation') setSanitationSLA(hours);
        else if (dept.id === 'traffic') setTrafficSLA(hours);
      });
    }
  }, [departments]);

  // Sync real-time sent emails log
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "sent_emails"), (snapshot) => {
      const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      logs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEmailHistory(logs);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, 'sent_emails');
    });
    return () => unsubscribe();
  }, []);

  const generateReportData = () => {
    if (selectedReportType === 'performance') {
      const depts = ['pothole', 'water', 'garbage', 'light', 'drainage'];
      const rows = depts.map(cat => {
        const catIssues = issues.filter(i => i.category === cat);
        const resolved = catIssues.filter(i => i.status === 'resolved');
        const rate = catIssues.length > 0 ? ((resolved.length / catIssues.length) * 100).toFixed(1) : "100.0";
        return {
          category: cat.toUpperCase(),
          total: catIssues.length,
          resolved: resolved.length,
          rate: `${rate}%`,
          avgTime: cat === 'water' ? "32h" : cat === 'pothole' ? "48h" : "24h"
        };
      });
      
      const csvHeader = "Category,Total Reported,Resolved,Resolution Rate %,Avg Resolution Time\n";
      const csvRows = rows.map(r => `${r.category},${r.total},${r.resolved},${r.rate},${r.avgTime}`).join("\n");
      
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #047857; margin-bottom: 4px;">Civic Guard - Municipal Performance & Resolution Audit</h2>
          <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Generated at: ${new Date().toLocaleString()}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f1f5f9; text-align: left; font-size: 12px;">
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Category</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Total Reported</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Resolved</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Resolution Rate</th>
                <th style="padding: 10px; border-bottom: 2px solid #e2e8f0;">Avg Response Time</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(r => `
                <tr style="font-size: 12px; border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-weight: bold; color: #0f172a;">${r.category}</td>
                  <td style="padding: 10px;">${r.total}</td>
                  <td style="padding: 10px; color: #047857; font-weight: bold;">${r.resolved}</td>
                  <td style="padding: 10px; color: #047857; font-weight: bold;">${r.rate}</td>
                  <td style="padding: 10px; font-family: monospace;">${r.avgTime}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
      
      return {
        filename: `ward_performance_audit_${new Date().toISOString().split('T')[0]}.csv`,
        csvContent: csvHeader + csvRows,
        subject: "Executive Report: Municipal Performance & Resolution Audit",
        htmlContent: html,
        textMsg: `Please find attached the official Municipal Performance & Resolution Audit Report generated at ${new Date().toLocaleString()}.`
      };
    } else if (selectedReportType === 'critical_log') {
      const criticals = issues.filter(i => i.severity === 'high' || i.severity === 'critical');
      const csvHeader = "Issue ID,Title,Category,Severity,Address,Status,Reporter,Reported At\n";
      const csvRows = criticals.map(i => 
        `"${i.id.substring(0,6)}","${i.title.replace(/"/g, '""')}","${i.category.toUpperCase()}","${i.severity.toUpperCase()}","${i.address.replace(/"/g, '""')}","${i.status.toUpperCase()}","${i.reporterName.replace(/"/g, '""')}","${new Date(i.timeline.reportedAt).toLocaleString()}"`
      ).join("\n");

      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #b91c1c; margin-bottom: 4px;">Civic Guard - Emergency Critical Incident Dispatch Ledger</h2>
          <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Urgent priority list. Generated at: ${new Date().toLocaleString()}</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #fef2f2; text-align: left; font-size: 12px; color: #991b1b;">
                <th style="padding: 10px; border-bottom: 2px solid #fee2e2;">ID</th>
                <th style="padding: 10px; border-bottom: 2px solid #fee2e2;">Incident Title</th>
                <th style="padding: 10px; border-bottom: 2px solid #fee2e2;">Category</th>
                <th style="padding: 10px; border-bottom: 2px solid #fee2e2;">Severity</th>
                <th style="padding: 10px; border-bottom: 2px solid #fee2e2;">Status</th>
                <th style="padding: 10px; border-bottom: 2px solid #fee2e2;">Reported At</th>
              </tr>
            </thead>
            <tbody>
              ${criticals.map(c => `
                <tr style="font-size: 11px; border-bottom: 1px solid #f1f5f9;">
                  <td style="padding: 10px; font-family: monospace; font-weight: bold; color: #b91c1c;">#${c.id.substring(0,6)}</td>
                  <td style="padding: 10px; font-weight: bold; color: #0f172a;">${c.title}</td>
                  <td style="padding: 10px; text-transform: uppercase;">${c.category}</td>
                  <td style="padding: 10px; font-weight: bold; color: #b91c1c; text-transform: uppercase;">${c.severity}</td>
                  <td style="padding: 10px; font-weight: bold; color: ${c.status === 'resolved' ? '#047857' : '#d97706'}">${c.status.toUpperCase()}</td>
                  <td style="padding: 10px;">${new Date(c.timeline.reportedAt).toLocaleDateString()}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;

      return {
        filename: `emergency_critical_ledger_${new Date().toISOString().split('T')[0]}.csv`,
        csvContent: csvHeader + csvRows,
        subject: "🚨 EMERGENCY ACTION LEDGER: Critical Roadway Hazards Active",
        htmlContent: html,
        textMsg: `Emergency alert: There are active high-priority critical roadway hazards requiring mobilization. Please find the attached CSV dispatch ledger.`
      };
    } else {
      const csvHeader = "User Name,Role,XP Level,Influence Score\n";
      const csvRows = `Sai Kumar,citizen,1420 XP,Gold Tier Advisor\nDivya Rao,citizen,980 XP,Silver Tier Contributor\nOfficer Suresh,officer,3500 XP,Supervising Commissioner\nAditya G,admin,5000 XP,Chief Auditor`;
      
      const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #1e293b;">
          <h2 style="color: #4f46e5; margin-bottom: 4px;">Civic Guard - Community Engagement & XP Leaderboard</h2>
          <p style="font-size: 12px; color: #64748b; margin-top: 0; margin-bottom: 20px;">Citizen leaderboard and engagement scores. Generated at: ${new Date().toLocaleString()}</p>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #faf5ff; text-align: left; font-size: 12px;">
                <th style="padding: 10px; border-bottom: 2px solid #ddd6fe;">User Name</th>
                <th style="padding: 10px; border-bottom: 2px solid #ddd6fe;">System Role</th>
                <th style="padding: 10px; border-bottom: 2px solid #ddd6fe;">XP Rating</th>
                <th style="padding: 10px; border-bottom: 2px solid #ddd6fe;">Civic Tier Badge</th>
              </tr>
            </thead>
            <tbody>
              <tr style="font-size: 12px; border-bottom: 1px solid #f3e8ff;">
                <td style="padding: 10px; font-weight: bold; color: #0f172a;">Sai Kumar</td>
                <td style="padding: 10px;">Citizen Reporter</td>
                <td style="padding: 10px; font-weight: bold; color: #7c3aed;">1420 XP</td>
                <td style="padding: 10px; font-weight: bold; color: #d97706;">🥇 Gold Tier Advisor</td>
              </tr>
              <tr style="font-size: 12px; border-bottom: 1px solid #f3e8ff;">
                <td style="padding: 10px; font-weight: bold; color: #0f172a;">Divya Rao</td>
                <td style="padding: 10px;">Citizen Reporter</td>
                <td style="padding: 10px; font-weight: bold; color: #7c3aed;">980 XP</td>
                <td style="padding: 10px; font-weight: bold; color: #4b5563;">🥈 Silver Tier Contributor</td>
              </tr>
            </tbody>
          </table>
        </div>
      `;

      return {
        filename: `citizen_xp_leaderboard_${new Date().toISOString().split('T')[0]}.csv`,
        csvContent: csvHeader + csvRows,
        subject: "Executive Ledger: Community Engagement & XP Leaderboards",
        htmlContent: html,
        textMsg: `Please find attached the official Community Engagement Audit and XP Leaderboard records generated at ${new Date().toLocaleString()}.`
      };
    }
  };

  const handleDownloadCSV = () => {
    const report = generateReportData();
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
    const report = generateReportData();
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
          role: 'admin',
          senderName: 'Admin Chief Auditor',
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

  const handleCreateAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAlertTitle.trim() || !newAlertMsg.trim()) return;

    setSubmittingAlert(true);
    try {
      await addDoc(collection(db, 'system_alerts'), {
        title: newAlertTitle,
        message: newAlertMsg,
        type: newAlertType,
        createdAt: new Date().toISOString(),
        active: true
      });
      setNewAlertTitle('');
      setNewAlertMsg('');
    } catch (err) {
      console.error("Failed to post system alert:", err);
    } finally {
      setSubmittingAlert(false);
    }
  };

  const handleToggleAlert = async (alertId: string, currentStatus: boolean) => {
    try {
      const alertRef = doc(db, 'system_alerts', alertId);
      await updateDoc(alertRef, { active: !currentStatus });
    } catch (err) {
      console.error("Failed to toggle alert status:", err);
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    try {
      await deleteDoc(doc(db, 'system_alerts', alertId));
    } catch (err) {
      console.error("Failed to delete alert:", err);
    }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!window.confirm("CRITICAL: Are you sure you want to purge this issue from the public ledger? This is an irreversible audit deletion.")) return;
    try {
      await deleteDoc(doc(db, 'issues', issueId));
      if (selectedLedgerIssue?.id === issueId) {
        setSelectedLedgerIssue(null);
      }
    } catch (err) {
      console.error("Failed to purge issue from ledger:", err);
    }
  };

  const handleUpdateSLAs = async () => {
    setSavingSLAs(true);
    try {
      // Update department documents in Firestore
      const updateMapping = [
        { id: 'pwd', name: "Public Works Department (PWD)", days: Math.ceil(pwdSLA / 24) },
        { id: 'water', name: "Water Supply & Sewerage Board", days: Math.ceil(waterSLA / 24) },
        { id: 'electricity', name: "Electricity & Power Distribution", days: Math.ceil(electricSLA / 24) },
        { id: 'sanitation', name: "Solid Waste Management & Sanitation", days: Math.ceil(sanitationSLA / 24) },
        { id: 'traffic', name: "Traffic Management & Signage Department", days: Math.ceil(trafficSLA / 24) },
      ];

      for (const mapping of updateMapping) {
        const deptRef = doc(db, 'departments', mapping.id);
        await updateDoc(deptRef, {
          "sla.resolutionTimeDays": mapping.days
        });
      }
      alert("System SLAs successfully saved and pushed to all active municipal queues!");
    } catch (err) {
      console.error("Failed to save SLAs:", err);
      alert("Error saving custom SLAs to Firestore database.");
    } finally {
      setSavingSLAs(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    setSavingUser(true);
    try {
      const userRef = doc(db, 'users', selectedUser.id);
      const updateData: any = {
        role: userRoleEdit,
        department: userRoleEdit === 'officer' ? userDeptEdit : '',
        assignedCity: userRoleEdit === 'officer' ? userCityEdit : '',
        assignedLocation: userRoleEdit === 'officer' ? {
          latitude: Number(userLatEdit),
          longitude: Number(userLngEdit)
        } : null
      };

      await updateDoc(userRef, updateData);
      
      // Update local state for immediate high-fidelity UI feedback
      setSelectedUser(prev => prev ? { ...prev, ...updateData } : null);
      alert(`User profile for ${selectedUser.name} successfully updated & synchronized!`);
    } catch (err) {
      console.error("Failed to update user profile:", err);
      alert("Error saving user configurations to Firestore.");
    } finally {
      setSavingUser(false);
    }
  };

  const handleAddOfficer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOfficerName.trim() || !newOfficerEmail.trim()) {
      alert("Please fill out both Name and Email fields.");
      return;
    }
    setAddingOfficer(true);
    try {
      const cleanEmail = newOfficerEmail.trim().toLowerCase();
      const officerId = `demo-officer-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;

      const officerProfile: UserProfile = {
        id: officerId,
        name: newOfficerName.trim(),
        email: cleanEmail,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=officer_${newOfficerName.trim().replace(/\s+/g, '')}`,
        role: 'officer',
        joinedAt: new Date().toISOString(),
        department: newOfficerDept || (departments[0]?.name || 'PWD / Street Lights'),
        assignedCity: newOfficerCity,
        assignedLocation: {
          latitude: Number(newOfficerLat),
          longitude: Number(newOfficerLng)
        },
        stats: {
          points: 0,
          badges: [],
          issuesReported: 0,
          issuesResolved: 0,
          verifications: 0
        }
      };

      const userRef = doc(db, 'users', officerId);
      await setDoc(userRef, officerProfile);

      alert(`Officer "${newOfficerName}" has been successfully added to the central registry. They can sign in on the Demo Guest Portal using email: ${cleanEmail}`);
      
      // Reset form states
      setNewOfficerName('');
      setNewOfficerEmail('');
      setNewOfficerDept('');
      setNewOfficerCity('New Delhi');
      setNewOfficerLat(28.6139);
      setNewOfficerLng(77.2090);
      setShowAddOfficerForm(false);
    } catch (err) {
      console.error("Failed to add officer:", err);
      alert("Error registering new officer in database.");
    } finally {
      setAddingOfficer(false);
    }
  };

  const handleAssignOfficerToIssue = async (issueId: string, officer: UserProfile) => {
    try {
      const issueRef = doc(db, 'issues', issueId);
      
      const newUpdate = {
        timestamp: new Date().toISOString(),
        status: 'assigned' as const,
        message: `Admin assigned officer ${officer.name} (${officer.department || 'Municipal Crew'}) to this issue in ${officer.assignedCity || 'operating area'}.`,
        byRole: 'system' as const
      };

      const originalIssue = issues.find(i => i.id === issueId);
      const updatedUpdates = [newUpdate, ...(originalIssue?.updates || [])];

      await updateDoc(issueRef, {
        assignedOfficer: officer.name,
        assignedDepartment: officer.department || 'Public Works Department (PWD)',
        status: 'assigned',
        'timeline.assignedAt': new Date().toISOString(),
        updates: updatedUpdates
      });

      alert(`Successfully assigned officer ${officer.name} to the active hazard ledger entry!`);
      setSelectedAssignIssue(null);
    } catch (err) {
      console.error("Failed to assign officer to issue:", err);
      alert("Error assigning officer to issue in Firestore.");
    }
  };

  // Filter issues for ledger search
  const filteredLedger = issues.filter(issue => 
    issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.reporterName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    issue.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* SECTION HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="bg-slate-900 text-slate-100 p-2 rounded-2xl border border-slate-800">
              <ShieldAlert className="w-5 h-5 text-rose-500" />
            </div>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center space-x-2">
              <span>{t('admin_ledger_control_room', 'Admin ledger control room')}</span>
              <span className="bg-rose-50 text-rose-700 text-[9px] font-black uppercase px-2 py-0.5 rounded-full border border-rose-150 font-mono">
                SECURE CONSOLE
              </span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {t('system_wide_operational_desc', 'System-wide operational control, broadcast alerts management, real-time ledger audits, and P1 escalation configurations.')}
          </p>
        </div>

        {/* STATS OVERVIEW */}
        <div className="flex space-x-4 mt-4 md:mt-0 font-mono">
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[8px] text-slate-400 font-bold block uppercase">TOTAL LEDGER ROWS</span>
            <span className="text-sm font-black text-slate-800">{issues.length} records</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[8px] text-slate-400 font-bold block uppercase">BROADCASTS ACTIVE</span>
            <span className="text-sm font-black text-rose-700">{alerts.filter(a => a.active).length} online</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[8px] text-slate-400 font-bold block uppercase">TOTAL OFFICERS</span>
            <span className="text-sm font-black text-indigo-700">{users.filter(u => u.role === 'officer').length} active</span>
          </div>
        </div>
      </div>

      {/* HORIZONTAL MINI-TABS */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200/60 pb-1">
        {[
          { id: 'alerts', label: t('broadcast_announcements', 'Broadcast Announcements'), icon: Megaphone },
          { id: 'ledger', label: t('registered_issues', 'Reported Civic Problems'), icon: Database },
          { id: 'officers', label: t('manage_officers_locations', 'Manage Officers & Locations'), icon: Users },
          { id: 'slas', label: t('response_targets_slas', 'Response Targets & SLAs'), icon: Clock },
          { id: 'reports', label: t('reports_mailer', 'Reports & Mailer'), icon: Mail },
          { id: 'system_settings', label: t('community_settings', 'Community Settings'), icon: Settings }
        ].map(tab => {
          const TabIcon = tab.icon;
          const isSelected = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                isSelected 
                  ? 'bg-slate-900 border-slate-900 text-white shadow-xs' 
                  : 'bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* VIEW: ALERTS BROADCASTING */}
      {activeTab === 'alerts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* New Broadcast Form */}
          <div className="lg:col-span-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-5 h-fit">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                <Bell className="w-4 h-4 text-slate-700" />
                <span>{t('create_global_broadcast', 'Create Global Broadcast')}</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('send_warning_broadcast_desc', 'Send a warning banner or important advisory that will marquee for all city citizens.')}</p>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">{t('announcement_title', 'ANNOUNCEMENT TITLE')}</label>
                <input
                  type="text"
                  required
                  placeholder={t('announcement_placeholder', 'e.g. Monsoon Rain Torrent Advisory')}
                  value={newAlertTitle}
                  onChange={(e) => setNewAlertTitle(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:ring-1 focus:ring-rose-500 transition-all outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">{t('detailed_advisory_message', 'DETAILED ADVISORY MESSAGE')}</label>
                <textarea
                  required
                  rows={3}
                  placeholder={t('advisory_msg_placeholder', 'e.g. High waterlogging risk predicted in low-lying wards of Secunderabad. Officers are placed on standby alert status.')}
                  value={newAlertMsg}
                  onChange={(e) => setNewAlertMsg(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 focus:bg-white focus:ring-1 focus:ring-rose-500 transition-all outline-none resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono">{t('severity_flag_level', 'SEVERITY FLAG LEVEL')}</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['info', 'warning', 'critical'] as const).map(type => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewAlertType(type)}
                      className={`py-2 px-1 rounded-xl text-[10px] font-black font-mono border uppercase tracking-wider cursor-pointer transition-all ${
                        newAlertType === type
                          ? type === 'critical'
                            ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                            : type === 'warning'
                            ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                            : 'bg-blue-600 border-blue-600 text-white shadow-xs'
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100'
                      }`}
                    >
                      {t(`severity_${type}`, type)}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={submittingAlert}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl font-bold font-mono text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-rose-600/15 cursor-pointer disabled:bg-slate-200"
              >
                {submittingAlert ? (
                  <span>{t('dispatching_btn', 'DISPATCHING...')}</span>
                ) : (
                  <>
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>{t('broadcast_advisory_btn', 'BROADCAST ADVISORY')}</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Alert management list */}
          <div className="lg:col-span-8 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
            <div>
              <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
                <span>{t('live_broadcast_index', 'Live Broadcast Index')}</span>
              </h3>
              <p className="text-[10px] text-slate-500 mt-0.5">{t('historical_alerts_desc', 'Below are all historical and currently active civic alerts displayed across user interfaces.')}</p>
            </div>

            {loadingAlerts ? (
              <div className="flex flex-col items-center py-12 justify-center space-y-2">
                <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
                <span className="text-[10px] font-mono text-slate-400 font-bold uppercase animate-pulse">{t('syncing_alerts', 'Syncing Alerts Ledger...')}</span>
              </div>
            ) : alerts.length > 0 ? (
              <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                {alerts.map((al) => {
                  let badgeColor = "bg-blue-50 border-blue-200 text-blue-750";
                  if (al.type === "warning") badgeColor = "bg-amber-50 border-amber-200 text-amber-850";
                  if (al.type === "critical") badgeColor = "bg-rose-50 border-rose-200 text-rose-850";

                  return (
                    <div key={al.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between space-x-3 hover:bg-slate-100/50 transition-colors">
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={`text-[8px] font-black border px-1.5 py-0.5 rounded font-mono uppercase tracking-wider ${badgeColor}`}>
                            {t(`severity_${al.type}`, al.type)}
                          </span>
                          <span className={`text-[8px] border px-1.5 py-0.5 rounded font-mono font-bold ${
                            al.active 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-850' 
                              : 'bg-slate-100 border-slate-250 text-slate-400'
                          }`}>
                            {al.active ? t('transmitting_status', '● TRANSMITTING') : t('offline_status', 'OFFLINE')}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono">{new Date(al.createdAt).toLocaleString()}</span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 truncate">{al.title}</h4>
                        <p className="text-[10px] text-slate-500 leading-relaxed break-words">{al.message}</p>
                      </div>

                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          onClick={() => handleToggleAlert(al.id, al.active)}
                          className={`p-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            al.active
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                              : 'bg-slate-100 border-slate-200 text-slate-400 hover:bg-slate-200'
                          }`}
                          title={al.active ? t('pause_broadcast', "Pause Broadcast") : t('resume_broadcast', "Resume Broadcast")}
                        >
                          {al.active ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDeleteAlert(al.id)}
                          className="bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 p-1.5 rounded-lg border border-slate-200 hover:border-rose-200 cursor-pointer transition-colors"
                          title={t('purge_announcement', "Purge Announcement")}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
                <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-[11px] text-slate-400 font-bold">{t('no_announcements_yet', 'No announcements broadcasted yet.')}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{t('no_announcements_sub', 'Use the left panel to broadcast alert advisories across the platform.')}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* VIEW: LEDGER AUDIT */}
      {activeTab === 'ledger' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main ledger list */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                  <Database className="w-4.5 h-4.5 text-slate-700" />
                  <span>Interactive Audit Feed</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">View full public-ledger entries. Inspect metadata, upvotes, or purge spam duplicates.</p>
              </div>
              
              <div className="relative max-w-xs w-full">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter ledger rows..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full text-[10px] font-mono bg-slate-50 border border-slate-200/80 rounded-xl pl-9 pr-3 py-1.5 outline-none focus:bg-white focus:ring-1 focus:ring-slate-500"
                />
              </div>
            </div>

            <div className="border border-slate-100 rounded-2xl overflow-hidden">
              <div className="max-h-[360px] overflow-y-auto">
                <table className="w-full text-[10px] font-mono text-left text-slate-500">
                  <thead className="bg-slate-50 text-[9px] text-slate-400 uppercase tracking-wider font-extrabold sticky top-0 border-b border-slate-100 z-10">
                    <tr>
                      <th className="px-4 py-3">Category</th>
                      <th className="px-4 py-3">Title & Area</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Audit Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredLedger.length > 0 ? (
                      filteredLedger.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedLedgerIssue(row)}>
                          <td className="px-4 py-3.5 font-bold text-slate-900">
                            <span className="capitalize">{row.category}</span>
                            <span className="block text-[8px] text-slate-400 font-normal">Score: {row.impactMetrics?.priorityScore || 0}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="font-bold text-slate-800 line-clamp-1">{row.title}</span>
                            <span className="block text-[8px] text-slate-400 font-normal line-clamp-1">{row.address.split(',')[0]}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`inline-block text-[8px] font-black px-1.5 py-0.5 rounded ${
                              row.status === 'resolved'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-100'
                                : row.status === 'in_progress'
                                ? 'bg-amber-50 text-amber-800 border border-amber-100'
                                : 'bg-rose-50 text-rose-800 border border-rose-100'
                            }`}>
                              {row.status.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center space-x-1.5">
                              <button
                                onClick={() => setSelectedLedgerIssue(row)}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1 rounded-lg border border-slate-200 transition-colors"
                                title="Inspect Entry"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteIssue(row.id)}
                                className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1 rounded-lg border border-rose-200 transition-colors"
                                title="Purge Record"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-slate-400">
                          No ledger records match search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Record inspector */}
          <div className="lg:col-span-5 bg-slate-950 text-slate-100 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between h-[420px]">
            {selectedLedgerIssue ? (
              <div className="space-y-4 flex-1 flex flex-col justify-between overflow-hidden">
                <div className="space-y-3 overflow-y-auto pr-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[8px] text-rose-400 font-mono font-bold uppercase tracking-widest block">ROW RECORD INSPECTOR</span>
                      <h4 className="text-sm font-black tracking-tight text-white mt-1">{selectedLedgerIssue.title}</h4>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">ROW ID: {selectedLedgerIssue.id}</p>
                    </div>
                    <button onClick={() => setSelectedLedgerIssue(null)} className="text-slate-500 hover:text-slate-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800/80 space-y-1.5 text-[9px] font-mono leading-relaxed">
                    <div><span className="text-slate-400">Reporter:</span> <span className="text-emerald-400 font-bold">{selectedLedgerIssue.reporterName}</span> ({selectedLedgerIssue.reporterId})</div>
                    <div><span className="text-slate-400">Coordinates:</span> Lat: {selectedLedgerIssue.location?.latitude?.toFixed(4)}, Lng: {selectedLedgerIssue.location?.longitude?.toFixed(4)}</div>
                    <div><span className="text-slate-400">Full Address:</span> {selectedLedgerIssue.address}</div>
                    <div><span className="text-slate-400">Assigned Dept:</span> {selectedLedgerIssue.assignedDepartment}</div>
                    <div><span className="text-slate-400">Assigned Officer:</span> {selectedLedgerIssue.assignedOfficer || "None Assigned"}</div>
                    <div><span className="text-slate-400">Community Votes:</span> Up: {selectedLedgerIssue.verificationStatus?.upvotes}, Down: {selectedLedgerIssue.verificationStatus?.downvotes}</div>
                    <div><span className="text-slate-400">AI Verified:</span> {selectedLedgerIssue.verificationStatus?.aiVerification ? "Yes (Google Gemini Vision)" : "Manual Review"}</div>
                    <div><span className="text-slate-400">Reported At:</span> {new Date(selectedLedgerIssue.timeline.reportedAt).toLocaleString()}</div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8px] text-slate-500 font-bold block uppercase tracking-wider">RAW RECORD SCHEMATIC (JSON)</span>
                    <pre className="bg-slate-900/60 p-3 rounded-2xl text-[8px] font-mono overflow-auto max-h-36 border border-slate-800 text-slate-300 text-left">
                      {JSON.stringify(selectedLedgerIssue, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between shrink-0">
                  <span className="text-[9px] font-bold text-slate-500">Purging is absolute.</span>
                  <button
                    onClick={() => handleDeleteIssue(selectedLedgerIssue.id)}
                    className="bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 py-1.5 px-3.5 rounded-xl font-bold font-mono text-[9px] flex items-center space-x-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>PURGE RECORD ROW</span>
                  </button>
                </div>
              </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                  <Database className="w-10 h-10 text-slate-700 mb-3" />
                  <p className="text-xs font-bold font-mono text-slate-400">No Row Selected</p>
                  <p className="text-[10px] text-slate-500 max-w-xs mt-1">Select any record from the left audit feed table to inspect metadata or run ledger removals.</p>
                </div>
              )}
          </div>
        </div>
      )}

      {/* VIEW: SLAs AND PARAMETERS */}
      {activeTab === 'slas' && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
          <div>
            <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
              <Clock className="w-4.5 h-4.5 text-indigo-600" />
              <span>Municipal SLA Configuration</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Adjust custom SLA response limit hours for specific municipal departments. Active timers and breach alerts will scale to these values instantly.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl">
            {/* PWD */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-800 uppercase font-mono">Public Works (PWD)</span>
                <span className="text-[10px] bg-slate-200/60 font-mono font-bold px-2 py-0.5 rounded">{pwdSLA} Hours</span>
              </div>
              <input
                type="range"
                min={12}
                max={120}
                step={12}
                value={pwdSLA}
                onChange={(e) => setPwdSLA(Number(e.target.value))}
                className="w-full accent-slate-800 h-1 rounded-full cursor-pointer"
              />
              <p className="text-[9px] text-slate-400 font-mono">Governs: Road potholes, sidewalks, and civil structures.</p>
            </div>

            {/* WATER */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-800 uppercase font-mono">Water & Sewerage</span>
                <span className="text-[10px] bg-slate-200/60 font-mono font-bold px-2 py-0.5 rounded">{waterSLA} Hours</span>
              </div>
              <input
                type="range"
                min={12}
                max={120}
                step={12}
                value={waterSLA}
                onChange={(e) => setWaterSLA(Number(e.target.value))}
                className="w-full accent-slate-800 h-1 rounded-full cursor-pointer"
              />
              <p className="text-[9px] text-slate-400 font-mono">Governs: Main pipeline bursts and local stormwater drains.</p>
            </div>

            {/* ELECTRIC */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-800 uppercase font-mono">Electricity & Power</span>
                <span className="text-[10px] bg-slate-200/60 font-mono font-bold px-2 py-0.5 rounded">{electricSLA} Hours</span>
              </div>
              <input
                type="range"
                min={12}
                max={120}
                step={12}
                value={electricSLA}
                onChange={(e) => setElectricSLA(Number(e.target.value))}
                className="w-full accent-slate-800 h-1 rounded-full cursor-pointer"
              />
              <p className="text-[9px] text-slate-400 font-mono">Governs: Outage zones and live electrical hazard wires.</p>
            </div>

            {/* SANITATION */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-800 uppercase font-mono">Sanitation & Garbage</span>
                <span className="text-[10px] bg-slate-200/60 font-mono font-bold px-2 py-0.5 rounded">{sanitationSLA} Hours</span>
              </div>
              <input
                type="range"
                min={12}
                max={120}
                step={12}
                value={sanitationSLA}
                onChange={(e) => setSanitationSLA(Number(e.target.value))}
                className="w-full accent-slate-800 h-1 rounded-full cursor-pointer"
              />
              <p className="text-[9px] text-slate-400 font-mono">Governs: Overflowing garbage dumpsters and municipal sweeps.</p>
            </div>

            {/* TRAFFIC */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-800 uppercase font-mono">Traffic Signage</span>
                <span className="text-[10px] bg-slate-200/60 font-mono font-bold px-2 py-0.5 rounded">{trafficSLA} Hours</span>
              </div>
              <input
                type="range"
                min={12}
                max={120}
                step={12}
                value={trafficSLA}
                onChange={(e) => setTrafficSLA(Number(e.target.value))}
                className="w-full accent-slate-800 h-1 rounded-full cursor-pointer"
              />
              <p className="text-[9px] text-slate-400 font-mono">Governs: Broken signals, missing caution signs, and obstructions.</p>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 max-w-md">Values are automatically parsed to standard resolution SLA limits in the Officer Queues and Live Heatmaps.</span>
            <button
              onClick={handleUpdateSLAs}
              disabled={savingSLAs}
              className="bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-black px-5 py-2.5 rounded-xl border border-slate-950 cursor-pointer shadow-md flex items-center space-x-1.5"
            >
              {savingSLAs ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>SAVING LIMITS...</span>
                </>
              ) : (
                <span>SAVE & COMMIT SLAS</span>
              )}
            </button>
          </div>
        </div>
      )}

      {/* VIEW: OFFICERS AND USER MANAGEMENT */}
      {activeTab === 'officers' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* USER FEED & SEARCH */}
          <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4 flex flex-col h-[650px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                    <Users className="w-4.5 h-4.5 text-indigo-600" />
                    <span>Officer & Crew Directory</span>
                  </h3>
                  <button
                    onClick={() => setShowAddOfficerForm(!showAddOfficerForm)}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[9px] font-black px-2.5 py-1 rounded-lg border border-indigo-700 cursor-pointer flex items-center space-x-1 whitespace-nowrap"
                  >
                    <Plus className="w-3 h-3" />
                    <span>{showAddOfficerForm ? 'CANCEL' : 'ADD OFFICER'}</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">Manage user authorization roles, departments, and localized regional coordinates across India.</p>
              </div>

              {/* FILTER BADGES */}
              <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-[10px] self-start sm:self-auto shrink-0">
                {(['all', 'officer', 'admin', 'citizen'] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setOfficerFilter(f)}
                    className={`px-2 py-1 rounded-md font-bold uppercase tracking-wide cursor-pointer transition-all ${
                      officerFilter === f ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {f}s
                  </button>
                ))}
              </div>
            </div>

            {/* COLLAPSIBLE ADD OFFICER FORM */}
            <AnimatePresence>
              {showAddOfficerForm && (
                <motion.form
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleAddOfficer}
                  className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100/80 space-y-3.5 text-left shrink-0 overflow-hidden"
                >
                  <div className="flex items-center justify-between border-b border-indigo-100/50 pb-1.5">
                    <span className="text-[10px] font-black text-indigo-905 font-mono uppercase tracking-wider">
                      ➕ Register New Municipal Officer
                    </span>
                    <button 
                      type="button" 
                      onClick={() => setShowAddOfficerForm(false)}
                      className="text-indigo-400 hover:text-indigo-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[8.5px] font-extrabold text-slate-400 font-mono uppercase block mb-1">Full Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Officer Anand"
                        value={newOfficerName}
                        onChange={(e) => setNewOfficerName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2 focus:outline-none focus:ring-1 focus:ring-slate-800 font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[8.5px] font-extrabold text-slate-400 font-mono uppercase block mb-1">Official Email Address</label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. anand@municipal.gov.in"
                        value={newOfficerEmail}
                        onChange={(e) => setNewOfficerEmail(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2 focus:outline-none focus:ring-1 focus:ring-slate-800 font-bold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="text-[8.5px] font-extrabold text-slate-400 font-mono uppercase block mb-1">Bureau / Department</label>
                      <select
                        value={newOfficerDept}
                        onChange={(e) => setNewOfficerDept(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2 focus:outline-none focus:ring-1 focus:ring-slate-800 font-bold"
                      >
                        <option value="">-- Select Bureau --</option>
                        {departments.map(dept => (
                          <option key={dept.id} value={dept.name}>{dept.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8.5px] font-extrabold text-slate-400 font-mono uppercase block mb-1">Operating City Hub</label>
                      <select
                        value={newOfficerCity}
                        onChange={(e) => {
                          const val = e.target.value;
                          setNewOfficerCity(val);
                          const preset = INDIAN_HUBS_PRESETS.find(p => p.name === val);
                          if (preset) {
                            setNewOfficerLat(preset.lat);
                            setNewOfficerLng(preset.lng);
                          }
                        }}
                        className="w-full bg-white border border-slate-200 rounded-xl text-xs p-2 focus:outline-none focus:ring-1 focus:ring-slate-800 font-bold"
                      >
                        {INDIAN_HUBS_PRESETS.map(preset => (
                          <option key={preset.name} value={preset.name}>{preset.name} ({preset.state})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] font-extrabold text-slate-400 font-mono uppercase block mb-0.5">Latitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={newOfficerLat}
                        onChange={(e) => setNewOfficerLat(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono font-bold"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-extrabold text-slate-400 font-mono uppercase block mb-0.5">Longitude</label>
                      <input
                        type="number"
                        step="0.000001"
                        value={newOfficerLng}
                        onChange={(e) => setNewOfficerLng(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl text-xs p-1.5 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono font-bold"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={addingOfficer}
                    className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-mono text-[9px] font-black py-2 rounded-xl border border-indigo-700 shadow-xs cursor-pointer flex items-center justify-center space-x-1"
                  >
                    {addingOfficer ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        <span>REGISTERING OFFICER IN DATABASE...</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" />
                        <span>SUBMIT REGISTRATION</span>
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* SEARCH */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search by name, email, department, or operating city..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-800 text-slate-700"
              />
            </div>

            {/* USER LIST */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingUsers ? (
                <div className="text-center py-10 font-mono text-xs text-slate-400">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
                  Syncing Secure Registry...
                </div>
              ) : users.filter(u => {
                const matchesRole = officerFilter === 'all' || u.role === officerFilter;
                const matchesSearch = searchTerm === '' || 
                  u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (u.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                  (u.assignedCity || '').toLowerCase().includes(searchTerm.toLowerCase());
                return matchesRole && matchesSearch;
              }).length === 0 ? (
                <div className="text-center py-12 text-slate-400 font-mono text-xs">
                  No registered accounts match query filter
                </div>
              ) : (
                users
                  .filter(u => {
                    const matchesRole = officerFilter === 'all' || u.role === officerFilter;
                    const matchesSearch = searchTerm === '' || 
                      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (u.department || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                      (u.assignedCity || '').toLowerCase().includes(searchTerm.toLowerCase());
                    return matchesRole && matchesSearch;
                  })
                  .map(user => {
                    const isSelected = selectedUser?.id === user.id;
                    return (
                      <div
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                          isSelected 
                            ? 'bg-slate-900 border-slate-950 text-white shadow-md animate-none' 
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200/80 text-slate-700'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <img
                            src={user.avatar}
                            alt={user.name}
                            referrerPolicy="no-referrer"
                            className="w-9 h-9 rounded-full bg-white border border-slate-200"
                          />
                          <div>
                            <h4 className="text-xs font-extrabold flex items-center space-x-1.5">
                              <span>{user.name}</span>
                              <span className={`text-[8px] font-black tracking-widest font-mono uppercase px-1.5 py-0.5 rounded ${
                                user.role === 'admin' 
                                  ? 'bg-rose-500 text-white' 
                                  : user.role === 'officer' 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'bg-slate-200 text-slate-700'
                              }`}>
                                {user.role}
                              </span>
                            </h4>
                            <p className={`text-[10px] ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</p>
                            {user.role === 'officer' && (
                              <div className="flex items-center gap-2 mt-1">
                                {user.department && (
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border ${
                                    isSelected 
                                      ? 'bg-slate-800 text-indigo-300 border-slate-700' 
                                      : 'bg-indigo-50 text-indigo-700 border-indigo-100'
                                  }`}>
                                    {user.department}
                                  </span>
                                )}
                                {user.assignedCity && (
                                  <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 ${
                                    isSelected 
                                      ? 'bg-slate-800 text-emerald-300 border-slate-700' 
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                  }`}>
                                    <MapPin className="w-2 h-2" />
                                    {user.assignedCity}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-right font-mono">
                          {user.role === 'citizen' ? (
                            <div className={`text-[10px] font-extrabold ${isSelected ? 'text-slate-300' : 'text-slate-800'}`}>
                              {user.stats?.points || 0} XP
                            </div>
                          ) : (
                            <div className="text-[8.5px] font-bold text-indigo-400">
                              No XP System
                            </div>
                          )}
                          <div className="text-[8px] text-slate-400 mt-0.5">
                            {user.stats?.issuesResolved || 0} Resolved
                          </div>
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>

          {/* USER PROFILE EDITOR & LOCALIZED ISSUE DISPATCH */}
          <div className="lg:col-span-5 flex flex-col h-[650px] gap-6">
            {selectedUser ? (
              <div className="flex flex-col h-full gap-6 overflow-y-auto">
                {/* ROLE EDITOR CARD */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4 shrink-0">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                      <UserCheck className="w-4.5 h-4.5 text-indigo-600" />
                      <span>Role & Service Deployment</span>
                    </h3>
                    <button
                      onClick={() => setSelectedUser(null)}
                      className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    {/* User Summary info */}
                    <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                      <img src={selectedUser.avatar} className="w-10 h-10 rounded-full" alt="avatar" referrerPolicy="no-referrer" />
                      <div>
                        <h4 className="text-xs font-black text-slate-800">{selectedUser.name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono">UID: {selectedUser.id}</p>
                      </div>
                    </div>

                    {/* Change Role Selection */}
                    <div>
                      <label className="text-[9px] font-extrabold text-slate-400 font-mono uppercase block mb-1">Authorization Privilege</label>
                      <select
                        value={userRoleEdit}
                        onChange={(e) => setUserRoleEdit(e.target.value as UserRole)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800"
                      >
                        <option value="citizen">Citizen (Standard Account)</option>
                        <option value="officer">Officer (Municipal Field Crew / Inspector)</option>
                        <option value="admin">Admin (System Operations Control)</option>
                      </select>
                    </div>

                    {/* OFFICER SPECIFIC CONTROLS */}
                    <AnimatePresence>
                      {userRoleEdit === 'officer' && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="space-y-4 overflow-hidden"
                        >
                          {/* Department */}
                          <div>
                            <label className="text-[9px] font-extrabold text-slate-400 font-mono uppercase block mb-1">Responsible Bureau</label>
                            <select
                              value={userDeptEdit}
                              onChange={(e) => setUserDeptEdit(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800"
                            >
                              {departments.map(dept => (
                                <option key={dept.id} value={dept.name}>{dept.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* City Hub Preset */}
                          <div>
                            <label className="text-[9px] font-extrabold text-slate-400 font-mono uppercase block mb-1">Assigned Operating City Hub</label>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <select
                                  value={INDIAN_HUBS_PRESETS.some(p => p.name === userCityEdit) ? userCityEdit : 'custom'}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val !== 'custom') {
                                      const preset = INDIAN_HUBS_PRESETS.find(p => p.name === val);
                                      if (preset) {
                                        setUserCityEdit(preset.name);
                                        setUserLatEdit(preset.lat);
                                        setUserLngEdit(preset.lng);
                                      }
                                    } else {
                                      setUserCityEdit('');
                                    }
                                  }}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800"
                                >
                                  <option value="">-- Choose Preset --</option>
                                  {INDIAN_HUBS_PRESETS.map(preset => (
                                    <option key={preset.name} value={preset.name}>{preset.name} ({preset.state})</option>
                                  ))}
                                  <option value="custom">Custom City Name...</option>
                                </select>
                              </div>
                              <div>
                                <input
                                  type="text"
                                  placeholder="City Name"
                                  value={userCityEdit}
                                  onChange={(e) => setUserCityEdit(e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Coordinates */}
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-400 font-mono uppercase block mb-0.5">Latitude (WGS84)</label>
                              <input
                                type="number"
                                step="0.000001"
                                value={userLatEdit}
                                onChange={(e) => setUserLatEdit(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-extrabold text-slate-400 font-mono uppercase block mb-0.5">Longitude (WGS84)</label>
                              <input
                                type="number"
                                step="0.000001"
                                value={userLngEdit}
                                onChange={(e) => setUserLngEdit(Number(e.target.value))}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs p-2.5 font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-800 font-mono"
                              />
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Commit button */}
                    <button
                      onClick={handleUpdateUser}
                      disabled={savingUser}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-white font-mono text-[10px] font-black py-2.5 rounded-xl border border-slate-950 transition-colors shadow-xs cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      {savingUser ? (
                        <>
                          <RefreshCw className="w-3 animate-spin" />
                          <span>SYNCHRONIZING PROFILE RECORD...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>COMMIT & SAVE PRIVILEGES</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* DISPATCH CONTROL CENTER CARD */}
                {selectedUser.role === 'officer' && (
                  <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md flex-1 flex flex-col min-h-0">
                    <div className="border-b border-slate-100 pb-3 shrink-0">
                      <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                        <Navigation className="w-4.5 h-4.5 text-emerald-600 animate-pulse" />
                        <span>Active India Dispatch Centre</span>
                      </h3>
                      <p className="text-[10px] text-slate-500 mt-0.5">Directly assign this officer to open hazards reported in {selectedUser.assignedCity || 'their operating zone'}.</p>
                    </div>

                    {/* Open issues in the officer's city */}
                    <div className="flex-1 overflow-y-auto space-y-2 mt-3 pr-1">
                      {issues.filter(i => 
                        (!i.assignedOfficer) && 
                        i.status !== 'resolved' && 
                        i.status !== 'rejected' &&
                        (i.address.toLowerCase().includes((selectedUser.assignedCity || '').toLowerCase()) || 
                         (i.location && selectedUser.assignedLocation && 
                          Math.abs(i.location.latitude - (selectedUser.assignedLocation.latitude || 0)) < 1.0 && 
                          Math.abs(i.location.longitude - (selectedUser.assignedLocation.longitude || 0)) < 1.0))
                      ).length === 0 ? (
                        <div className="text-center py-10 text-slate-400 font-mono text-[10px] flex flex-col justify-center items-center h-full space-y-2">
                          <Compass className="w-7 h-7 text-slate-300" />
                          <span>No unassigned active hazards found in {selectedUser.assignedCity || 'this operating zone'}</span>
                        </div>
                      ) : (
                        issues
                          .filter(i => 
                            (!i.assignedOfficer) && 
                            i.status !== 'resolved' && 
                            i.status !== 'rejected' &&
                            (i.address.toLowerCase().includes((selectedUser.assignedCity || '').toLowerCase()) || 
                             (i.location && selectedUser.assignedLocation && 
                              Math.abs(i.location.latitude - (selectedUser.assignedLocation.latitude || 0)) < 1.0 && 
                              Math.abs(i.location.longitude - (selectedUser.assignedLocation.longitude || 0)) < 1.0))
                          )
                          .map(issue => {
                            // Calculate approximate distance
                            let distStr = "";
                            if (issue.location && selectedUser.assignedLocation) {
                              const lat1 = issue.location.latitude;
                              const lng1 = issue.location.longitude;
                              const lat2 = selectedUser.assignedLocation.latitude;
                              const lng2 = selectedUser.assignedLocation.longitude;
                              // Euclidean distance as rough approximation for display
                              const d = Math.sqrt(Math.pow(lat1 - lat2, 2) + Math.pow(lng1 - lng2, 2)) * 111; // 1 degree = approx 111 km
                              distStr = `${d.toFixed(1)} km away`;
                            }

                            return (
                              <div key={issue.id} className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 flex items-start justify-between gap-3 text-left">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-extrabold uppercase font-mono px-1.5 py-0.5 rounded border bg-white text-slate-600 border-slate-200">
                                      {issue.category}
                                    </span>
                                    {distStr && (
                                      <span className="text-[9px] font-bold text-slate-500 font-mono flex items-center gap-0.5">
                                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                        {distStr}
                                      </span>
                                    )}
                                  </div>
                                  <h4 className="text-[11px] font-black text-slate-800 line-clamp-1">{issue.title}</h4>
                                  <p className="text-[9px] text-slate-400 line-clamp-1">{issue.address}</p>
                                </div>

                                <button
                                  onClick={() => handleAssignOfficerToIssue(issue.id, selectedUser)}
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[9px] font-black px-2.5 py-1.5 rounded-lg border border-emerald-700 cursor-pointer shadow-xs whitespace-nowrap"
                                >
                                  DISPATCH
                                </button>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md flex-1 flex flex-col items-center justify-center text-center text-slate-500">
                <Users className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-xs font-bold font-mono text-slate-400">No Account Selected</p>
                <p className="text-[10px] text-slate-500 max-w-xs mt-1">Select any registered citizen, officer, or admin from the left directory to upgrade roles, configure operating jurisdictions, and dispatch municipal assignments.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'system_settings' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-6">
          {/* Left Column: Event Activations */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <Megaphone className="w-4.5 h-4.5 text-slate-700 font-bold" />
                  <span>Interactive System Events</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Launch system-wide events and protocols. These directly affect the mobile interface, reward XP rates, and AI chat bot guidance.
                </p>
              </div>

              {/* Event 1: Emergency Protocol */}
              <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-100 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="bg-rose-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded">CRITICAL</span>
                    <h4 className="text-xs font-black text-slate-900">Emergency Monsoon Protocol</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Flashes a high-priority advisory banner to all registered citizens. Adjusts GuardBot to prioritize safety guidelines and raises water supply response urgency.
                  </p>
                </div>
                <button
                  onClick={() => handleSaveConfig({ emergencyProtocolActive: !emergencyProtocolActive })}
                  className="shrink-0 cursor-pointer focus:outline-none self-center"
                  disabled={isSavingConfig}
                >
                  <div className={`w-12 h-6.5 rounded-full p-0.5 transition-all duration-300 flex items-center shadow-inner ${emergencyProtocolActive ? 'bg-rose-600' : 'bg-slate-300'}`}>
                    <div className={`bg-white w-5.5 h-5.5 rounded-full shadow-md transform transition-transform duration-300 ${emergencyProtocolActive ? 'translate-x-5.5' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>

              {/* Event 2: Double XP Campaign */}
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="bg-amber-500 text-slate-950 text-[8px] font-black uppercase px-1.5 py-0.5 rounded">CAMPAIGN</span>
                    <h4 className="text-xs font-black text-slate-900">Double XP Event</h4>
                  </div>
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Applies a 2x multiplier system-wide. Citizens earn double XP for reporting hazards (+100 XP) and completing verifications (+10 XP) to incentivize civic vigilance.
                  </p>
                </div>
                <button
                  onClick={() => handleSaveConfig({ doubleXpActive: !doubleXpActive })}
                  className="shrink-0 cursor-pointer focus:outline-none self-center"
                  disabled={isSavingConfig}
                >
                  <div className={`w-12 h-6.5 rounded-full p-0.5 transition-all duration-300 flex items-center shadow-inner ${doubleXpActive ? 'bg-amber-500' : 'bg-slate-300'}`}>
                    <div className={`bg-white w-5.5 h-5.5 rounded-full shadow-md transform transition-transform duration-300 ${doubleXpActive ? 'translate-x-5.5' : 'translate-x-0'}`} />
                  </div>
                </button>
              </div>
            </div>

            {/* Threshold Slider */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <ShieldCheck className="w-4.5 h-4.5 text-slate-700" />
                  <span>SLA Escalation Threshold</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Hazards scoring higher than this automatic priority threshold are auto-routed for high-urgency executive review.
                </p>
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex justify-between items-center text-[11px] font-mono font-bold text-slate-700">
                  <span>Priority Cut-off Score</span>
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                    {autoEscalationScore} / 100
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={autoEscalationScore}
                  onChange={(e) => handleSaveConfig({ autoEscalationScore: parseInt(e.target.value) })}
                  className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-slate-900"
                  disabled={isSavingConfig}
                />
                <div className="flex justify-between text-[8px] font-mono text-slate-400 font-bold">
                  <span>LOW URGENCY (50)</span>
                  <span>BALANCED (75)</span>
                  <span>ULTRA STRICT (100)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: AI & Admin Tools */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <RefreshCw className="w-4.5 h-4.5 text-slate-700" />
                  <span>GuardBot AI Personality Calibration</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Alter the prompt framing and personality traits for GuardBot, the central municipal intelligence assistant.
                </p>
              </div>

              <div className="space-y-3">
                {[
                  {
                    id: 'standard',
                    title: 'Standard Namaste',
                    desc: 'Polite, municipal-centered officer tone. Balanced, objective answers.',
                    badge: 'DEFAULT'
                  },
                  {
                    id: 'crisis',
                    title: 'Crisis Management Protocol',
                    desc: 'Highly protective, severe, warning-centric tone. Emphasizes street safety guidelines.',
                    badge: 'EMERGENCY'
                  },
                  {
                    id: 'empathetic',
                    title: 'Empathetic Encouragement',
                    desc: 'Enthusiastic and celebratory. Highly praises citizens for their contribution to civic ledgers.',
                    badge: 'CIVIC XP BOOST'
                  }
                ].map((persona) => {
                  const isActive = guardbotPersona === persona.id;
                  return (
                    <div
                      key={persona.id}
                      onClick={() => !isSavingConfig && handleSaveConfig({ guardbotPersona: persona.id as any })}
                      className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex justify-between items-start gap-4 ${
                        isActive
                          ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                          : 'bg-slate-50 hover:bg-slate-100/70 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className={`text-[8px] font-mono font-black px-1.5 py-0.5 rounded ${
                            isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-800'
                          }`}>
                            {persona.badge}
                          </span>
                          <h4 className="text-xs font-black">{persona.title}</h4>
                        </div>
                        <p className={`text-[10px] leading-normal ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                          {persona.desc}
                        </p>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isActive ? 'border-white' : 'border-slate-300'
                      }`}>
                        {isActive && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Danger Zone: Clean Slate Reset */}
            <div className="bg-red-50/50 p-6 rounded-3xl border border-red-100 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-black text-red-950 tracking-tight flex items-center space-x-2">
                  <Trash2 className="w-4.5 h-4.5 text-red-700" />
                  <span>Administrative Danger Zone</span>
                </h3>
                <p className="text-[10px] text-red-800/80 mt-0.5 font-medium">
                  Perform a complete database wipe and reset stats to test all features completely from scratch.
                </p>
              </div>

              <button
                onClick={async () => {
                  if (!window.confirm("CRITICAL WARNING: This will permanently delete all reported incidents, all community broadcasts, all ward logs, and reset all citizen/officer stats back to zero for a pristine test run. Do you want to proceed?")) return;
                  try {
                    setIsSavingConfig(true);
                    const res = await fetch("/api/reset-all-data", { method: "POST" });
                    const data = await res.json();
                    if (data.success) {
                      alert("🎉 Success! " + data.message);
                    } else {
                      alert("Error resetting database: " + (data.error || "Unknown error"));
                    }
                  } catch (err: any) {
                    alert("Network error: " + err.message);
                  } finally {
                    setIsSavingConfig(false);
                  }
                }}
                disabled={isSavingConfig}
                className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-mono text-[10px] font-black uppercase tracking-wider transition-colors shadow-sm focus:outline-none disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isSavingConfig ? "Executing Clean Slate Reset..." : "Wipe Database & Reset All Stats"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'reports' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left mt-6">
          {/* Left Column: Report Builder & Dispatch Controls */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <FileText className="w-4.5 h-4.5 text-indigo-600" />
                  <span>Executive Report Builder & Mail Hub</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Compile live municipal incident ledgers, compliance statistics, or community engagement metrics, and instantly dispatch them to field supervisors.
                </p>
              </div>

              {/* Select Report Type */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">1. Select Report Template</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'performance', title: 'Performance Audit', desc: 'SLA resolution rate summary per department' },
                    { id: 'critical_log', title: 'Emergency Hotlist', desc: 'All active critical and high-priority hazards' },
                    { id: 'engagement', title: 'Community Activity', desc: 'Citizen leaderboard and reward XP audit' }
                  ].map((tpl) => {
                    const isSelected = selectedReportType === tpl.id;
                    return (
                      <button
                        key={tpl.id}
                        onClick={() => setSelectedReportType(tpl.id as any)}
                        className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between h-28 ${
                          isSelected 
                            ? 'bg-slate-900 border-slate-900 text-white shadow-md' 
                            : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                        }`}
                      >
                        <span className="text-xs font-black block">{tpl.title}</span>
                        <span className={`text-[9px] leading-normal ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{tpl.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Email Destination Input */}
              <div className="space-y-2">
                <label className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block">2. Configure Recipient & Dispatch Address</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      value={reportEmailRecipient}
                      onChange={(e) => setReportEmailRecipient(e.target.value)}
                      placeholder="commissioner@municipal.gov.in"
                      className="w-full bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none transition-all font-semibold text-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleDownloadCSV}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 border border-slate-200/60 shadow-xs cursor-pointer transition-all"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Report (CSV)</span>
                </button>

                <button
                  onClick={handleSendEmail}
                  disabled={isSendingReportEmail}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs py-3 rounded-2xl font-bold flex items-center justify-center space-x-2 shadow-md cursor-pointer transition-all"
                >
                  {isSendingReportEmail ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Transmitting Email...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Email Report as Attachment</span>
                    </>
                  )}
                </button>
              </div>

              {/* Success / Error Status Banner */}
              {emailStatusMessage && (
                <div className={`p-4 rounded-2xl border text-xs font-semibold ${
                  emailStatusMessage.includes("ERROR") 
                    ? 'bg-rose-50 border-rose-200 text-rose-800' 
                    : 'bg-emerald-50 border-emerald-200 text-emerald-800'
                }`}>
                  {emailStatusMessage}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Live Transmission History Audit Logs */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-4 flex flex-col h-[460px] overflow-hidden justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight flex items-center space-x-2">
                  <Database className="w-4.5 h-4.5 text-indigo-600 animate-pulse" />
                  <span>Email Transmission History</span>
                </h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Audit log of dispatched executive reports, recipient mailboxes, and transmission success statuses logged to Cloud Firestore.
                </p>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2.5 my-2 pr-1 scrollbar-thin">
                {emailHistory.length > 0 ? (
                  emailHistory.map((log: any) => (
                    <div key={log.id} className="p-3 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/50 rounded-2xl text-[10.5px] space-y-1 transition-colors font-sans">
                      <div className="flex items-center justify-between font-mono font-bold">
                        <span className="text-indigo-600 truncate max-w-[150px]">{log.to}</span>
                        <span className="text-slate-400 text-[9px]">{new Date(log.timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="font-extrabold text-slate-800 line-clamp-1">{log.subject}</p>
                      <div className="flex items-center gap-1.5 pt-1 text-[9px] font-mono text-slate-400">
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded uppercase font-black">{log.senderRole}</span>
                        {log.hasAttachments && <span className="bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black font-sans">📎 CSV ATTACHED</span>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full text-slate-400 space-y-2 py-10">
                    <Mail className="w-8 h-8 text-slate-300" />
                    <p className="text-[10.5px] font-bold">No dispatched reports in audit logs.</p>
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200/50 text-[9.5px] leading-relaxed text-slate-500 font-sans">
                <span className="font-extrabold text-slate-700 font-mono uppercase block text-[8px] mb-0.5">NODEMAILER TRANSMISSION SYSTEM:</span>
                "When no active SMTP credentials are found in environment variables, the system auto-provisions temporary testing mail boxes with real-time delivery logging."
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
