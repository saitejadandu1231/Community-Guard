import React, { useState } from 'react';
import { Award, Zap, Heart, Shield, Landmark, Sparkles, TrendingUp, HelpCircle, Flame, Ticket, QrCode, Check, Loader2, AlertCircle, Copy, CheckCircle, Info } from 'lucide-react';
import { UserProfile as UserProfileType, ClaimedVoucher } from '../types';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useLanguage } from './LanguageContext';

interface UserProfileProps {
  userProfile: UserProfileType;
  onRedeemReward: (rewardId: string, rewardName: string, cost: number) => Promise<{ success: boolean; voucher?: any; error?: string }>;
}

interface BadgeItem {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

export default function UserProfile({ userProfile, onRedeemReward }: UserProfileProps) {
  const { language, t } = useLanguage();
  const userPoints = userProfile?.stats?.points || 0;
  const userBadges = userProfile?.stats?.badges || [];

  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [successVoucher, setSuccessVoucher] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedVoucherForModal, setSelectedVoucherForModal] = useState<ClaimedVoucher | null>(null);
  const [isMarkingUsed, setIsMarkingUsed] = useState(false);
  const [voucherWalletFilter, setVoucherWalletFilter] = useState<'active' | 'used'>('active');

  const [claimingQuestId, setClaimingQuestId] = useState<string | null>(null);

  const handleClaimQuest = async (questId: string, rewardXP: number) => {
    if (!userProfile?.id) return;
    setClaimingQuestId(questId);
    try {
      const userRef = doc(db, 'users', userProfile.id);
      const claimedQuests = userProfile.claimedQuests || [];
      const updatedClaimed = [...claimedQuests, questId];
      const updatedPoints = userPoints + rewardXP;
      
      await updateDoc(userRef, {
        "stats.points": updatedPoints,
        claimedQuests: updatedClaimed
      });
      
      const currentBadges = [...userBadges];
      let badgesUpdated = false;
      if (updatedPoints >= 200 && !currentBadges.includes("Civic Master")) {
        currentBadges.push("Civic Master");
        badgesUpdated = true;
      }
      if (updatedPoints >= 350 && !currentBadges.includes("Super Guard")) {
        currentBadges.push("Super Guard");
        badgesUpdated = true;
      }

      if (badgesUpdated) {
        await updateDoc(userRef, {
          "stats.badges": currentBadges
        });
      }
    } catch (err) {
      console.error("Failed to claim quest reward:", err);
    } finally {
      setClaimingQuestId(null);
    }
  };

  const AVAILABLE_REWARDS = [
    {
      id: "transit-pass",
      name: t('reward_transit_pass_name', "1-Day Municipal Metro Pass"),
      description: t('reward_transit_pass_desc', "Complimentary 24-hour unlimited pass across municipal metro rail corridors."),
      cost: 120,
      sponsor: t('ntrc_transit', "NTRC (National Transit)"),
      icon: <Ticket className="w-5 h-5" />
    },
    {
      id: "garden-kit",
      name: t('reward_garden_kit_name', "Urban Green Garden Kit"),
      description: t('reward_garden_kit_desc', "Claim an eco-friendly community planter kit containing premium soil and seasonal seeds."),
      cost: 180,
      sponsor: t('ghmc_parks', "GHMC Municipal Parks"),
      icon: <Award className="w-5 h-5" />
    },
    {
      id: "swimming-ticket",
      name: t('reward_swimming_ticket_name', "Public Pool Entrance Pass"),
      description: t('reward_swimming_ticket_desc', "Single-day complimentary guest entry ticket for any GMHC local sports complex swimming facility."),
      cost: 80,
      sponsor: t('ghmc_sports', "GHMC Sports Authority"),
      icon: <Zap className="w-5 h-5" />
    },
    {
      id: "coffee-coupon",
      name: t('reward_coffee_coupon_name', "Neighborhood Coffee Coupon"),
      description: t('reward_coffee_coupon_desc', "Get a free warm brewed coffee or tea at participating city-ward cooperative cafes."),
      cost: 60,
      sponsor: t('local_coops', "Local Ward Cooperatives"),
      icon: <Heart className="w-5 h-5" />
    },
    {
      id: "parking-voucher",
      name: t('reward_parking_voucher_name', "Municipal Parking 2hr Voucher"),
      description: t('reward_parking_voucher_desc', "Waive fees for up to 2 hours at any official smart-parking terminal grid in Secunderabad or Banjara."),
      cost: 100,
      sponsor: t('smartparking_hyd', "SmartParking Hyd"),
      icon: <Landmark className="w-5 h-5" />
    }
  ];

  const handleRedeem = async (rewardId: string, rewardName: string, cost: number) => {
    setRedeemingId(rewardId);
    setRedeemError(null);
    setSuccessVoucher(null);
    try {
      const res = await onRedeemReward(rewardId, rewardName, cost);
      if (res.success) {
        setSuccessVoucher(res.voucher);
      } else {
        setRedeemError(res.error || "Failed to redeem reward.");
      }
    } catch (err: any) {
      setRedeemError(err.message || "An unexpected error occurred during redemption.");
    } finally {
      setRedeemingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleMarkVoucherUsed = async (voucherId: string) => {
    if (!userProfile?.id) return;
    setIsMarkingUsed(true);
    try {
      const updatedVouchers = (userProfile.claimedVouchers || []).map(vch => {
        if (vch.id === voucherId) {
          return { ...vch, status: 'used' as const };
        }
        return vch;
      });

      const userRef = doc(db, 'users', userProfile.id);
      await updateDoc(userRef, {
        claimedVouchers: updatedVouchers
      });

      // Update local modal state if open
      if (selectedVoucherForModal && selectedVoucherForModal.id === voucherId) {
        setSelectedVoucherForModal({ ...selectedVoucherForModal, status: 'used' });
      }
    } catch (err) {
      console.error("Error updating voucher status:", err);
    } finally {
      setIsMarkingUsed(false);
    }
  };
  // Citizen Badges list
  const BADGES: BadgeItem[] = [
    {
      id: "Detective",
      name: t('badge_detective_name', "Civic Detective"),
      description: t('badge_detective_desc', "Successfully identified high-severity infrastructure hazards."),
      icon: <Flame className="w-5 h-5" />,
      color: "bg-orange-500 text-white"
    },
    {
      id: "Mapper",
      name: t('badge_mapper_name', "Urban Mapper"),
      description: t('badge_mapper_desc', "Reported civic incidents across 3 or more local city wards."),
      icon: <Award className="w-5 h-5" />,
      color: "bg-emerald-500 text-white"
    },
    {
      id: "Helper",
      name: t('badge_helper_name', "Community Helper"),
      description: t('badge_helper_desc', "Provided upvotes or verification checks on 10+ neighbor reports."),
      icon: <Heart className="w-5 h-5" />,
      color: "bg-rose-500 text-white"
    },
    {
      id: "Closer",
      name: t('badge_closer_name', "System Closer"),
      description: t('badge_closer_desc', "Supported and tracked a reported issue all the way to resolution."),
      icon: <Shield className="w-5 h-5" />,
      color: "bg-indigo-500 text-white"
    },
    {
      id: "Founder",
      name: t('badge_founder_name', "Founding Guardian"),
      description: t('badge_founder_desc', "Registered during the official CommunityGuard system launch."),
      icon: <Sparkles className="w-5 h-5" />,
      color: "bg-amber-500 text-white"
    }
  ];

  // Dynamic Level progress calculations
  const level = Math.floor(userPoints / 100) + 1;
  const currentLevelXP = userPoints % 100;
  const xpNeededForNextLevel = 100 - currentLevelXP;

  if (userProfile?.role === 'officer') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Officer Hero Card */}
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {/* Abstract background decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10 pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 relative z-10">
            <div className="flex items-center space-x-4">
              <img
                src={userProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.email}`}
                alt={userProfile.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl border-2 border-white/20 object-cover shadow-md"
              />
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">{userProfile.name || 'Municipal Officer'}</h2>
                <p className="text-xs text-indigo-100 font-mono mt-0.5">{userProfile.email}</p>
                <div className="flex space-x-2 mt-2">
                  <span className="bg-indigo-950/40 text-indigo-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/10 uppercase font-mono">
                    MUNICIPAL OFFICER
                  </span>
                  <span className="bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono">
                    {userProfile.department || 'General Duty'}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4 min-w-[200px] text-right font-mono">
              <span className="text-[10px] font-black text-indigo-200 block uppercase tracking-widest">ASSIGNED CITY</span>
              <span className="text-xl font-black text-white mt-0.5 block">{userProfile.assignedCity || 'New Delhi'}</span>
            </div>
          </div>
        </div>

        {/* Officer Performance Ledger & Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 tracking-wider font-mono uppercase">SLA COMPLIANCE</span>
            <p className="text-3xl font-black text-indigo-600 font-mono">98.4%</p>
            <p className="text-[10px] text-slate-500 mt-1">SLA compliant resolutions within target limits.</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 tracking-wider font-mono uppercase">AVG RESOLUTION SPEED</span>
            <p className="text-3xl font-black text-indigo-600 font-mono">24.5h</p>
            <p className="text-[10px] text-slate-500 mt-1">Average time elapsed from dispatch to resolution seal.</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 tracking-wider font-mono uppercase">CITIZEN TRUST RATING</span>
            <p className="text-3xl font-black text-amber-500 font-mono">★ 4.9 <span className="text-xs text-slate-400 font-normal">/ 5</span></p>
            <p className="text-[10px] text-slate-500 mt-1">Audited feedback score from citizen upvotes.</p>
          </div>
        </div>

        {/* Duties & Security Protocol Guidelines */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <h3 className="text-sm font-black tracking-tight flex items-center space-x-2">
              <Shield className="w-5 h-5 text-indigo-400" />
              <span>Official Duties & Municipal Codes</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-sans">Please review standard operational duties assigned to the {userProfile.department || 'municipal'} squad.</p>
          </div>

          <div className="space-y-3 pt-2 text-xs leading-relaxed text-slate-300 font-mono">
            <div className="flex items-start space-x-2">
              <span className="text-amber-400 shrink-0 mt-0.5">•</span>
              <p><strong>SLA Enforcement:</strong> Prioritize high and critical severity alerts. Any pothole or power issue must be verified on-site within 24 hours.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-amber-400 shrink-0 mt-0.5">•</span>
              <p><strong>Photo Evidence:</strong> When changing status to "Resolved", upload clear visual proof of the site resolution for citizen audit.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-amber-400 shrink-0 mt-0.5">•</span>
              <p><strong>GuardBot Co-Pilot:</strong> Use the floating GuardBot AI assistant in the lower right corner. GuardBot can guide you through department specific SLAs and protocols in real time.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (userProfile?.role === 'admin') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Admin Hero Card */}
        <div className="bg-gradient-to-r from-rose-700 to-rose-900 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
          {/* Abstract background decorative blobs */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10 pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 relative z-10">
            <div className="flex items-center space-x-4">
              <img
                src={userProfile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userProfile.email}`}
                alt={userProfile.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl border-2 border-white/20 object-cover shadow-md"
              />
              <div>
                <h2 className="text-lg font-extrabold tracking-tight">{userProfile.name || 'System Admin'}</h2>
                <p className="text-xs text-rose-100 font-mono mt-0.5">{userProfile.email}</p>
                <div className="flex space-x-2 mt-2">
                  <span className="bg-rose-950/40 text-rose-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/10 uppercase font-mono">
                    SYSTEM ADMINISTRATOR
                  </span>
                  <span className="bg-amber-400 text-slate-900 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase font-mono">
                    Full Authority
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white/10 border border-white/10 rounded-2xl p-4 min-w-[200px] text-right font-mono">
              <span className="text-[10px] font-black text-rose-200 block uppercase tracking-widest">FIREBASE INSTANCE</span>
              <span className="text-xs font-black text-white mt-1.5 block truncate text-[10px] uppercase">ACTIVE & SECURE</span>
            </div>
          </div>
        </div>

        {/* Admin Operations Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 tracking-wider font-mono uppercase">SECURITY GATEWAY</span>
            <p className="text-3xl font-black text-rose-600 font-mono">ENABLED</p>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Google OAuth restricted solely to Citizens. Officers are provisioned manually.</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 tracking-wider font-mono uppercase">FIRESTORE SECURITY</span>
            <p className="text-3xl font-black text-rose-600 font-mono">DEPLOYED</p>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">Strict rules enforced on `/users` and `/system_config` updates.</p>
          </div>
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <span className="text-[10px] font-black text-slate-400 tracking-wider font-mono uppercase">CO-PILOT CALIBRATION</span>
            <p className="text-3xl font-black text-amber-500 font-mono">CONNECTED</p>
            <p className="text-[10px] text-slate-500 mt-1 font-sans">GuardBot chatbot calibrated with central municipal context models.</p>
          </div>
        </div>

        {/* Admin Guidelines / Protocol */}
        <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <h3 className="text-sm font-black tracking-tight flex items-center space-x-2">
              <Shield className="w-5 h-5 text-rose-400" />
              <span>Administrative Controls & Governance</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 font-sans font-normal">Review system rules and parameters for maintaining community safety.</p>
          </div>

          <div className="space-y-3 pt-2 text-xs leading-relaxed text-slate-300 font-mono">
            <div className="flex items-start space-x-2">
              <span className="text-amber-400 shrink-0 mt-0.5">•</span>
              <p><strong>Officer Registrations:</strong> Use the dedicated Admin Tab on the central dashboard to provision credentials. Registrations automatically map correct operational permissions.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-amber-400 shrink-0 mt-0.5">•</span>
              <p><strong>System Parameters:</strong> Real-time toggle limits for Emergency Monsoon Protocols and Double XP campaigns can be adjusted in the admin panel to shift citizen reporting dynamics.</p>
            </div>
            <div className="flex items-start space-x-2">
              <span className="text-amber-400 shrink-0 mt-0.5">•</span>
              <p><strong>Audit Controls:</strong> Access and review dispute logs on citizen-resolved updates. Flagged resolves are subject to database audits.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Level and Progression Summary Card */}
      <div className="bg-gradient-to-r from-emerald-600 to-emerald-800 text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
        {/* Abstract background decorative blobs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-10 -mb-10 pointer-events-none" />

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 relative z-10">
          <div className="flex items-center space-x-4">
            {userProfile?.avatar ? (
              <img
                src={userProfile.avatar}
                alt={userProfile.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-2xl border-2 border-white/20 object-cover shadow-md"
              />
            ) : (
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center flex flex-col justify-center items-center">
                <span className="text-[10px] font-bold text-emerald-100 font-mono tracking-widest block">LEVEL</span>
                <span className="text-3xl font-black text-white font-mono mt-0.5">{level}</span>
              </div>
            )}
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">{userProfile?.name || 'Citizen'}</h2>
              <p className="text-xs text-emerald-100 font-mono mt-0.5">{userProfile?.email}</p>
              <div className="flex space-x-2 mt-2">
                <span className="bg-emerald-950/40 text-emerald-100 px-2.5 py-0.5 rounded-full text-[10px] font-bold border border-white/10 uppercase">
                  {userProfile?.role || 'CITIZEN'}
                </span>
                <span className="bg-amber-400 text-emerald-950 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold">
                  {userPoints} TOTAL XP
                </span>
              </div>
            </div>
          </div>

          <div className="w-full md:w-60 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold font-mono">
              <span className="text-emerald-100">Level {level} Progress</span>
              <span>{userPoints % 100}/100 XP</span>
            </div>
            {/* Custom high-contrast progress bar */}
            <div className="w-full bg-emerald-950/50 rounded-full h-3 border border-white/10 overflow-hidden">
              <div
                style={{ width: `${userPoints % 100}%` }}
                className="bg-amber-400 h-full rounded-full transition-all duration-500"
              />
            </div>
            <p className="text-[9px] text-emerald-100/80 font-mono text-right font-semibold">
              {xpNeededForNextLevel} XP needed for Level {level + 1}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Badges (Left) & Impact Calculator Summary (Right) */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Badges Container - 7 cols */}
        <div className="md:col-span-7 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Award className="w-5 h-5 text-emerald-600" />
              <span>{t('my_achievement_badges', 'My Achievement Badges')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t('badge_collect_desc', 'Collect points by filing valid reports and upvoting critical neighborhood hazards.')}</p>
          </div>

          <div className="space-y-3 pt-2">
            {BADGES.map((badge) => {
              const hasBadge = userBadges.includes(badge.id);

              return (
                <div
                  key={badge.id}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    hasBadge
                      ? 'bg-slate-50/50 border-slate-200'
                      : 'bg-white border-slate-150 opacity-40'
                  }`}
                >
                  <div className="flex items-center space-x-3.5">
                    <div className={`p-2.5 rounded-xl ${badge.color} shadow-sm flex items-center justify-center`}>
                      {badge.icon}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-950">{badge.name}</h4>
                      <p className="text-[10px] text-slate-500 leading-normal mt-0.5">{badge.description}</p>
                    </div>
                  </div>
                  <div>
                    {hasBadge ? (
                      <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-3 py-1 rounded-full border border-emerald-100 font-mono">
                        {t('earned', 'EARNED')}
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-400 text-[10px] font-bold px-3 py-1 rounded-full font-mono">
                        {t('locked', 'LOCKED')}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Impact Calculator summary - 5 cols */}
        <div className="md:col-span-5 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <Zap className="w-4.5 h-4.5 text-amber-500 fill-amber-500" />
                <span>{t('my_community_impact_report', 'My Community Impact Report')}</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{t('impact_report_desc', 'Estimated societal and financial benefits driven by your actions.')}</p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="bg-emerald-50/40 p-3 rounded-2xl border border-emerald-500/10 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 font-mono block">{t('commuters_safed', 'COMMUTERS SAFED')}</span>
                  <span className="text-sm font-bold text-emerald-800">{t('commuters_safed_val', '~7,400 daily')}</span>
                </div>
                <TrendingUp className="w-5 h-5 text-emerald-600" />
              </div>

              <div className="bg-orange-50/40 p-3 rounded-2xl border border-orange-500/10 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 font-mono block">{t('accidents_prevented', 'ACCIDENTS PREVENTED')}</span>
                  <span className="text-sm font-bold text-orange-800">{t('accidents_prevented_val', '4-5 incidents')}</span>
                </div>
                <Flame className="w-5 h-5 text-orange-500" />
              </div>

              <div className="bg-blue-50/40 p-3 rounded-2xl border border-blue-500/10 flex items-center justify-between">
                <div>
                  <span className="text-[9px] text-slate-500 font-mono block">{t('est_vehicle_repair_savings', 'ESTIMATED VEHICLE REPAIR SAVINGS')}</span>
                  <span className="text-sm font-bold text-blue-800">{t('est_vehicle_repair_savings_val', '~$2,400+ saved')}</span>
                </div>
                <Landmark className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <p className="text-[10px] text-slate-400 leading-relaxed font-sans font-medium">
              "{userProfile?.name?.split(' ')[0] || 'Citizen'}, {t('by_documenting_road_hazards_desc', 'by documenting road and utility hazards, your actions directly prevent dangerous maneuvers and secure active transit pathways.')}"
            </p>
            <p className="text-[9px] text-emerald-600 font-bold font-mono uppercase mt-2">
              {t('thank_you_guarding', 'Thank you for guarding your city!')}
            </p>
          </div>
        </div>
      </div>

      {/* SECTION: Citizen Civic Quests & Challenges */}
      <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
        {/* Background visual highlight */}
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        
        <div>
          <h3 className="text-sm font-black tracking-tight flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>{t('active_civic_quests', 'Active Civic Quests & Progression')}</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{t('civic_quests_desc', 'Complete real-world neighborhood objectives to level up and unlock exclusive premium vouchers.')}</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Quest 1 */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">{t('quest_sentinel_title', 'CIVIC SENTINEL')}</span>
                <span className="text-[9px] font-mono font-bold text-amber-400">+50 XP</span>
              </div>
              <h4 className="text-xs font-bold text-white mt-2">{t('quest_alert_sentinel', 'The Alert Sentinel')}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('quest_sentinel_desc', 'Report at least 3 hazard incidents to flag city problems.')}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>{t('progress', 'Progress')}</span>
                <span>{Math.min(userProfile.stats?.issuesReported || 0, 3)} / 3</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(((userProfile.stats?.issuesReported || 0) / 3) * 100, 100)}%` }}
                />
              </div>

              {userProfile.claimedQuests?.includes('sentinel') ? (
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-black py-1.5 px-2.5 rounded-xl text-center w-full mt-2 flex items-center justify-center space-x-1 uppercase">
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('claimed', 'Claimed')} +50 XP</span>
                </div>
              ) : (userProfile.stats?.issuesReported || 0) >= 3 ? (
                <button
                  onClick={() => handleClaimQuest('sentinel', 50)}
                  disabled={claimingQuestId !== null}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-[9px] font-black font-mono py-1.5 px-2.5 rounded-xl w-full mt-2 cursor-pointer shadow-md flex items-center justify-center space-x-1 transition-all uppercase animate-pulse"
                >
                  {claimingQuestId === 'sentinel' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{t('claim', 'Claim')} +50 XP</span>
                  )}
                </button>
              ) : (
                <div className="bg-slate-850 text-slate-500 text-[9px] font-mono font-bold py-1.5 px-2.5 rounded-xl text-center w-full mt-2 uppercase border border-slate-800/40">
                  {t('in_progress', 'In Progress')}
                </div>
              )}
            </div>
          </div>

          {/* Quest 2 */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">{t('quest_resolver_title', 'RESOLVER')}</span>
                <span className="text-[9px] font-mono font-bold text-amber-400">+75 XP</span>
              </div>
              <h4 className="text-xs font-bold text-white mt-2">{t('quest_quality_auditor', 'Quality Auditor')}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('quest_resolver_desc', 'Verify or audit at least 1 resolved issue on the showcase feed.')}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>{t('progress', 'Progress')}</span>
                <span>{Math.min(userProfile.stats?.verifications || 0, 1)} / 1</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-amber-400 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min(((userProfile.stats?.verifications || 0) / 1) * 100, 100)}%` }}
                />
              </div>

              {userProfile.claimedQuests?.includes('auditor') ? (
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-black py-1.5 px-2.5 rounded-xl text-center w-full mt-2 flex items-center justify-center space-x-1 uppercase">
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('claimed', 'Claimed')} +75 XP</span>
                </div>
              ) : (userProfile.stats?.verifications || 0) >= 1 ? (
                <button
                  onClick={() => handleClaimQuest('auditor', 75)}
                  disabled={claimingQuestId !== null}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-[9px] font-black font-mono py-1.5 px-2.5 rounded-xl w-full mt-2 cursor-pointer shadow-md flex items-center justify-center space-x-1 transition-all uppercase animate-pulse"
                >
                  {claimingQuestId === 'auditor' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{t('claim', 'Claim')} +75 XP</span>
                  )}
                </button>
              ) : (
                <div className="bg-slate-850 text-slate-500 text-[9px] font-mono font-bold py-1.5 px-2.5 rounded-xl text-center w-full mt-2 uppercase border border-slate-800/40">
                  {t('in_progress', 'In Progress')}
                </div>
              )}
            </div>
          </div>

          {/* Quest 3 */}
          <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700/50 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">{t('quest_pioneer_title', 'PIONEER')}</span>
                <span className="text-[9px] font-mono font-bold text-amber-400">+100 XP</span>
              </div>
              <h4 className="text-xs font-bold text-white mt-2">{t('quest_civic_master', 'Civic Master')}</h4>
              <p className="text-[10px] text-slate-400 mt-0.5">{t('quest_pioneer_desc', 'Attain a lifetime score of 200 XP from active contributions.')}</p>
            </div>
            
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] font-mono text-slate-400">
                <span>{t('progress', 'Progress')}</span>
                <span>{Math.min(userPoints, 200)} / 200</span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${Math.min((userPoints / 200) * 100, 100)}%` }}
                />
              </div>

              {userProfile.claimedQuests?.includes('master') ? (
                <div className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-mono font-black py-1.5 px-2.5 rounded-xl text-center w-full mt-2 flex items-center justify-center space-x-1 uppercase">
                  <Check className="w-3.5 h-3.5" />
                  <span>{t('claimed', 'Claimed')} +100 XP</span>
                </div>
              ) : userPoints >= 200 ? (
                <button
                  onClick={() => handleClaimQuest('master', 100)}
                  disabled={claimingQuestId !== null}
                  className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 text-[9px] font-black font-mono py-1.5 px-2.5 rounded-xl w-full mt-2 cursor-pointer shadow-md flex items-center justify-center space-x-1 transition-all uppercase animate-pulse"
                >
                  {claimingQuestId === 'master' ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <span>{t('claim', 'Claim')} +100 XP</span>
                  )}
                </button>
              ) : (
                <div className="bg-slate-850 text-slate-500 text-[9px] font-mono font-bold py-1.5 px-2.5 rounded-xl text-center w-full mt-2 uppercase border border-slate-800/40">
                  {t('in_progress', 'In Progress')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* SECTION: Civic Rewards Ledger & Redemption Store */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center space-x-2">
              <Ticket className="w-5 h-5 text-emerald-600 animate-pulse" />
              <span>{t('municipal_civic_rewards_store', 'Municipal Civic Rewards Store')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{t('spend_xp_desc', 'Spend your earned Civic XP credits on real-world municipal goods and urban vouchers.')}</p>
          </div>
          <div className="mt-3 sm:mt-0 bg-emerald-50 text-emerald-800 font-mono text-xs px-3 py-1.5 rounded-xl border border-emerald-100 font-bold self-start">
            Wallet Balance: <span className="text-emerald-700 font-black">{userPoints} XP</span>
          </div>
        </div>

        {/* Modal-style Success / Error Messages */}
        {successVoucher && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-start space-x-3 text-xs text-emerald-800">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-emerald-950">Voucher Issued Successfully!</p>
              <p className="mt-0.5 text-emerald-800">You successfully redeemed <strong>{successVoucher.rewardName}</strong> for <strong>{successVoucher.cost} XP</strong>.</p>
              <div className="mt-2.5 bg-white border border-emerald-100 p-3 rounded-xl flex items-center justify-between max-w-sm">
                <div>
                  <span className="text-[8px] text-slate-400 font-mono uppercase block">VOUCHER CODE</span>
                  <span className="font-mono text-xs font-black text-slate-800">{successVoucher.voucherCode}</span>
                </div>
                <button
                  onClick={() => copyToClipboard(successVoucher.voucherCode, successVoucher.id)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                >
                  {copiedId === successVoucher.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <button 
                onClick={() => setSuccessVoucher(null)}
                className="mt-3 text-emerald-700 font-bold font-mono hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {redeemError && (
          <div className="bg-rose-50 border border-rose-200 p-4 rounded-2xl flex items-start space-x-3 text-xs text-rose-800">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-extrabold text-rose-950">Redemption Failed</p>
              <p className="mt-0.5">{redeemError}</p>
              <button 
                onClick={() => setRedeemError(null)}
                className="mt-2 text-rose-700 font-bold font-mono hover:underline"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Grid of available rewards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_REWARDS.map((reward) => {
            const isAffordable = userPoints >= reward.cost;
            const isRedeeming = redeemingId === reward.id;

            return (
              <div 
                key={reward.id} 
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between h-48 ${
                  isAffordable 
                    ? 'bg-slate-50/50 border-slate-200/80 hover:border-slate-300 hover:bg-slate-50' 
                    : 'bg-white border-slate-150 opacity-65'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div className="bg-emerald-50 text-emerald-750 p-2 rounded-xl">
                      {reward.icon}
                    </div>
                    <span className="bg-amber-100 text-amber-900 border border-amber-200 font-mono text-[9px] font-bold px-2 py-0.5 rounded-lg">
                      {reward.cost} XP
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2.5">{reward.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">{reward.description}</p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-2">
                  <span className="text-[8px] text-slate-400 font-mono truncate max-w-[120px] uppercase">🏛️ {reward.sponsor}</span>
                  <button
                    disabled={!isAffordable || isRedeeming}
                    onClick={() => handleRedeem(reward.id, reward.name, reward.cost)}
                    className={`px-3 py-1.5 rounded-xl text-[10px] font-black font-mono flex items-center space-x-1 cursor-pointer transition-all ${
                      isAffordable
                        ? 'bg-emerald-600 text-white hover:bg-emerald-700 hover:shadow-sm'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    {isRedeeming ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>CLAIMING...</span>
                      </>
                    ) : (
                      <span>CLAIM VOUCHER</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Claimed vouchers ledger history (Feature 3) */}
        <div className="border-t border-slate-100 pt-5 mt-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
            <div>
              <h4 className="text-xs font-black text-slate-900 tracking-tight flex items-center space-x-1.5">
                <QrCode className="w-4 h-4 text-slate-600 animate-pulse" />
                <span>{t('my_claimed_digital_wallet', 'My Claimed Digital Wallet')}</span>
              </h4>
              <p className="text-[10px] text-slate-400 font-sans mt-0.5">{t('wallet_desc', 'Click any active voucher to view its full redeemable terminal pass and barcode.')}</p>
            </div>
            
            {/* Filter buttons */}
            <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200/40 self-start">
              <button
                onClick={() => setVoucherWalletFilter('active')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  voucherWalletFilter === 'active'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('active_passes', 'Active passes')}
              </button>
              <button
                onClick={() => setVoucherWalletFilter('used')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  voucherWalletFilter === 'used'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {t('used_history', 'Used history')}
              </button>
            </div>
          </div>

          {userProfile.claimedVouchers && userProfile.claimedVouchers.length > 0 ? (
            (() => {
              const filtered = userProfile.claimedVouchers.filter(vch => {
                const stat = vch.status || 'active';
                return stat === voucherWalletFilter;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <p className="text-[10px] text-slate-400">
                      {t('no_vouchers_found_filtered', 'No {filter} vouchers found in your digital wallet.').replace('{filter}', t(voucherWalletFilter, voucherWalletFilter))}
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {filtered.map((vch) => {
                    const isActive = (vch.status || 'active') === 'active';
                    return (
                      <div 
                        key={vch.id} 
                        onClick={() => setSelectedVoucherForModal(vch)}
                        className={`p-4 rounded-2xl border flex items-center justify-between relative overflow-hidden group hover:shadow-xs transition-all cursor-pointer ${
                          isActive 
                            ? 'bg-white border-slate-200 hover:bg-slate-50/50' 
                            : 'bg-slate-50 border-slate-150 opacity-60'
                        }`}
                      >
                        {/* Miniature ticket punch-out notch */}
                        <div className="absolute top-1/2 -translate-y-1/2 -left-2.5 w-5 h-5 bg-white border-r border-slate-200 rounded-full z-10" />
                        <div className="absolute top-1/2 -translate-y-1/2 -right-2.5 w-5 h-5 bg-white border-l border-slate-200 rounded-full z-10" />

                        <div className="pl-3.5 space-y-1 pr-2 min-w-0 flex-1">
                          <span className={`text-[8px] border font-mono px-1.5 py-0.5 rounded font-black uppercase tracking-wider ${
                            isActive 
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                              : 'bg-slate-100 text-slate-500 border-slate-200'
                          }`}>
                            {t(vch.status || 'active', vch.status || 'active')}
                          </span>
                          <h5 className="text-xs font-bold text-slate-950 mt-1.5 truncate group-hover:text-emerald-700 transition-colors">{vch.rewardName}</h5>
                          <p className="text-[9px] text-slate-400 font-mono">
                            {t('redeemed_date', 'Redeemed')}: {new Date(vch.redeemedAt).toLocaleDateString()}
                          </p>
                          <div className="flex items-center space-x-1 mt-1 font-mono text-[9px] text-slate-500">
                            <span>{t('voucher_code_label', 'Code')}:</span>
                            <span className="font-bold text-slate-700">{vch.voucherCode}</span>
                          </div>
                        </div>

                        <div className="bg-slate-50 p-2 rounded-xl border border-slate-200 shadow-2xs mr-3 flex items-center justify-center shrink-0 group-hover:bg-emerald-50/50 group-hover:border-emerald-200 transition-all">
                          <QrCode className={`w-8 h-8 ${isActive ? 'text-slate-800' : 'text-slate-400'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()
          ) : (
            <div className="text-center py-6 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
              <p className="text-[10px] text-slate-400">{t('no_active_claimed_vouchers', 'No active claimed vouchers. Accumulate XP points to unlock local city benefits!')}</p>
            </div>
          )}
        </div>
      </div>

      {/* TICKET DETAILS MODAL FOR SECURE TERMINAL VERIFICATION */}
      {selectedVoucherForModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100 relative flex flex-col">
            
            {/* Header branding */}
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white p-5 text-center relative">
              <button 
                onClick={() => setSelectedVoucherForModal(null)}
                className="absolute top-4 right-4 bg-emerald-800/40 hover:bg-emerald-800/70 text-white w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs font-black cursor-pointer"
              >
                ✕
              </button>
              <span className="text-[8px] font-mono font-black tracking-widest bg-emerald-950/30 px-2.5 py-1 rounded-full border border-white/10 uppercase">
                NATIONAL INFRASTRUCTURE PASS
              </span>
              <h3 className="text-sm font-black mt-2 tracking-tight">Municipal Terminal Ticket</h3>
            </div>

            {/* Ticket body with classic notches */}
            <div className="p-6 space-y-6 relative bg-slate-50/50">
              {/* Tear-off Ticket Side Notches */}
              <div className="absolute top-0 -left-3 w-6 h-6 bg-slate-950/80 rounded-full" />
              <div className="absolute top-0 -right-3 w-6 h-6 bg-slate-950/80 rounded-full" />

              <div className="text-center space-y-1.5 pt-2">
                <span className={`inline-block text-[8px] font-mono px-2 py-0.5 rounded font-black border uppercase tracking-wider ${
                  (selectedVoucherForModal.status || 'active') === 'active'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-100 animate-pulse'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}>
                  {selectedVoucherForModal.status || 'active'} PASS
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 tracking-tight leading-snug">
                  {selectedVoucherForModal.rewardName}
                </h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  Issued: {new Date(selectedVoucherForModal.redeemedAt).toLocaleString()}
                </p>
              </div>

              {/* Dotted separation line */}
              <div className="border-t-2 border-dashed border-slate-250/80 my-4 relative">
                <div className="absolute -top-1.5 -left-8 w-3 h-3 bg-white rounded-full border border-slate-200" />
                <div className="absolute -top-1.5 -right-8 w-3 h-3 bg-white rounded-full border border-slate-200" />
              </div>

              {/* Simulated terminal Barcode / QR Section */}
              <div className="flex flex-col items-center justify-center bg-white border border-slate-200/80 p-5 rounded-2xl shadow-inner relative overflow-hidden group">
                
                {/* Laser scan line effect */}
                {(selectedVoucherForModal.status || 'active') === 'active' && (
                  <div className="absolute left-0 right-0 h-0.5 bg-rose-500/80 shadow-lg shadow-rose-500/80 animate-bounce" style={{ top: '35%', animationDuration: '3.5s' }} />
                )}

                <QrCode className={`w-28 h-28 ${ (selectedVoucherForModal.status || 'active') === 'active' ? 'text-slate-900' : 'text-slate-300'}`} />
                
                {/* High fidelity simulated digital barcode bars (Feature 3) */}
                <div className="w-full flex justify-between h-8 mt-4 items-end px-4">
                  {[1, 3, 1, 2, 4, 1, 3, 2, 1, 4, 1, 2, 1, 3, 1, 2, 4, 1, 2, 3].map((w, i) => (
                    <div 
                      key={i} 
                      style={{ width: `${w * 1.5}px` }} 
                      className={`h-full ${ (selectedVoucherForModal.status || 'active') === 'active' ? 'bg-slate-900' : 'bg-slate-300'}`} 
                    />
                  ))}
                </div>

                <span className="font-mono text-[10px] font-black text-slate-700 mt-2 tracking-widest uppercase">
                  {selectedVoucherForModal.voucherCode}
                </span>
              </div>

              {/* Secure action options */}
              <div className="space-y-2.5 pt-2">
                {(selectedVoucherForModal.status || 'active') === 'active' ? (
                  <button
                    disabled={isMarkingUsed}
                    onClick={() => handleMarkVoucherUsed(selectedVoucherForModal.id)}
                    className="w-full bg-slate-900 hover:bg-slate-950 text-white font-extrabold font-mono p-3 rounded-2xl text-[10px] flex items-center justify-center space-x-1.5 shadow-md cursor-pointer transition-all border border-slate-800"
                  >
                    {isMarkingUsed ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>VERIFYING WITH LEADER TERMINAL...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>MARK AS USED AT WARD TERMINAL</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="bg-slate-100 border border-slate-200 text-slate-500 p-3 rounded-2xl flex items-center justify-center space-x-1.5 text-[10px] font-mono font-bold">
                    <Check className="w-4 h-4 text-slate-400" />
                    <span>ALREADY REDEEMED & COMPLETED</span>
                  </div>
                )}

                <button
                  onClick={() => setSelectedVoucherForModal(null)}
                  className="w-full bg-white hover:bg-slate-50 text-slate-500 font-bold p-2.5 rounded-2xl text-[10px] border border-slate-200 cursor-pointer transition-all"
                >
                  Close Wallet Pass
                </button>
              </div>
            </div>

            {/* Disclaimer footer */}
            <div className="bg-slate-100 border-t border-slate-200 px-5 py-3 text-center flex items-center justify-center space-x-1 text-[8px] text-slate-400 font-mono uppercase">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Present QR to conductor or kiosk to redeem.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
