import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Sparkles, X, Send, Loader2, RefreshCw, CornerDownRight, ArrowRight, ShieldAlert, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useLanguage } from './LanguageContext';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CivicAssistantProps {
  userProfile?: any;
}

export default function CivicAssistant({ userProfile }: CivicAssistantProps) {
  const { language, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Namaste! I am **GuardBot**, your AI Civic Intelligence Assistant for India. I can inspect the live municipal ledger, query the status of active potholes or pipeline leaks, explain SLAs, and help you find rewards!"
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Dynamic initialization & role-tailored greetings
  useEffect(() => {
    if (userProfile) {
      let roleText = '';
      if (userProfile.role === 'citizen') {
        roleText = t('citizen', 'citizen');
      } else if (userProfile.role === 'officer') {
        roleText = t('officer', 'officer');
      } else {
        roleText = t('admin', 'admin');
      }

      let greetPrefix = '';
      if (language === 'hi') {
        greetPrefix = `नमस्ते, **${userProfile.name}**! मैं **गार्डबॉट** हूँ, आपका व्यक्तिगत एआई नागरिक सहायक। चूंकि आपने **${roleText}** के रूप में लॉग इन किया है, मैं आपकी सहायता कर सकता हूँ:`;
      } else if (language === 'te') {
        greetPrefix = `నమస్తే, **${userProfile.name}**! నేను **గార్డ్‌బాట్**, మీ వ్యక్తిగతీకరించిన AI పౌర సహాయకుడిని. మీరు **${roleText}** గా లాగిన్ అయినందున, నేను మీకు సహాయం చేయగలను:`;
      } else if (language === 'ta') {
        greetPrefix = `வணக்கம், **${userProfile.name}**! நான் **கார்ட்பாட்**, உங்கள் தனிப்பயனாக்கப்பட்ட AI குடிமை உதவியாளர். நீங்கள் **${roleText}** ஆக உள்நுழைந்துள்ளதால், நான் உங்களுக்கு உதவ முடியும்:`;
      } else if (language === 'kn') {
        greetPrefix = `ನಮಸ್ತೆ, **${userProfile.name}**! ನಾನು **ಗಾರ್ಡ್‌ಬಾಟ್**, ನಿಮ್ಮ ವೈಯಕ್ತಿಕಗೊಳಿಸಿದ AI ನಾಗರಿಕ ಸಹಾಯಕ. ನೀವು **${roleText}** ಆಗಿ ಲಾಗ್ ಇನ್ ಆಗಿರುವುದರಿಂದ, ನಾನು ನಿಮಗೆ ಸಹಾಯ ಮಾಡಬಲ್ಲೆ:`;
      } else if (language === 'bn') {
        greetPrefix = `নমস্কার, **${userProfile.name}**! আমি **গার্ডবট**, আপনার ব্যক্তিগতকৃত এআই নাগরিক সহকারী। যেহেতু আপনি **${roleText}** হিসেবে লগ ইন করেছেন, আমি আপনাকে সাহায্য করতে পারি:`;
      } else {
        greetPrefix = `Namaste, **${userProfile.name}**! I am **GuardBot**, your personalized AI Civic Assistant. Since you are logged in as a **${roleText}**, I can help you with:`;
      }

      let bulletContent = '';
      if (userProfile.role === 'citizen') {
        if (language === 'hi') {
          bulletContent = `- अपने **${userProfile.stats?.points || 0} एक्सपी** बैलेंस के साथ प्राप्त होने वाले पुरस्कार ढूंढें।\n- अपने सक्रिय नागरिक खोजों को पूरा करने और डबल एक्सपी अर्जित करने के लिए अनुशंसित कार्य!\n- सक्रिय सड़क खतरों की रिपोर्ट की रीयल-टाइम स्थिति की जांच।`;
        } else if (language === 'te') {
          bulletContent = `- మీ **${userProfile.stats?.points || 0} XP** బ్యాలెన్స్‌తో పొందగల బహుమతులను కనుగొనండి.\n- మీ క్రియాశీల పౌర అన్వేషణలను పూర్తి చేయడానికి మరియు డబుల్ XP సంపాదించడానికి సిఫార్సు చేసిన పనులు!\n- క్రియాశీల వీధి ముప్పు నివేదికల నిజ-సమయ స్థితి తనిఖీ.`;
        } else if (language === 'ta') {
          bulletContent = `- உங்கள் **${userProfile.stats?.points || 0} XP** இருப்பைக் கொண்டு நீங்கள் பெறக்கூடிய வெகுமதிகளைக் கண்டறியவும்.\n- உங்கள் செயலில் உள்ள குடிமைத் தேடல்களை முடித்து இரட்டை XP பெறப் பரிந்துரைக்கப்படும் செயல்கள்!\n- செயலில் உள்ள சாலை ஆபத்து அறிக்கைகளின் நிகழ்நேர நிலை சரிபார்ப்பு.`;
        } else if (language === 'kn') {
          bulletContent = `- ನಿಮ್ಮ **${userProfile.stats?.points || 0} XP** ಬ್ಯಾಲೆನ್ಸ್‌ನೊಂದಿಗೆ ನೀವು ಪಡೆಯಬಹುದಾದ ಬಹುಮಾನಗಳನ್ನು ಹುಡುಕಿ.\n- ನಿಮ್ಮ ಸಕ್ರಿಯ ನಾಗರಿಕ ಅನ್ವೇಷಣೆಗಳನ್ನು ಪೂರ್ಣಗೊಳಿಸಲು ಮತ್ತು ಡಬಲ್ XP ಗಳಿಸಲು ಶಿಫಾರಸು ಮಾಡಿದ ಕ್ರಮಗಳು!\n- ಸಕ್ರಿಯ ರಸ್ತೆ ಅಪಾಯದ ವರದಿಗಳ ನೈಜ-ಸಮಯದ ಸ್ಥಿತಿ ಪರಿಶೀಲನೆ.`;
        } else if (language === 'bn') {
          bulletContent = `- আপনার **${userProfile.stats?.points || 0} এক্সপি** ব্যালেন্স দিয়ে কী কী পুরস্কার দাবি করতে পারেন তা খুঁজুন।\n- ডবল এক্সপি উপার্জন করতে আপনার সক্রিয় নাগরিক কোয়েস্টগুলি সম্পূর্ণ করার জন্য প্রস্তাবিত পদক্ষেপ!\n- সক্রিয় রাস্তার বিপদের রিপোর্টের রিয়েল-টাইম স্ট্যাটাস পরীক্ষা।`;
        } else {
          bulletContent = `- Finding rewards you can claim with your **${userProfile.stats?.points || 0} XP** balance.
- Recommending actions to complete your active civic quests and earn double XP!
- Real-time status checks of active street hazard reports.`;
        }
      } else if (userProfile.role === 'officer') {
        const dept = userProfile.department || 'assigned';
        if (language === 'hi') {
          bulletContent = `- **${dept}** विभाग के लिए एसएलए प्रतिक्रिया प्राथमिकताओं पर आपका मार्गदर्शन करना।\n- मानक नगर निगम प्रोटोकॉल (SMP-VOL1 से Vol4) का अवलोकन।\n- पूर्ण किए गए सड़क मरम्मत कार्य के लॉग विवरणों को दर्ज करने का तरीका समझाना।`;
        } else if (language === 'te') {
          bulletContent = `- **${dept}** విభాగం కోసం SLA ప్రతిస్పందన ప్రాధాన్యతలపై మీకు మార్గదర్శకత్వం అందించడం.\n- ప్రామాణిక మునిసిపల్ ప్రోటోకాల్స్ (SMP-VOL1 నుండి Vol4) వివరించడం.\n- రోడ్డు మరమ్మతు పూర్తి వివరాలను లాగ్ చేసే విధానాన్ని చూపించడం.`;
        } else if (language === 'ta') {
          bulletContent = `- **${dept}** துறைக்கான SLA பதில் முன்னுரிமைகள் குறித்து உங்களுக்கு வழிகாட்டுதல்.\n- நிலையான நகராட்சி நெறிமுறைகளின் (SMP-VOL1 முதல் Vol4 வரை) கண்ணோட்டம்.\n- சாலை பழுதுபார்ப்புப் பணிகளைப் பதிவு செய்யும் முறை.`;
        } else if (language === 'kn') {
          bulletContent = `- **${dept}** ಇಲಾಖೆಗೆ ಎಸ್‌ಎಲ್‌ಎ ಆದ್ಯತೆಗಳ ಕುರಿತು ನಿಮಗೆ ಮಾರ್ಗದರ್ಶನ ನೀಡುವುದು.\n- ಪ್ರಮಾಣಿತ ಮುನ್ಸಿಪಲ್ ಪ್ರೋಟೋಕಾಲ್‌ಗಳ (SMP-VOL1 ರಿಂದ Vol4) ಅವಲೋಕನ.\n- ಪೂರ್ಣಗೊಂಡ ರಸ್ತೆ ದುರಸ್ತಿ ವಿವರಗಳನ್ನು ಲಾಗ್ ಮಾಡುವುದು ಹೇಗೆ ಎಂಬುದನ್ನು ತಿಳಿಸುವುದು.`;
        } else if (language === 'bn') {
          bulletContent = `- **${dept}** বিভাগের জন্য এসএলএ প্রতিক্রিয়া অগ্রাধিকারগুলি নির্দেশ করা।\n- স্ট্যান্ডার্ড মিউনিসিপ্যাল প্রোটোকল (SMP-VOL1 থেকে Vol4) পর্যালোচনা।\n- সম্পূর্ণ রাস্তার মেরামত কিভাবে লগ ইন করবেন তা দেখানো।`;
        } else {
          bulletContent = `- Guiding you on SLA response priorities for the **${dept}** department.
- Overviewing standard municipal protocols (SMP-VOL1 to Vol4).
- Walking through how to submit status resolution log updates.`;
        }
      } else {
        if (language === 'hi') {
          bulletContent = `- सिस्टम-व्यापी मापदंडों और निदान की निगरानी करना।\n- केवल-जीमेल नागरिक पंजीकरण गेटवे नियमों का ऑडिट करना।\n- नए नगर निगम अधिकारियों और चालक दल को पंजीकृत करने के निर्देश देना।`;
        } else if (language === 'te') {
          bulletContent = `- సిస్టమ్-వ్యాప్త పారామితులు మరియు విశ్లేషణలను పర్యవేక్షించడం.\n- జీమెయిల్-మాత్రమే పౌర రిజిస్ట్రేషన్ గేట్‌వే నియమాలను ఆడిట్ చేయడం.\n- కొత్త మునిసిపల్ అధికారులు మరియు సిబ్బందిని నమోదు చేయమని సూచించడం.`;
        } else if (language === 'ta') {
          bulletContent = `- கணினி அளவிலான அளவுರುக்கள் மற்றும் கண்டறிதல்களைக் கண்காணித்தல்.\n- ஜிமெயில் மட்டுமே குடிமக்கள் பதிவு நுழைவாயில் விதிகளைத் தணிக்கை செய்தல்.\n- புதிய நகராட்சி அதிகாரிகள் மற்றும் குழுவினரைப் பதிவு செய்ய வழிகாட்டுதல்.`;
        } else if (language === 'kn') {
          bulletContent = `- ಸಿಸ್ಟಮ್-ವ್ಯಾಪಿ ನಿಯತಾಂಕಗಳು ಮತ್ತು ಡಯಾಗ್ನೋಸ್ಟಿಕ್ಸ್ ಮೇಲ್ವಿಚಾರಣೆ.\n- ಜಿಮೇಲ್-ಮಾತ್ರ ನಾಗರಿಕ ನೋಂದಣಿ ಗೇಟ್‌ವೇ ನಿಯಮಗಳ ಆಡಿಟ್.\n- ಹೊಸ ಮುನ್ಸಿಪಲ್ ಅಧಿಕಾರಿಗಳು ಮತ್ತು ಸಿಬ್ಬಂದಿಯನ್ನು ನೋಂದಾಯಿಸಲು ನಿರ್ದೇಶಿಸುವುದು.`;
        } else if (language === 'bn') {
          bulletContent = `- সিস্টেম-ব্যাপী পরামিতি এবং ডায়াগনস্টিকস পর্যবেক্ষণ।\n- জিমেইল-অনলি নাগরিক নিবন্ধন গেটওয়ে নিয়ম নিরীক্ষা।\n- নতুন পৌর কর্মকর্তা এবং কর্মীদের নিবন্ধন করার নির্দেশ দেওয়া।`;
        } else {
          bulletContent = `- Monitoring system-wide parameters and diagnostics.
- Auditing the Gmail-only citizen registration gateway rules.
- Directing you to register new municipal officers and crew.`;
        }
      }

      setMessages([
        {
          role: 'assistant',
          content: `${greetPrefix}\n\n${bulletContent}`
        }
      ]);
    } else {
      setMessages([
        {
          role: 'assistant',
          content: t('guardbot_greeting_anon', "Namaste! I am **GuardBot**, your AI Civic Intelligence Assistant for India. I can inspect the live municipal ledger, query the status of active potholes or pipeline leaks, explain SLAs, and help you find rewards!")
        }
      ]);
    }
  }, [userProfile, language]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      // API call to our /api/civic-chatbot endpoint, passing userProfile for extreme context awareness and current language selection
      const res = await fetch('/api/civic-chatbot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, userMsg], userProfile, language })
      });

      if (!res.ok) {
        throw new Error("Chatbot API response error");
      }

      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }]);
    } catch (err: any) {
      console.error("Failed to connect to GuardBot:", err);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: t('guardbot_err_conn', "I apologize, I am experiencing temporary connectivity issue syncing with the live Firestore ledger. Please try again in a moment.")
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handlePresetClick = (presetText: string) => {
    handleSendMessage(presetText);
  };

  // Helper to render bold markdown (**text**) and bullet lists elegantly
  const formatMessageText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      // Check if it's a bullet point
      const isBullet = line.trim().startsWith('- ') || line.trim().startsWith('* ');
      let content = isBullet ? line.trim().substring(2) : line;

      // Handle bold text parsing (**text**)
      const parts = content.split('**');
      const formattedParts = parts.map((part, pIdx) => {
        if (pIdx % 2 === 1) {
          return <strong key={pIdx} className="font-extrabold text-slate-900">{part}</strong>;
        }
        return part;
      });

      if (isBullet) {
        return (
          <div key={lIdx} className="flex items-start space-x-1.5 ml-2 mt-1">
            <span className="text-emerald-500 shrink-0 mt-1">•</span>
            <span className="text-slate-700 leading-relaxed text-xs">{formattedParts}</span>
          </div>
        );
      }

      return (
        <p key={lIdx} className="leading-relaxed mt-1 text-xs text-slate-700">
          {formattedParts}
        </p>
      );
    });
  };

  // Dynamic context presets based on active session role
  const getPresets = () => {
    if (userProfile?.role === 'officer') {
      const dept = userProfile.department || 'assigned';
      if (language === 'hi') {
        return [
          { text: `${dept} विभाग के लिए मानक समय-सीमा (SLA) क्या है?`, label: "विभाग SLA समय-सीमा" },
          { text: "मानक नगर निगम प्रोटोकॉल SMP-VOL1 समझाएं", label: "SMP प्रोटोकॉल गाइड" },
          { text: "सड़क मरम्मत कार्य पूरा होने की रिपोर्ट कैसे सबमिट करें?", label: "समाधान कैसे सबमिट करें" },
          { text: "मेरे शहर में सक्रिय सड़क समस्याओं की सूची दिखाएं", label: "सभी सक्रिय मुद्दे" }
        ];
      }
      if (language === 'te') {
        return [
          { text: `${dept} విభాగానికి ప్రామాణిక సేవా గడువు (SLA) ఎంత?`, label: "విభాగం SLA గడువులు" },
          { text: "ప్రామాణిక మునిసిపల్ ప్రోటోకాల్ SMP-VOL1 వివరించండి", label: "SMP ప్రోటోకాల్ గైడ్" },
          { text: "పూర్తయిన రోడ్డు మరమ్మత్తు వివరాలను ఎలా నమోదు చేయాలి?", label: "పరిష్కారం నమోదు విధానం" },
          { text: "నా నగరంలోని క్రియాశీల రోడ్డు సమస్యల జాబితా చూపించు", label: "అన్ని క్రియాశీల సమస్యలు" }
        ];
      }
      return [
        { text: `What is the standard SLA limit for the ${dept} department?`, label: "My Dept SLA Limits" },
        { text: "Explain standard municipal protocol SMP-VOL1", label: "SMP Protocol Guide" },
        { text: "How do I log a completed street repair?", label: "How to Resolve" },
        { text: "Show active hazard reports in my city", label: "All Active Issues" }
      ];
    }
    if (userProfile?.role === 'admin') {
      if (language === 'hi') {
        return [
          { text: "केवल-नागरिक लॉगिन सुरक्षा गेटवे डेटाबेस की सुरक्षा कैसे करता है?", label: "सुरक्षा प्रतिबंध" },
          { text: "वास्तविक समय में किन सिस्टम मापदंडों को अपडेट किया जा सकता है?", label: "लाइव मापदंड कॉन्फ़िगरेशन" },
          { text: "नए नगर निगम अधिकारी को कैसे पंजीकृत करें?", label: "अधिकारी पंजीकरण" },
          { text: "सक्रिय मानसून आपातकालीन अलर्ट की स्थिति क्या है?", label: "मानसून आपातकालीन अलर्ट" }
        ];
      }
      if (language === 'te') {
        return [
          { text: "కేవలం పౌరుల లాగిన్ గేట్‌వే డేటాబేస్ భద్రతను ఎలా కాపాడుతుంది?", label: "భద్రతా పరిమితులు" },
          { text: "రియల్ టైమ్‌లో ఏ సిస్టమ్ పారామితులను అప్‌డేట్ చేయవచ్చు?", label: "లైవ్ పారామితుల కాన్ఫిగరేషన్" },
          { text: "కొత్త మునిసిపల్ అధికారిని ఎలా నమోదు చేయాలి?", label: "అధికారి రిజిస్ట్రేషన్" },
          { text: "క్రియాశీల వర్ష కాల అత్యవసర అలర్ట్‌ల పరిస్థితి ఏమిటి?", label: "వర్ష కాల అలర్ట్‌ల స్థితి" }
        ];
      }
      return [
        { text: "How does the citizen-only sign-in gate protect database security?", label: "Security Restrictions" },
        { text: "What system parameters can be updated in real-time?", label: "Live Parameters Config" },
        { text: "How do I register a new Municipal Officer?", label: "Officer Registration" },
        { text: "What is the status of active Monsoon Emergency alerts?", label: "Monsoon emergency alert status" }
      ];
    }
    // Default/Citizen
    if (language === 'hi') {
      return [
        { text: "मेरे पास कितने पुरस्कार अंक हैं और मैं क्या दावा कर सकता हूँ?", label: "मेरा एक्सपी बटुआ" },
        { text: "पानी की पाइपलाइन रिसाव के लिए मानक एसएलए क्या है?", label: "जल विभाग एसएलए" },
        { text: "सक्रिय नागरिक खोज पुरस्कार कैसे अर्जित करें?", label: "नागरिक खोज गाइड" },
        { text: "सिकंदराबाद में कौन से सक्रिय खतरे दर्ज हैं?", label: "सिकंदराबाद के मुद्दे" }
      ];
    }
    if (language === 'te') {
      return [
        { text: "నా వద్ద ఎన్ని రివార్డ్ పాయింట్లు ఉన్నాయి మరియు నేను దేనికి అర్హుడను?", label: "నా XP వాలెట్ తనిఖీ" },
        { text: "నీటి పైప్‌లైన్ లీకేజీల కోసం ప్రామాణిక సేవా గడువు ఎంత?", label: "నీటి విభాగం SLA" },
        { text: "యాక్టివ్ పౌర అన్వేషణ రివార్డులను ఎలా పొందాలి?", label: "పౌర అన్వేషణ గైడ్" },
        { text: "సికింద్రాబాద్‌లో నమోదైన క్రియాశీల సమస్యలు ఏమిటి?", label: "సికింద్రాబాద్ సమస్యలు" }
      ];
    }
    return [
      { text: "How many reward points do I have and what can I claim?", label: "Check My XP Wallet" },
      { text: "What is the standard SLA for water pipeline leaks?", label: "Water SLAs & Limits" },
      { text: "How do I earn active quest rewards?", label: "Civic Quest Guide" },
      { text: "What active hazards are reported in Secunderabad?", label: "Secunderabad Issues" }
    ];
  };

  const PRESETS = getPresets();

  return (
    <div className="font-sans">
      <AnimatePresence>
        {!isOpen && (
          <div className="fixed bottom-4 right-4 sm:right-6 sm:bottom-6 z-50 pointer-events-none">
            <motion.button
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsOpen(true)}
              className="pointer-events-auto bg-slate-900 hover:bg-slate-800 text-white p-3.5 sm:p-4 rounded-full shadow-2xl flex items-center justify-center space-x-2 cursor-pointer border border-slate-700 relative group"
              id="guardbot-float-btn"
            >
              {/* Ambient pulsing notification dot */}
              <span className="absolute top-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950 animate-ping" />
              <span className="absolute top-0 right-0 w-3 h-3 sm:w-3.5 sm:h-3.5 bg-emerald-500 rounded-full border-2 border-slate-950" />
              <Sparkles className="w-4.5 h-4.5 sm:w-5.5 sm:h-5.5 text-amber-400 animate-pulse" />
              <span className="text-[10px] sm:text-xs font-black font-mono tracking-wider">{t('guardbot_btn', 'ASK GUARDBOT AI')}</span>
            </motion.button>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed bottom-4 left-0 right-0 sm:left-auto sm:right-6 sm:bottom-6 z-50 pointer-events-none flex justify-center sm:justify-end px-4 sm:px-0">
            <motion.div
              initial={{ opacity: 0, y: 100, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="pointer-events-auto bg-white border border-slate-200 shadow-2xl rounded-3xl w-full sm:w-[400px] h-[480px] sm:h-[520px] flex flex-col justify-between overflow-hidden relative"
            >
              {/* DRAWER HEADER */}
            <div className="bg-slate-900 text-white px-4 sm:px-5 py-3 sm:py-4 flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <div className="bg-emerald-600/10 p-1.5 sm:p-2 rounded-xl border border-emerald-500/20">
                  <Sparkles className="w-3.5 h-3.5 sm:w-4 h-4 text-emerald-400 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-[11px] sm:text-xs font-extrabold tracking-tight flex items-center space-x-1.5">
                    <span>{t('guardbot_title', 'GuardBot AI Civic Assistant')}</span>
                    <span className="bg-emerald-500/20 text-emerald-400 text-[7px] sm:text-[8px] font-black uppercase px-1.5 py-0.5 rounded font-mono">
                      {t('guardbot_online', 'ONLINE')}
                    </span>
                  </h3>
                  <p className="text-[8px] sm:text-[9px] text-slate-400 font-mono">{t('guardbot_sub', 'Live Civic Ledger Co-Pilot')}</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-all cursor-pointer"
              >
                <X className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
              </button>
            </div>

            {/* MESSAGE CHAT STREAM */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3 sm:space-y-4 bg-slate-50/50">
              {messages.map((msg, idx) => {
                const isUser = msg.role === 'user';
                return (
                  <div key={idx} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] sm:max-w-[85%] rounded-2xl p-3 sm:p-3.5 text-xs shadow-2xs leading-relaxed border ${
                      isUser 
                        ? 'bg-slate-900 text-slate-100 border-slate-900 rounded-tr-none' 
                        : 'bg-white text-slate-800 border-slate-200/80 rounded-tl-none'
                    }`}>
                      {formatMessageText(msg.content)}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-tl-none p-3 sm:p-3.5 text-xs shadow-2xs flex items-center space-x-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-600" />
                    <span className="font-mono font-bold uppercase text-[8px] sm:text-[9px] tracking-widest animate-pulse">{t('guardbot_loading', 'Consulting ledger docs...')}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* QUICK PRESETS CAROUSEL (Show only if not loading) */}
            {messages.length <= 2 && !loading && (
              <div className="px-3 sm:px-4 py-2 bg-white border-t border-slate-100/80 space-y-1 sm:space-y-1.5">
                <span className="text-[8px] text-slate-400 font-black tracking-wider uppercase font-mono">{t('guardbot_suggestions', 'QUICK INQUIRY SUGGESTIONS:')}</span>
                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                  {PRESETS.map((p, idx) => (
                    <button
                      key={idx}
                      onClick={() => handlePresetClick(p.text)}
                      className="bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-2 sm:px-2.5 py-1 sm:py-1.5 text-[8.5px] sm:text-[9px] font-bold font-mono transition-colors text-left truncate cursor-pointer max-w-[150px] sm:max-w-[180px]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* CHAT INPUT AREA */}
            <form 
              onSubmit={(e) => { e.preventDefault(); handleSendMessage(input); }}
              className="p-3 sm:p-4 bg-white border-t border-slate-150 flex items-center space-x-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('guardbot_placeholder', 'Ask GuardBot about active city issues...')}
                className="flex-1 bg-slate-50 text-xs font-semibold border border-slate-200 rounded-xl px-3 py-2 sm:px-3.5 sm:py-2.5 focus:bg-white focus:ring-1 focus:ring-slate-800 outline-none transition-all placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-slate-900 text-white hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-350 p-2 sm:p-2.5 rounded-xl cursor-pointer transition-colors"
              >
                <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  </div>
  );
}
