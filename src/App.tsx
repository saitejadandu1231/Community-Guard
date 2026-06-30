import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, setDoc, updateDoc, arrayUnion, increment, addDoc, getDoc, getDocs, query, where, deleteDoc } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User, signInAnonymously } from 'firebase/auth';
import { db, auth, OperationType, handleFirestoreError } from './lib/firebase';
import Header from './components/Header';
import HeatmapView from './components/HeatmapView';
import CitizenDashboard from './components/CitizenDashboard';
import ReportIssue from './components/ReportIssue';
import AnalyticsPanel from './components/AnalyticsPanel';
import UserProfile from './components/UserProfile';
import OfficerQueue from './components/OfficerQueue';
import AdminConsole from './components/AdminConsole';
import CivicAssistant from './components/CivicAssistant';
import ResolvedShowcase from './components/ResolvedShowcase';
import PwaInstallBanner from './components/PwaInstallBanner';
import NotificationTerminal from './components/NotificationTerminal';
import { useLanguage } from './components/LanguageContext';
import { Issue, Department, IssueStatus, IssueCategory, PhotoAnalysis, UserProfile as UserProfileType } from './types';
import { Shield, Sparkles, Award, MapPin, Compass, CheckCircle2, MessageSquare, LogIn, Lock, Users, ArrowLeft, Mail } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Recursive Firestore undefined field cleaner
const sanitizeFirestoreData = (obj: any): any => {
  if (obj === undefined) return null;
  if (obj === null) return null;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeFirestoreData);
  }
  if (typeof obj === 'object') {
    const cleaned: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        cleaned[key] = sanitizeFirestoreData(val);
      }
    }
    return cleaned;
  }
  return obj;
};

// Seeded departments in case Firestore is being synchronized
const INITIAL_DEPARTMENTS: Department[] = [
  {
    id: "pwd",
    name: "Public Works Department (PWD)",
    contactEmail: "pwd-roads@city.gov",
    contactPhone: "+1-555-0199",
    stats: { issuesAssigned: 0, issuesResolved: 0, avgResolutionTime: 0, satisfactionRating: 0, responseRate: 100 },
    sla: { responseTimeHours: 12, resolutionTimeDays: 3 }
  },
  {
    id: "water",
    name: "Water Supply & Sewerage Board",
    contactEmail: "waterboard@city.gov",
    contactPhone: "+1-555-0122",
    stats: { issuesAssigned: 0, issuesResolved: 0, avgResolutionTime: 0, satisfactionRating: 0, responseRate: 100 },
    sla: { responseTimeHours: 6, resolutionTimeDays: 2 }
  },
  {
    id: "electricity",
    name: "Electricity & Power Distribution",
    contactEmail: "power-grid@city.gov",
    contactPhone: "+1-555-0144",
    stats: { issuesAssigned: 0, issuesResolved: 0, avgResolutionTime: 0, satisfactionRating: 0, responseRate: 100 },
    sla: { responseTimeHours: 2, resolutionTimeDays: 1 }
  },
  {
    id: "sanitation",
    name: "Solid Waste Management & Sanitation",
    contactEmail: "sanitation@city.gov",
    contactPhone: "+1-555-0166",
    stats: { issuesAssigned: 0, issuesResolved: 0, avgResolutionTime: 0, satisfactionRating: 0, responseRate: 100 },
    sla: { responseTimeHours: 24, resolutionTimeDays: 2 }
  },
  {
    id: "traffic",
    name: "Traffic Management & Signage Department",
    contactEmail: "traffic@city.gov",
    contactPhone: "+1-555-0177",
    stats: { issuesAssigned: 0, issuesResolved: 0, avgResolutionTime: 0, satisfactionRating: 0, responseRate: 100 },
    sla: { responseTimeHours: 8, resolutionTimeDays: 2 }
  }
];

export default function App() {
  const { language, t } = useLanguage();
  const [currentTab, setCurrentTab] = useState('map');
  const [selectedIssueId, setSelectedIssueId] = useState<string | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [departments, setDepartments] = useState<Department[]>(INITIAL_DEPARTMENTS);
  const [activeAlerts, setActiveAlerts] = useState<any[]>([]);

  // Live notifications system state
  interface LiveToast {
    id: string;
    type: 'new_incident' | 'status_change' | 'new_comment' | 'info';
    title: string;
    message: string;
    issueId?: string;
  }
  const [toasts, setToasts] = useState<LiveToast[]>([]);
  const issuesRef = React.useRef<Issue[]>([]);
  const isInitialIssuesLoad = React.useRef(true);

  // Offline & Geofence Simulation States
  const [isOfflineSimulated, setIsOfflineSimulated] = useState<boolean>(() => {
    return localStorage.getItem('is_offline_simulated') === 'true';
  });
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('offline_queue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [userSimulatedLat, setUserSimulatedLat] = useState<number>(28.6304);
  const [userSimulatedLng, setUserSimulatedLng] = useState<number>(77.2177);
  const [userSimulatedAddress, setUserSimulatedAddress] = useState<string>('Connaught Place, New Delhi, India');

  const addToOfflineQueue = (item: any) => {
    setOfflineQueue(prev => {
      const next = [...prev, item];
      localStorage.setItem('offline_queue', JSON.stringify(next));
      return next;
    });
  };

  const handleToggleOffline = () => {
    setIsOfflineSimulated(prev => {
      const next = !prev;
      localStorage.setItem('is_offline_simulated', String(next));
      showLiveToast('info', {
        title: next ? '⚠️ OFFLINE SIMULATION ACTIVATED' : '🌐 CONNECTION RESTORED',
        message: next 
          ? 'Application went offline. Transactions are queued locally in browser storage.' 
          : 'Back online! Ready to synchronize offline transaction ledger with cloud database.'
      });
      return next;
    });
  };

  React.useEffect(() => {
    const handleOnline = () => {
      setIsOfflineSimulated(false);
      localStorage.setItem('is_offline_simulated', 'false');
      showLiveToast('info', {
        title: '🌐 CONNECTION DETECTED',
        message: 'Browser connection active! Automatically synchronizing pending transactions...'
      });
    };
    const handleOffline = () => {
      setIsOfflineSimulated(true);
      localStorage.setItem('is_offline_simulated', 'true');
      showLiveToast('info', {
        title: '⚠️ BROWSER OFFLINE DETECTED',
        message: 'No internet connection. Entered offline failsafe queueing mode.'
      });
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  React.useEffect(() => {
    if (!isOfflineSimulated && offlineQueue.length > 0) {
      handleForceSync();
    }
  }, [isOfflineSimulated]);

  React.useEffect(() => {
    issuesRef.current = issues;
  }, [issues]);

  const showLiveToast = (
    type: 'new_incident' | 'status_change' | 'new_comment' | 'info',
    data: { title: string; category?: string; address?: string; oldStatus?: string; newStatus?: string; byRole?: string; message?: string; id?: string }
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    let titleText = '';
    let messageText = '';

    if (type === 'new_incident') {
      titleText = `🚨 New ${data.category?.toUpperCase() || 'Incident'}`;
      messageText = `"${data.title}" reported near ${data.address?.split(',')[0] || ''}`;
    } else if (type === 'status_change') {
      titleText = `📢 Status Update`;
      messageText = `"${data.title}" is now ${data.newStatus?.toUpperCase()}`;
    } else if (type === 'new_comment') {
      titleText = `💬 Feed Update`;
      messageText = `${data.byRole?.toUpperCase() || 'User'}: "${data.message}"`;
    } else {
      titleText = data.title;
      messageText = data.message || '';
    }

    setToasts(prev => [...prev, { id, type, title: titleText, message: messageText, issueId: data.id }]);

    // Auto remove after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  };

  const handleToastClick = (toast: LiveToast) => {
    if (toast.issueId) {
      setSelectedIssueId(toast.issueId);
      if (userProfile?.role === 'officer') {
        setCurrentTab('officer');
      } else {
        setCurrentTab('map');
      }
    }
    setToasts(prev => prev.filter(t => t.id !== toast.id));
  };

  // Listen to Active System Alerts
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'system_alerts'), (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.active !== false) {
          list.push({ id: doc.id, ...data });
        }
      });
      setActiveAlerts(list);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_alerts');
    });
    return () => unsubscribe();
  }, []);

  // System Config Real-time Sync
  const [systemConfig, setSystemConfig] = useState<any>(null);
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'system_config', 'parameters'), (docSnapshot) => {
      if (docSnapshot.exists()) {
        setSystemConfig(docSnapshot.data());
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'system_config/parameters');
    });
    return () => unsubscribe();
  }, []);

  // Seed default admin and officer if they don't exist in Firestore
  useEffect(() => {
    const seedDefaultUsers = async () => {
      try {
        const adminDocRef = doc(db, 'users', 'seeded-admin-default');
        const adminSnap = await getDoc(adminDocRef);
        if (!adminSnap.exists()) {
          await setDoc(adminDocRef, {
            id: 'seeded-admin-default',
            email: 'admin@communityguard.org',
            name: 'Chief Admin Auden',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin_auden',
            role: 'admin',
            joinedAt: new Date().toISOString(),
            stats: {
              issuesReported: 0,
              issuesResolved: 0,
              verifications: 0,
              points: 5000,
              badges: ["Chief Auditor", "Civic Pioneer"]
            }
          });
          console.log("Seeded default admin successfully");
        }

        const officerDocRef = doc(db, 'users', 'seeded-officer-default');
        const officerSnap = await getDoc(officerDocRef);
        if (!officerSnap.exists()) {
          await setDoc(officerDocRef, {
            id: 'seeded-officer-default',
            email: 'officer@communityguard.org',
            name: 'Officer Suresh',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=officer_suresh',
            role: 'officer',
            joinedAt: new Date().toISOString(),
            department: 'Public Works Department (PWD)',
            assignedCity: 'Chennai',
            assignedLocation: {
              latitude: 13.0827,
              longitude: 80.2707
            },
            stats: {
              issuesReported: 0,
              issuesResolved: 0,
              verifications: 0,
              points: 3500,
              badges: ["Supervising Commissioner"]
            }
          });
          console.log("Seeded default officer successfully");
        }
      } catch (err) {
        console.error("Failed to seed default users:", err);
      }
    };
    seedDefaultUsers();
  }, []);

  // Demo Guest Auth States
  const [showDemoEmailInput, setShowDemoEmailInput] = useState(false);
  const [demoEmailInput, setDemoEmailInput] = useState('');
  const [demoSubmitting, setDemoSubmitting] = useState(false);

  // Auth States
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfileType | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Listen to Auth State
  useEffect(() => {
    // Check if we have a persisted demo user session in localStorage first
    const persistedDemo = localStorage.getItem('demo_guest_user');
    if (persistedDemo) {
      try {
        const parsed = JSON.parse(persistedDemo);
        setCurrentUser(parsed.user);
        setUserProfile(parsed.profile);
        setAuthLoading(false);

        // Fetch latest up-to-date user profile from Firestore to keep it perfectly synchronized with the DB
        const userDocRef = doc(db, 'users', parsed.user.uid);
        getDoc(userDocRef).then((docSnap) => {
          if (docSnap.exists()) {
            const latestProfile = docSnap.data() as UserProfileType;
            setUserProfile(latestProfile);
            // Save updated profile back to localstorage immediately
            localStorage.setItem('demo_guest_user', JSON.stringify({ user: parsed.user, profile: latestProfile }));
          }
        }).catch((err) => {
          console.warn("Failed to sync latest demo profile from Firestore on mount:", err);
        });
      } catch (e) {
        console.error("Failed to restore persisted demo session:", e);
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // If logged in via standard Firebase Auth, check if it's an anonymous/demo session first.
        // We do NOT want to overwrite or remove a demo guest session.
        if (firebaseUser.isAnonymous) {
          const persistedDemo = localStorage.getItem('demo_guest_user');
          if (persistedDemo) {
            try {
              const parsed = JSON.parse(persistedDemo);
              setCurrentUser(parsed.user);
              setUserProfile(parsed.profile);
              setAuthLoading(false);
              return;
            } catch (e) {
              console.error("Failed to restore persisted demo session inside auth listener:", e);
            }
          }
        }

        // Standard auth user flow (like Google Sign-In)
        localStorage.removeItem('demo_guest_user');
        
        // Synchronize user profile in real-time or get it once from Firestore
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          let finalProfile: UserProfileType;

          if (docSnap.exists()) {
            finalProfile = docSnap.data() as UserProfileType;
          } else {
            // Check if there is an existing seeded user document by email (like the original demo)
            const q = query(collection(db, 'users'), where('email', '==', firebaseUser.email));
            const qSnap = await getDocs(q);
            
            if (!qSnap.empty) {
              const matchedDoc = qSnap.docs[0];
              const existingData = matchedDoc.data();
              finalProfile = {
                ...(existingData as UserProfileType),
                id: firebaseUser.uid, // Adopt real uid
              };
              if (matchedDoc.id !== firebaseUser.uid) {
                try {
                  await deleteDoc(doc(db, 'users', matchedDoc.id));
                } catch (delErr) {
                  console.warn("Failed to delete old duplicate pre-registered user profile document:", delErr);
                }
              }
            } else {
              // Create brand new profile for new user signup
              finalProfile = {
                id: firebaseUser.uid,
                email: firebaseUser.email || (firebaseUser.isAnonymous ? 'saitejadandu1231@gmail.com' : ''),
                name: firebaseUser.isAnonymous ? 'Sai Teja (Guest)' : (firebaseUser.displayName || 'Anonymous Citizen'),
                avatar: firebaseUser.photoURL || (firebaseUser.isAnonymous ? 'https://api.dicebear.com/7.x/avataaars/svg?seed=teja' : `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`),
                role: 'citizen',
                joinedAt: new Date().toISOString(),
                stats: {
                  issuesReported: 0,
                  issuesResolved: 0,
                  verifications: 0,
                  points: 100,
                  badges: ["Civic Pioneer"]
                }
              };
            }
            // Save to database
            await setDoc(userDocRef, finalProfile);
          }
          setUserProfile(finalProfile);
          setCurrentUser(firebaseUser);
        } catch (err) {
          console.error("Firestore user profile sync error:", err);
          // Standard offline fallback for testing
          setUserProfile({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'Demo User',
            avatar: firebaseUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${firebaseUser.uid}`,
            role: 'citizen',
            joinedAt: new Date().toISOString(),
            stats: {
              issuesReported: 0,
              issuesResolved: 0,
              verifications: 0,
              points: 100,
              badges: ["Civic Pioneer"]
            }
          });
          setCurrentUser(firebaseUser);
        }
      } else {
        // Only clear if we didn't deliberately set a persisted guest fallback session
        if (!localStorage.getItem('demo_guest_user')) {
          setCurrentUser(null);
          setUserProfile(null);
        }
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Synchronize userProfile state changes to localStorage for demo guest persistence
  useEffect(() => {
    if (userProfile && localStorage.getItem('demo_guest_user')) {
      const demoData = JSON.parse(localStorage.getItem('demo_guest_user') || '{}');
      demoData.profile = userProfile;
      localStorage.setItem('demo_guest_user', JSON.stringify(demoData));
    }
  }, [userProfile]);

  // Google OAuth Popup login
  const handleGoogleSignIn = async () => {
    try {
      setAuthLoading(true);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error("Google Sign-In popup failed:", err);
      setAuthLoading(false);
    }
  };

  // Demo Bypass Login Option with custom Email Address
  const handleDemoSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!demoEmailInput.trim()) return;

    try {
      setDemoSubmitting(true);
      setAuthLoading(true);

      const cleanEmail = demoEmailInput.trim().toLowerCase();
      
      // Query database by email first to support pre-registered officers, admins, or citizens
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const qSnap = await getDocs(q);

      let finalProfile: UserProfileType;
      let demoUid = '';

      if (!qSnap.empty) {
        // Pre-registered profile exists (could be added by Admin or previously created)
        const matchedDoc = qSnap.docs[0];
        finalProfile = matchedDoc.data() as UserProfileType;
        demoUid = matchedDoc.id;
      } else {
        // No pre-registered profile; generate a stable guest UID
        demoUid = `demo-guest-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`;
        
        // Derive clean, neat display name (e.g. sai.teja@gmail.com -> Sai Teja)
        const emailLocalPart = cleanEmail.split('@')[0];
        const displayName = emailLocalPart
          .split(/[._-]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ') || "Demo Citizen";

        finalProfile = {
          id: demoUid,
          email: cleanEmail,
          name: displayName,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${cleanEmail}`,
          role: 'citizen',
          joinedAt: new Date().toISOString(),
          stats: {
            issuesReported: 0,
            issuesResolved: 0,
            verifications: 0,
            points: 100,
            badges: ["Civic Pioneer"]
          }
        };

        // Save new guest profile
        await setDoc(doc(db, 'users', demoUid), finalProfile);
      }

      const demoUser = {
        uid: demoUid,
        email: cleanEmail,
        displayName: finalProfile.name,
        photoURL: finalProfile.avatar
      } as any;

      try {
        // Also sign in anonymously to keep Firebase rules compliant and secure
        try {
          await signInAnonymously(auth);
        } catch (authErr) {
          console.warn("Silent anonymous authentication bypassed:", authErr);
        }

        setCurrentUser(demoUser);
        setUserProfile(finalProfile);
        localStorage.setItem('demo_guest_user', JSON.stringify({ user: demoUser, profile: finalProfile }));
        setShowDemoEmailInput(false);
      } catch (dbErr) {
        console.warn("Database sync during demo login bypassed:", dbErr);
        setCurrentUser(demoUser);
        setUserProfile(finalProfile);
        localStorage.setItem('demo_guest_user', JSON.stringify({ user: demoUser, profile: finalProfile }));
      }
    } catch (err) {
      console.error("Demo signup ledger sync failed:", err);
    } finally {
      setDemoSubmitting(false);
      setAuthLoading(false);
    }
  };

  // Sign out Handler
  const handleSignOut = async () => {
    try {
      setAuthLoading(true);
      localStorage.removeItem('demo_guest_user');
      await signOut(auth);
      setCurrentUser(null);
      setUserProfile(null);
      setAuthLoading(false);
    } catch (err) {
      console.error("Sign out error:", err);
      setAuthLoading(false);
    }
  };

  // Role Switch Persistency in Firestore
  const handleRoleChange = async (newRole: 'citizen' | 'officer' | 'admin') => {
    if (!userProfile) return;
    
    // Optimistic local state update
    setUserProfile(prev => {
      if (!prev) return null;
      const updated = { ...prev, role: newRole };
      if (localStorage.getItem('demo_guest_user')) {
        const demoData = JSON.parse(localStorage.getItem('demo_guest_user') || '{}');
        demoData.profile = updated;
        localStorage.setItem('demo_guest_user', JSON.stringify(demoData));
      }
      return updated;
    });

    try {
      const userDocRef = doc(db, 'users', userProfile.id);
      await updateDoc(userDocRef, { role: newRole });
    } catch (err) {
      console.error("Failed to update user role in Firestore:", err);
    }
  };

  // Active Geofencing Proximity Alarm background watch
  useEffect(() => {
    if (issues.length === 0) return;
    
    // Find unresolved proximal issues (under 500 meters)
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
      return R * c;
    };

    const proximal = issues
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
      .filter(item => item.distance < 500);

    if (proximal.length > 0) {
      // Trigger a beautiful audio-visual alert
      const nearest = proximal[0];
      showLiveToast('info', {
        title: '🚨 GEOFENCE PROXIMITY ALARM',
        message: `Hazard warning! "${nearest.title}" is detected ${Math.round(nearest.distance)}m ahead near ${nearest.address.split(',')[0]}. Proceed with caution.`,
        id: nearest.id
      });
    }
  }, [userSimulatedLat, userSimulatedLng]);

  // Real-time Firestore sync of Issues and Departments
  useEffect(() => {
    if (!currentUser) return;

    // Sync Issues collection
    const unsubIssues = onSnapshot(collection(db, 'issues'), (snapshot) => {
      const list: Issue[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({ id: d.id, ...data, updates: Array.isArray(data.updates) ? data.updates : [] } as Issue);
      });
      // Sort newest first
      const sortedList = list.sort((a, b) => b.timeline.reportedAt.localeCompare(a.timeline.reportedAt));

      if (!isInitialIssuesLoad.current) {
        snapshot.docChanges().forEach((change) => {
          const docData = change.doc.data() as Omit<Issue, 'id'>;
          const docId = change.doc.id;

          if (change.type === 'added') {
            if (docData.reporterId !== currentUser?.uid) {
              showLiveToast('new_incident', {
                title: docData.title,
                category: docData.category,
                address: docData.address,
                id: docId
              });
            }
          } else if (change.type === 'modified') {
            const oldIssue = issuesRef.current.find(i => i.id === docId);
            if (oldIssue) {
              if (oldIssue.status !== docData.status) {
                showLiveToast('status_change', {
                  title: docData.title,
                  oldStatus: oldIssue.status,
                  newStatus: docData.status,
                  id: docId
                });
              } else if ((oldIssue.updates?.length || 0) < (docData.updates?.length || 0)) {
                const newComment = docData.updates[docData.updates.length - 1];
                if (newComment) {
                  showLiveToast('new_comment', {
                    title: docData.title,
                    byRole: newComment.byRole,
                    message: newComment.message,
                    id: docId
                  });
                }
              }
            }
          }
        });
      } else {
        isInitialIssuesLoad.current = false;
      }

      setIssues(sortedList);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'issues');
    });

    // Sync Departments collection
    const unsubDepts = onSnapshot(collection(db, 'departments'), (snapshot) => {
      if (!snapshot.empty) {
        const list: Department[] = [];
        snapshot.forEach((d) => {
          list.push({ id: d.id, ...d.data() } as Department);
        });
        setDepartments(list);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'departments');
    });

    return () => {
      unsubIssues();
      unsubDepts();
    };
  }, [currentUser]);

  // Gamification Point Incrementor linked directly to User Profile
  const handleAddPoints = async (pts: number) => {
    if (!userProfile) return;
    if (userProfile.role !== 'citizen') return; // Strictly remove reward points for officers and admins
    
    const isDoubleXp = systemConfig?.doubleXpActive === true;
    const finalPts = isDoubleXp ? pts * 2 : pts;
    const nextPoints = (userProfile.stats.points || 0) + finalPts;
    const nextBadges = [...userProfile.stats.badges];
    if (nextPoints >= 400 && !nextBadges.includes("Mapper")) {
      nextBadges.push("Mapper");
    }

    // Optimistic UI update
    setUserProfile(prev => {
      if (!prev) return null;
      const updated = {
        ...prev,
        stats: {
          ...prev.stats,
          points: nextPoints,
          badges: nextBadges
        }
      };
      if (localStorage.getItem('demo_guest_user')) {
        const demoData = JSON.parse(localStorage.getItem('demo_guest_user') || '{}');
        demoData.profile = updated;
        localStorage.setItem('demo_guest_user', JSON.stringify(demoData));
      }
      return updated;
    });

    try {
      const userDocRef = doc(db, 'users', userProfile.id);
      await updateDoc(userDocRef, {
        "stats.points": nextPoints,
        "stats.badges": nextBadges
      });
      
      if (isDoubleXp) {
        showLiveToast('info', {
          title: "⚡ Double XP Boost Applied!",
          message: `Earned ${finalPts} XP (+${pts} Event Bonus) for your contributions!`
        });
      }
    } catch (err) {
      console.error("Failed to update user points in Firestore:", err);
    }
  };

  const handleRedeemReward = async (rewardId: string, rewardName: string, cost: number) => {
    if (!userProfile) return { success: false, error: "No authenticated user profile loaded" };
    const currentPoints = userProfile.stats?.points || 0;
    if (currentPoints < cost) {
      return { success: false, error: "Insufficient XP points balance for this reward" };
    }

    const nextPoints = currentPoints - cost;
    const codeWords = ["PASS", "CITY", "PARK", "COFFEE", "MUNI", "WARD"];
    const randomCode = `CG-${codeWords[Math.floor(Math.random() * codeWords.length)]}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    const newVoucher = {
      id: `vch-${Date.now()}`,
      rewardId,
      rewardName,
      cost,
      redeemedAt: new Date().toISOString(),
      voucherCode: randomCode,
      status: 'active' as const
    };

    const nextVouchers = [...(userProfile.claimedVouchers || []), newVoucher];

    // Optimistic local state update
    setUserProfile(prev => {
      if (!prev) return null;
      return {
        ...prev,
        stats: {
          ...prev.stats,
          points: nextPoints
        },
        claimedVouchers: nextVouchers
      };
    });

    try {
      const userDocRef = doc(db, 'users', userProfile.id);
      await updateDoc(userDocRef, {
        "stats.points": nextPoints,
        "claimedVouchers": nextVouchers
      });
      return { success: true, voucher: newVoucher };
    } catch (err: any) {
      console.error("Failed to redeem reward in Firestore:", err);
      return { success: false, error: err.message || "Failed to finalize redemption" };
    }
  };

  const uploadVote = async (issueId: string, voteType: 'up' | 'down') => {
    if (!userProfile) return;
    const issueRef = doc(db, 'issues', issueId);
    const incrementValue = voteType === 'up' ? 1 : 0;
    const decrementValue = voteType === 'down' ? 1 : 0;
    await updateDoc(issueRef, {
      "verificationStatus.upvotes": increment(incrementValue),
      "verificationStatus.downvotes": increment(decrementValue),
      "verificationStatus.verifiedBy": arrayUnion(userProfile.id)
    });
  };

  const uploadComment = async (issueId: string, commentText: string) => {
    if (!userProfile) return;
    const currentStatus = issuesRef.current.find(i => i.id === issueId)?.status || 'reported';
    const newComment = {
      timestamp: new Date().toISOString(),
      status: currentStatus,
      message: commentText,
      byRole: userProfile.role
    };
    const issueRef = doc(db, 'issues', issueId);
    await updateDoc(issueRef, {
      updates: arrayUnion(newComment)
    });
  };

  const handleForceSync = async () => {
    if (offlineQueue.length === 0) return;
    
    showLiveToast('info', {
      title: '🔄 SYNCHRONIZING LEDGER',
      message: `Uploading ${offlineQueue.length} pending offline transactions to Firestore...`
    });

    const itemsToSync = [...offlineQueue];
    
    for (const item of itemsToSync) {
      try {
        if (item.type === 'report') {
          await uploadReport(item.payload);
        } else if (item.type === 'comment') {
          await uploadComment(item.payload.issueId, item.payload.commentText);
        } else if (item.type === 'vote') {
          await uploadVote(item.payload.issueId, item.payload.voteType);
        }
      } catch (err) {
        console.error("Failed to sync transaction item:", item, err);
      }
    }

    setOfflineQueue([]);
    localStorage.removeItem('offline_queue');

    showLiveToast('info', {
      title: '✅ LEDGER SYNCHRONIZED',
      message: 'All pending offline transactions successfully written to the cloud ledger!'
    });
  };

  const handleVote = async (issueId: string, type: 'up' | 'down') => {
    if (!userProfile) return;
    
    if (issueId.startsWith('temp-')) {
      console.warn("Cannot vote on temporary issue during offline syncing");
      return;
    }
    
    const issue = issues.find(i => i.id === issueId);
    if (!issue) return;

    const verifiedBy = issue.verificationStatus?.verifiedBy || [];
    if (verifiedBy.includes(userProfile.id)) {
      console.warn("User has already voted/verified this issue");
      return;
    }

    if (isOfflineSimulated) {
      // Optimistic state update
      setIssues(prev => prev.map(item => {
        if (item.id === issueId) {
          const uv = type === 'up' ? item.verificationStatus.upvotes + 1 : item.verificationStatus.upvotes;
          const dv = type === 'down' ? item.verificationStatus.downvotes + 1 : item.verificationStatus.downvotes;
          const updatedVerifiedBy = [...(item.verificationStatus.verifiedBy || []), userProfile.id];
          return {
            ...item,
            verificationStatus: { 
              ...item.verificationStatus, 
              upvotes: uv, 
              downvotes: dv,
              verifiedBy: updatedVerifiedBy
            }
          };
        }
        return item;
      }));
      
      addToOfflineQueue({
        type: 'vote',
        timestamp: new Date().toISOString(),
        payload: { issueId, voteType: type }
      });
      
      showLiveToast('info', {
        title: '📥 VOTE QUEUED OFFLINE',
        message: `Your verification vote has been recorded locally and will synchronize once online.`
      });
      return;
    }

    try {
      const issueRef = doc(db, 'issues', issueId);
      const incrementValue = type === 'up' ? 1 : 0;
      const decrementValue = type === 'down' ? 1 : 0;

      // Optimistic state update
      setIssues(prev => prev.map(item => {
        if (item.id === issueId) {
          const uv = type === 'up' ? item.verificationStatus.upvotes + 1 : item.verificationStatus.upvotes;
          const dv = type === 'down' ? item.verificationStatus.downvotes + 1 : item.verificationStatus.downvotes;
          const updatedVerifiedBy = [...(item.verificationStatus.verifiedBy || []), userProfile.id];
          return {
            ...item,
            verificationStatus: { 
              ...item.verificationStatus, 
              upvotes: uv, 
              downvotes: dv,
              verifiedBy: updatedVerifiedBy
            }
          };
        }
        return item;
      }));

      // Update Firestore
      await updateDoc(issueRef, {
        "verificationStatus.upvotes": increment(incrementValue),
        "verificationStatus.downvotes": increment(decrementValue),
        "verificationStatus.verifiedBy": arrayUnion(userProfile.id)
      });

      // Award XP points for verifying
      handleAddPoints(15);
    } catch (error) {
      console.error("Failed to vote in Firestore:", error);
    }
  };

  const handleAddComment = async (issueId: string, commentText: string) => {
    if (!userProfile) return;

    if (issueId.startsWith('temp-')) {
      console.warn("Cannot comment on temporary issue during offline syncing");
      return;
    }

    const currentStatus = issues.find(i => i.id === issueId)?.status || 'reported';
    const newComment = {
      timestamp: new Date().toISOString(),
      status: currentStatus,
      message: commentText,
      byRole: userProfile.role
    };

    if (isOfflineSimulated) {
      // Optimistic state update
      setIssues(prev => prev.map(issue => {
        if (issue.id === issueId) {
          return {
            ...issue,
            updates: [...issue.updates, newComment]
          };
        }
        return issue;
      }));

      addToOfflineQueue({
        type: 'comment',
        timestamp: new Date().toISOString(),
        payload: { issueId, commentText }
      });

      showLiveToast('info', {
        title: '📥 COMMENT QUEUED OFFLINE',
        message: `Your status comment has been queued locally in browser memory.`
      });
      return;
    }

    // Optimistic UI
    setIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        return {
          ...issue,
          updates: [...issue.updates, newComment]
        };
      }
      return issue;
    }));

    try {
      const issueRef = doc(db, 'issues', issueId);
      await updateDoc(issueRef, {
        updates: arrayUnion(newComment)
      });
      handleAddPoints(5);
    } catch (error) {
      console.error("Failed to write update/comment to Firestore:", error);
    }
  };

  const uploadReport = async (issueData: {
    title: string;
    description: string;
    category: IssueCategory;
    severity: string;
    photoUrl: string;
    location: { latitude: number; longitude: number };
    address: string;
    photoAnalysis?: PhotoAnalysis;
    voiceUrl?: string;
    gpsVerified?: boolean;
    gpsMismatchDistance?: number;
  }) => {
    if (!userProfile) return null;

    const defaultDeptMap: Record<IssueCategory, string> = {
      pothole: "Public Works Department (PWD)",
      water: "Water Supply & Sewerage Board",
      light: "Electricity & Power Distribution",
      garbage: "Solid Waste Management & Sanitation",
      traffic: "Traffic Management & Signage Department",
      drainage: "Water Supply & Sewerage Board",
      other: "Public Works Department (PWD)"
    };

    const assignedDept = issueData.photoAnalysis?.recommendedAuthority || defaultDeptMap[issueData.category] || "Public Works Department (PWD)";

    const gpsVerified = issueData.gpsVerified !== undefined ? issueData.gpsVerified : true;
    const gpsMismatchDistance = issueData.gpsMismatchDistance || 0;

    const updatesList = [
      {
        timestamp: new Date().toISOString(),
        status: 'reported' as any,
        message: issueData.photoAnalysis
          ? `AI Vision completed auto-categorization into ${issueData.category} with ${issueData.photoAnalysis.confidence}% confidence.`
          : `Civic issue registered near ${issueData.address.split(',')[0]}`,
        byRole: 'system' as any
      }
    ];

    if (!gpsVerified) {
      updatesList.push({
        timestamp: new Date().toISOString(),
        status: 'reported' as any,
        message: `⚠️ GPS Security Alert: Report location deviates from user device position by ${Math.round(gpsMismatchDistance)}m. Marked for Pending Citizen Visual Consensus.`,
        byRole: 'system' as any
      });
    }

    const newIssue: Omit<Issue, 'id'> = {
      reporterId: userProfile.id,
      reporterName: userProfile.name,
      title: issueData.title,
      description: issueData.description,
      category: issueData.category,
      severity: issueData.severity as any,
      status: 'reported',
      location: issueData.location,
      address: issueData.address,
      photoUrl: issueData.photoUrl,
      photoAnalysis: issueData.photoAnalysis,
      assignedDepartment: assignedDept,
      voiceUrl: issueData.voiceUrl,
      gpsVerified,
      gpsMismatchDistance,
      verificationStatus: {
        upvotes: 1,
        downvotes: 0,
        verifiedBy: [userProfile.id],
        aiVerification: !!issueData.photoAnalysis
      },
      timeline: {
        reportedAt: new Date().toISOString(),
        verifiedAt: issueData.photoAnalysis ? new Date().toISOString() : undefined
      },
      updates: updatesList,
      impactMetrics: {
        peopleAffected: issueData.severity === 'critical' ? 5000 : issueData.severity === 'high' ? 2400 : 800,
        priorityScore: issueData.severity === 'critical' ? 95 : issueData.severity === 'high' ? 82 : 45,
        preventedAccidents: issueData.severity === 'critical' || issueData.severity === 'high' ? 3 : 0
      },
      tags: [issueData.category, "New Report"]
    };

    try {
      // Create record in Firestore
      const docRef = await addDoc(collection(db, 'issues'), sanitizeFirestoreData(newIssue));
      const realId = docRef.id;

      // Update local and firestore stats
      const userDocRef = doc(db, 'users', userProfile.id);
      await updateDoc(userDocRef, {
        "stats.issuesReported": increment(1)
      });
      
      setUserProfile(prev => {
        if (!prev) return null;
        return {
          ...prev,
          stats: {
            ...prev.stats,
            issuesReported: prev.stats.issuesReported + 1
          }
        };
      });

      handleAddPoints(50); // Huge bonus points for a real reported issue!

      // Trigger SMS/WhatsApp Neighborhood Leader alerts if critical or high
      if (newIssue.severity === 'critical' || newIssue.severity === 'high') {
        fetch('/api/broadcast-critical-alert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            issue: { id: realId, ...newIssue }
          })
        }).catch(err => {
          console.error("SMS Ward Broadcast background task failed:", err);
        });
      }

      // Trigger Agentic Dispatch & Civil engineering Audit on the server
      fetch('/api/agentic-audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          issueId: realId,
          title: newIssue.title,
          description: newIssue.description,
          category: newIssue.category,
          severity: newIssue.severity,
          address: newIssue.address
        })
      }).catch(err => {
        console.error("Agentic Audit background task failed:", err);
      });

      return realId;
    } catch (error) {
      console.error("Failed to add new issue to Firestore:", error);
      throw error;
    }
  };

  const handleReportCreated = async (issueData: {
    title: string;
    description: string;
    category: IssueCategory;
    severity: string;
    photoUrl: string;
    location: { latitude: number; longitude: number };
    address: string;
    photoAnalysis?: PhotoAnalysis;
    voiceUrl?: string;
    gpsVerified?: boolean;
    gpsMismatchDistance?: number;
  }) => {
    if (!userProfile) return;

    if (isOfflineSimulated) {
      const updatesList = [
        {
          timestamp: new Date().toISOString(),
          status: 'reported' as any,
          message: `📥 (Offline Sync Queue) Report saved locally. Upload pending connectivity.`,
          byRole: 'system' as any
        }
      ];

      const tempId = `temp-${Date.now()}`;
      const fakeIssue = {
        id: tempId,
        reporterId: userProfile.id,
        reporterName: userProfile.name,
        title: issueData.title,
        description: issueData.description,
        category: issueData.category,
        severity: issueData.severity,
        status: 'reported',
        location: issueData.location,
        address: issueData.address,
        photoUrl: issueData.photoUrl,
        photoAnalysis: issueData.photoAnalysis,
        assignedDepartment: "Pending Online Sync",
        voiceUrl: issueData.voiceUrl,
        gpsVerified: issueData.gpsVerified !== undefined ? issueData.gpsVerified : true,
        gpsMismatchDistance: issueData.gpsMismatchDistance || 0,
        verificationStatus: {
          upvotes: 1,
          downvotes: 0,
          verifiedBy: [userProfile.id],
          aiVerification: !!issueData.photoAnalysis
        },
        timeline: {
          reportedAt: new Date().toISOString()
        },
        updates: updatesList,
        impactMetrics: {
          peopleAffected: 120,
          priorityScore: 50,
          preventedAccidents: 0
        },
        tags: [issueData.category, "Offline Cache"]
      };

      setIssues(prev => [fakeIssue as any as Issue, ...prev]);

      addToOfflineQueue({
        type: 'report',
        timestamp: new Date().toISOString(),
        payload: issueData
      });

      showLiveToast('info', {
        title: '📥 REPORT QUEUED OFFLINE',
        message: `"${issueData.title}" has been saved locally and will auto-sync when connection resumes.`
      });
      return;
    }

    // Normal upload flow (Online)
    const updatesList = [
      {
        timestamp: new Date().toISOString(),
        status: 'reported' as any,
        message: issueData.photoAnalysis
          ? `AI Vision completed auto-categorization into ${issueData.category} with ${issueData.photoAnalysis.confidence}% confidence.`
          : `Civic issue registered near ${issueData.address.split(',')[0]}`,
        byRole: 'system' as any
      }
    ];

    const tempId = `temp-${Date.now()}`;
    const initialTempIssue = {
      id: tempId,
      reporterId: userProfile.id,
      reporterName: userProfile.name,
      title: issueData.title,
      description: issueData.description,
      category: issueData.category,
      severity: issueData.severity,
      status: 'reported',
      location: issueData.location,
      address: issueData.address,
      photoUrl: issueData.photoUrl,
      photoAnalysis: issueData.photoAnalysis,
      assignedDepartment: "Allocating Squad Team...",
      voiceUrl: issueData.voiceUrl,
      gpsVerified: issueData.gpsVerified !== undefined ? issueData.gpsVerified : true,
      gpsMismatchDistance: issueData.gpsMismatchDistance || 0,
      verificationStatus: {
        upvotes: 1,
        downvotes: 0,
        verifiedBy: [userProfile.id],
        aiVerification: !!issueData.photoAnalysis
      },
      timeline: {
        reportedAt: new Date().toISOString()
      },
      updates: updatesList,
      impactMetrics: {
        peopleAffected: issueData.severity === 'critical' ? 5000 : 800,
        priorityScore: 50,
        preventedAccidents: 0
      },
      tags: [issueData.category]
    };

    setIssues(prev => [initialTempIssue as any as Issue, ...prev]);

    try {
      const realId = await uploadReport(issueData);
      if (realId) {
        setIssues(prev => prev.map(issue => {
          if (issue.id === tempId) {
            return { ...issue, id: realId };
          }
          return issue;
        }));
        setSelectedIssueId(prev => prev === tempId ? realId : prev);
      }
    } catch (err) {
      console.error("Online report creation failed:", err);
    }
  };

  const handleStatusUpdate = async (
    issueId: string,
    newStatus: IssueStatus,
    commentMessage: string,
    assignedOfficerName?: string,
    severity?: any,
    assignedDepartment?: string
  ) => {
    if (!userProfile) return;

    if (issueId.startsWith('temp-')) {
      console.warn("Cannot update temporary issue status during offline syncing");
      return;
    }

    const statusEvent = {
      timestamp: new Date().toISOString(),
      status: newStatus,
      message: commentMessage,
      byRole: 'officer' as const
    };

    // Optimistic UI update
    setIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        const timelineObj = { ...issue.timeline };
        if (newStatus === 'in_progress') timelineObj.startedAt = new Date().toISOString();
        if (newStatus === 'resolved') timelineObj.resolvedAt = new Date().toISOString();
        if (newStatus === 'assigned') timelineObj.assignedAt = new Date().toISOString();

        return {
          ...issue,
          status: newStatus,
          assignedOfficer: assignedOfficerName || issue.assignedOfficer,
          severity: severity || issue.severity,
          assignedDepartment: assignedDepartment || issue.assignedDepartment,
          timeline: timelineObj,
          updates: [...issue.updates, statusEvent]
        };
      }
      return issue;
    }));

    try {
      const issueRef = doc(db, 'issues', issueId);
      const updatePayload: any = {
        status: newStatus,
        updates: arrayUnion(statusEvent)
      };

      if (assignedOfficerName) updatePayload.assignedOfficer = assignedOfficerName;
      if (severity) updatePayload.severity = severity;
      if (assignedDepartment) updatePayload.assignedDepartment = assignedDepartment;
      if (newStatus === 'in_progress') updatePayload["timeline.startedAt"] = new Date().toISOString();
      if (newStatus === 'resolved') updatePayload["timeline.resolvedAt"] = new Date().toISOString();

      await updateDoc(issueRef, sanitizeFirestoreData(updatePayload));
    } catch (error) {
      console.error("Failed to update status in Firestore:", error);
    }
  };

  const handleAuditResolution = async (
    issueId: string,
    type: 'verify' | 'dispute',
    commentText?: string
  ) => {
    if (!userProfile) return;

    if (issueId.startsWith('temp-')) {
      console.warn("Cannot audit temporary issue resolution during offline syncing");
      return;
    }

    const auditComment = commentText || (type === 'verify' ? "Citizen verified resolution order" : "Citizen disputed resolution quality");
    const statusEvent = {
      timestamp: new Date().toISOString(),
      status: type === 'verify' ? 'resolved' as const : 'in_progress' as const,
      message: auditComment,
      byRole: 'citizen' as const
    };

    const commentObj = {
      userId: userProfile.id,
      userName: userProfile.name,
      userAvatar: userProfile.avatar,
      text: auditComment,
      timestamp: new Date().toISOString(),
      type: type === 'verify' ? 'praise' as const : 'concern' as const
    };

    setIssues(prev => prev.map(issue => {
      if (issue.id === issueId) {
        const currentAudit = issue.resolutionAudit || {
          verifiedCount: 0,
          disputedCount: 0,
          verifiedBy: [],
          disputedBy: []
        };

        const nextVerifiedBy = [...currentAudit.verifiedBy];
        const nextDisputedBy = [...currentAudit.disputedBy];
        let nextStatus = issue.status;

        let verifiedCount = currentAudit.verifiedCount;
        let disputedCount = currentAudit.disputedCount;

        if (type === 'verify') {
          if (!nextVerifiedBy.includes(userProfile.id)) {
            nextVerifiedBy.push(userProfile.id);
            verifiedCount += 1;
          }
        } else {
          if (!nextDisputedBy.includes(userProfile.id)) {
            nextDisputedBy.push(userProfile.id);
            disputedCount += 1;
          }
          if (disputedCount >= 3) {
            nextStatus = 'in_progress';
          }
        }

        const nextComments = [...(currentAudit.feedbackComments || []), commentObj];

        return {
          ...issue,
          status: nextStatus,
          resolutionAudit: {
            verifiedCount,
            disputedCount,
            verifiedBy: nextVerifiedBy,
            disputedBy: nextDisputedBy,
            feedbackComments: nextComments
          },
          updates: [...issue.updates, statusEvent]
        };
      }
      return issue;
    }));

    try {
      const issueRef = doc(db, 'issues', issueId);
      const issueSnap = await getDoc(issueRef);
      
      let nextVerifiedBy: string[] = [];
      let nextDisputedBy: string[] = [];
      let currentDisputedCount = 0;

      if (issueSnap.exists()) {
        const data = issueSnap.data();
        const audit = data.resolutionAudit || {};
        nextVerifiedBy = audit.verifiedBy || [];
        nextDisputedBy = audit.disputedBy || [];
        currentDisputedCount = audit.disputedCount || 0;
      }

      const updatePayload: any = {};

      if (type === 'verify') {
        if (!nextVerifiedBy.includes(userProfile.id)) {
          updatePayload["resolutionAudit.verifiedBy"] = arrayUnion(userProfile.id);
          updatePayload["resolutionAudit.verifiedCount"] = increment(1);
          await handleAddPoints(15);
        }
      } else {
        if (!nextDisputedBy.includes(userProfile.id)) {
          updatePayload["resolutionAudit.disputedBy"] = arrayUnion(userProfile.id);
          updatePayload["resolutionAudit.disputedCount"] = increment(1);
          currentDisputedCount += 1;
          
          if (currentDisputedCount >= 3) {
            updatePayload.status = 'in_progress';
            updatePayload["updates"] = arrayUnion({
              timestamp: new Date().toISOString(),
              status: 'in_progress',
              message: "SYSTEM ALERT: Incident re-opened due to multiple citizen dispute flags.",
              byRole: 'system'
            });
          }
        }
      }

      updatePayload["resolutionAudit.feedbackComments"] = arrayUnion(commentObj);
      updatePayload.updates = arrayUnion(statusEvent);

      await updateDoc(issueRef, updatePayload);
    } catch (error) {
      console.error("Failed to post resolution audit in Firestore:", error);
    }
  };

  // Center loader for initial load
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono font-bold text-slate-500 uppercase tracking-widest animate-pulse">Syncing Municipal Ledger...</p>
        </div>
      </div>
    );
  }

  // Stunning Welcome Splash Login screen if not signed in
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between relative overflow-hidden">
        <PwaInstallBanner />
        
        <div className="flex-1 flex items-center justify-center p-4 relative">
          {/* Subtle decorative futuristic grid overlays */}
          <div className="absolute inset-0 grid grid-cols-12 grid-rows-12 opacity-5 pointer-events-none">
          {Array.from({ length: 144 }).map((_, i) => (
            <div key={i} className="border-t border-l border-emerald-500" />
          ))}
        </div>
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl w-full bg-slate-950/80 backdrop-blur-xl rounded-[40px] border border-slate-800 shadow-2xl p-6 md:p-12 grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 relative z-10"
        >
          {/* Slogan & Left Pitch Column */}
          <div className="md:col-span-7 flex flex-col justify-center space-y-6">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/30">
                <Shield className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-xs font-black font-mono tracking-widest text-emerald-500 uppercase">COMMUNITYGUARD</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white leading-tight">
                Decentralized Public <br />
                <span className="bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">
                  Infrastructure Ledger
                </span>
              </h1>
              <p className="text-xs md:text-sm text-slate-400 leading-relaxed max-w-md">
                Empowering citizens to capture utility hazards, road cracks, and infrastructure incidents with instant AI routing, live SLA audits, and dynamic rewards.
              </p>
            </div>

            {/* High fidelity bullet benefits */}
            <div className="space-y-4 pt-2">
              {[
                {
                  icon: <Sparkles className="w-4 h-4 text-emerald-400" />,
                  title: "Gemini AI Verification",
                  desc: "Instant computer-vision categorization, impact score prediction, and routing."
                },
                {
                  icon: <Compass className="w-4 h-4 text-blue-400" />,
                  title: "Global Geolocation Service",
                  desc: "Supports automatic GPS triangulation and OSM street address lookup anywhere."
                },
                {
                  icon: <Award className="w-4 h-4 text-amber-400" />,
                  title: "Gamified Civic Incentives",
                  desc: "Earn points for validating neighboring hazards and unlock professional badging."
                }
              ].map((b, idx) => (
                <div key={idx} className="flex items-start space-x-3.5">
                  <div className="p-1.5 bg-slate-900 rounded-xl border border-slate-800 mt-0.5">
                    {b.icon}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-200">{b.title}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real Auth Interface (Right Column) */}
          <div className="md:col-span-5 bg-slate-900/50 rounded-3xl border border-slate-800/80 p-6 flex flex-col justify-between space-y-8">
            {!showDemoEmailInput ? (
              <>
                <div className="space-y-2">
                  <h2 className="text-lg font-extrabold text-white">Join the Guard</h2>
                  <p className="text-[10px] text-slate-400">Sign in securely with Google to verify municipal coordinates and claim points.</p>
                </div>

                <div className="space-y-4">
                  {/* Primary Gmail Login Call-to-action */}
                  <button
                    onClick={handleGoogleSignIn}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2.5 shadow-lg shadow-emerald-600/10 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <LogIn className="w-4 h-4 text-white" />
                    <span>Sign in with Gmail (Google)</span>
                  </button>

                  <div className="bg-slate-800/40 border border-slate-800/80 p-2.5 rounded-xl text-[9px] text-emerald-400 font-medium leading-relaxed">
                    🛡️ <strong>Note:</strong> Officers and Admins can log in using Google / Gmail SSO, provided their emails are registered by the Admin in advance. Unregistered Google accounts register as Citizens by default.
                  </div>

                  <div className="flex items-center my-2.5">
                    <div className="flex-1 border-t border-slate-800"></div>
                    <span className="px-3 text-[9px] font-mono text-slate-500 uppercase">OR DEMO TEST</span>
                    <div className="flex-1 border-t border-slate-800"></div>
                  </div>

                  {/* Seamless Sandbox Demo Account */}
                  <button
                    onClick={() => setShowDemoEmailInput(true)}
                    className="w-full bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 font-bold text-xs py-3 px-4 rounded-2xl flex items-center justify-center space-x-2 cursor-pointer transition-all"
                  >
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>Launch with Demo Guest Account</span>
                  </button>
                </div>
              </>
            ) : (
              <form onSubmit={handleDemoSubmit} className="space-y-6 flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-extrabold text-white">Demo Guest Portal</h2>
                    <p className="text-[10px] text-slate-400">Enter a demo email. Your incidents and reports will be stored persistently in Firestore tied to this email.</p>
                  </div>

                  <div className="space-y-2 pt-2">
                    <label className="text-[9px] font-bold text-emerald-500 font-mono uppercase block">Demo Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="email"
                        required
                        placeholder="e.g. saiteja@example.com"
                        value={demoEmailInput}
                        onChange={(e) => setDemoEmailInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-white rounded-2xl text-xs pl-10 pr-4 py-3.5 focus:outline-none transition-all placeholder:text-slate-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <button
                    type="submit"
                    disabled={demoSubmitting || !demoEmailInput.trim()}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {demoSubmitting ? (
                      <span>Loading Account Ledger...</span>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>Launch Demo Session</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowDemoEmailInput(false);
                      setDemoEmailInput('');
                    }}
                    className="w-full text-center text-[10px] font-mono text-slate-500 hover:text-slate-400 transition-all cursor-pointer py-1 flex items-center justify-center space-x-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back to standard login</span>
                  </button>
                </div>
              </form>
            )}

            <div className="flex items-center space-x-2 justify-center text-[10px] text-slate-500 font-mono">
              <Lock className="w-3 h-3" />
              <span>TLS Encrypted Secure Sandbox</span>
            </div>
          </div>
        </motion.div>
        </div>
      </div>
    );
  }

  // Active full-stack portal once authenticated
  const isMockLogin = !currentUser || currentUser.isAnonymous || !!localStorage.getItem('demo_guest_user');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Dynamic Header Component with sign-out option */}
      <Header
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        userRole={userProfile?.role || 'citizen'}
        setUserRole={handleRoleChange}
        userPoints={userProfile?.stats?.points || 0}
        userBadges={userProfile?.stats?.badges || []}
        onSignOut={handleSignOut}
        userProfile={userProfile}
        isMockLogin={isMockLogin}
      />

      {/* Interactive PWA Install Prompt Banner */}
      <PwaInstallBanner />

      {/* Real-time System Broadcast Alerts Banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-slate-900 border-b border-slate-800 text-white text-xs font-mono py-2.5 px-4 shadow-xs shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-500/10 via-amber-500/5 to-transparent pointer-events-none" />
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-2 relative z-10">
            <div className="flex items-center space-x-2.5">
              <span className="bg-rose-600 text-white font-extrabold text-[9px] uppercase px-2 py-0.5 rounded animate-pulse tracking-widest shrink-0">
                CIVIC ADVISORY
              </span>
              <div className="text-slate-100 text-[11px] font-bold font-sans leading-tight">
                {activeAlerts[0].title}: <span className="font-normal text-slate-300">{activeAlerts[0].message}</span>
              </div>
            </div>
            {activeAlerts.length > 1 && (
              <span className="text-[9px] font-bold text-rose-400 shrink-0 uppercase font-mono">
                + {activeAlerts.length - 1} more alerts broadcasting
              </span>
            )}
          </div>
        </div>
      )}

      {/* Dynamic System Event Banners */}
      {systemConfig?.emergencyProtocolActive && (
        <div className="bg-rose-600 text-white text-xs font-mono py-2 px-4 shadow-sm shrink-0 flex items-center justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 via-rose-500 to-red-600 animate-pulse opacity-50" />
          <div className="max-w-7xl mx-auto w-full flex items-center space-x-2.5 relative z-10 text-left">
            <span className="bg-white text-rose-700 font-extrabold text-[9px] uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0">
              {t('emergency_warning', 'EMERGENCY WARNING')}
            </span>
            <span className="font-bold text-[11px] font-sans leading-tight">
              {t('monsoon_warning_desc', '🚨 MONSOON CRITICAL WARNING: Active flash floods and water-logging warnings across municipal zones. PWD and Water Boards are operating under 100% emergency SLA priority dispatch.')}
            </span>
          </div>
        </div>
      )}

      {systemConfig?.doubleXpActive && (
        <div className="bg-amber-500 text-slate-950 text-xs font-mono py-2 px-4 shadow-sm shrink-0 flex items-center justify-between text-left">
          <div className="max-w-7xl mx-auto w-full flex items-center space-x-2.5">
            <span className="bg-slate-950 text-amber-400 font-extrabold text-[9px] uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0">
              {t('active_xp_boost', 'ACTIVE XP BOOST')}
            </span>
            <span className="font-extrabold text-[11px] font-sans leading-tight">
              {t('double_xp_desc', '⚡ DOUBLE XP ACTIVE: Earn 2x Civic Influence points for all hazard reporting and community verifications!')}
            </span>
          </div>
        </div>
      )}

      {/* Primary tab views content stage */}
      <main className="flex-1 pb-6 md:pb-12">
        {currentTab === 'map' && (
          userProfile?.role === 'citizen' ? (
            <CitizenDashboard
              issues={issues}
              onVote={handleVote}
              onAddComment={handleAddComment}
              userPoints={userProfile?.stats?.points || 0}
              userBadges={userProfile?.stats?.badges || []}
              setCurrentTab={setCurrentTab}
              selectedIssueId={selectedIssueId}
              onSelectIssueId={setSelectedIssueId}
              userId={userProfile?.id}
            />
          ) : (
            <HeatmapView
              issues={issues}
              onVote={handleVote}
              onAddComment={handleAddComment}
              currentUserRole={userProfile?.role || 'citizen'}
            />
          )
        )}

        {currentTab === 'heatmap' && (
          <HeatmapView
            issues={issues}
            onVote={handleVote}
            onAddComment={handleAddComment}
            currentUserRole={userProfile?.role || 'citizen'}
          />
        )}

        {currentTab === 'report' && (
          <ReportIssue
            onReportCreated={handleReportCreated}
            userPoints={userProfile?.stats?.points || 0}
            onAddPoints={handleAddPoints}
            existingIssues={issues}
            onSelectIssue={setSelectedIssueId}
            setCurrentTab={setCurrentTab}
          />
        )}

        {currentTab === 'analytics' && (
          <AnalyticsPanel
            issues={issues}
            departments={departments}
          />
        )}

        {currentTab === 'profile' && userProfile && (
          <UserProfile
            userProfile={userProfile}
            onRedeemReward={handleRedeemReward}
          />
        )}

        {currentTab === 'showcase' && (
          <ResolvedShowcase
            issues={issues}
            currentUserProfile={userProfile}
            onAuditResolution={handleAuditResolution}
            departments={departments}
          />
        )}

        {currentTab === 'officer' && (
          <OfficerQueue
            issues={issues}
            onStatusUpdate={handleStatusUpdate}
            departments={departments}
            onAddComment={handleAddComment}
            currentUser={userProfile}
          />
        )}

        {currentTab === 'admin' && userProfile?.role === 'admin' && (
          <AdminConsole
            issues={issues}
            departments={departments}
          />
        )}

        {currentTab === 'terminal' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 sm:mt-6">
            <NotificationTerminal
              issues={issues}
              isOfflineSimulated={isOfflineSimulated}
              onToggleOffline={handleToggleOffline}
              offlineQueue={offlineQueue}
              onForceSync={handleForceSync}
              userSimulatedLat={userSimulatedLat}
              userSimulatedLng={userSimulatedLng}
              onSimulatedLocationChange={(lat, lng, addr) => {
                setUserSimulatedLat(lat);
                setUserSimulatedLng(lng);
                setUserSimulatedAddress(addr);
              }}
            />
          </div>
        )}
      </main>

      {/* Floating AI Civic Assistant (Phase 5 GuardBot) */}
      <CivicAssistant userProfile={userProfile} />

      {/* Live Toast Notifications Overlay */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.8 }}
              onClick={() => handleToastClick(toast)}
              className="pointer-events-auto bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex flex-col space-y-1.5 cursor-pointer hover:bg-slate-800 transition-all"
            >
              <div className="text-[11px] font-black tracking-wide text-amber-400 uppercase font-mono">
                {toast.title}
              </div>
              <p className="text-[11px] text-slate-250 leading-normal font-medium">
                {toast.message}
              </p>
              <div className="text-[8px] text-slate-400 font-mono text-right mt-1 font-bold">
                Click to view details
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Elegant, dynamic footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-[10px] text-slate-400 font-mono">
        <div>CommunityGuard © 2026 | Audited Civic Infrastructure Ledger</div>
        <div className="mt-1">
          Active Session: <span className="text-slate-600 font-bold">{userProfile?.name}</span> ({userProfile?.email})
        </div>
      </footer>
    </div>
  );
}
