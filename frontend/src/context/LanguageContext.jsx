import { createContext, useContext, useState, useEffect } from 'react'

export const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi',   native: 'हिन्दी'  },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ'   },
]

const TRANSLATIONS = {
  en: {
    chat: 'Chat',
    documents: 'Documents',
    settings: 'Settings',
    audit: 'Audit Log',
    health: 'System Health',
    systemReady: 'System ready',
    goodMorning: 'Good morning',
    goodAfternoon: 'Good afternoon',
    goodEvening: 'Good evening',
    howCanHelp: 'How can Secra AI help you today?',
    askPlaceholder: 'Ask Secra AI anything about refinery operations…',
    addDocument: '+ Add Document',
    addDocDesc: 'Upload SOPs, manuals, reports or technical documents',
    sources: 'Sources',
    safetyCritical: 'Safety-critical. Verify with an authorized engineer or safety officer before action.',
    uncertainTitle: "I couldn't find enough reliable information.",
    uncertainDesc: 'Please upload the relevant SOP, manual, or inspection report.',
    disclaimer: "Secra AI uses only your organization's documents · Answers include source references",
    quick1: 'Ask about a document',
    quick2: 'Analyze equipment image',
    quick3: 'Create a maintenance checklist',
    quick4: 'Find an SOP',
  },
  hi: {
    chat: 'चैट (Chat)',
    documents: 'दस्तावेज़ (Documents)',
    settings: 'सेटिंग्स (Settings)',
    audit: 'ऑडिट लॉग (Audit Log)',
    health: 'सिस्टम स्थिति (Health)',
    systemReady: 'सिस्टम तैयार है',
    goodMorning: 'शुभ प्रभात',
    goodAfternoon: 'शुभ दोपहर',
    goodEvening: 'शुभ संध्या',
    howCanHelp: 'Secra AI आज आपकी क्या सहायता कर सकता है?',
    askPlaceholder: 'रिफाइनरी संचालन या SOP के बारे में Secra AI से पूछें…',
    addDocument: '+ दस्तावेज़ जोड़ें',
    addDocDesc: 'SOPs, मैन्युअल, रिपोर्ट्स या तकनीकी दस्तावेज़ अपलोड करें',
    sources: 'संदर्भ (Sources)',
    safetyCritical: 'सुरक्षा-संवेदनशील। कार्रवाई से पहले अधिकृत इंजीनियर या सुरक्षा अधिकारी से सत्यापित करें।',
    uncertainTitle: 'विश्वसनीय जानकारी नहीं मिल सकी।',
    uncertainDesc: 'कृपया संबंधित SOP या सुरक्षा मैन्युअल अपलोड करें।',
    disclaimer: 'Secra AI आपके संगठन के दस्तावेज़ों का उपयोग करता है · उत्तरों में स्रोत संदर्भ शामिल हैं',
    quick1: 'दस्तावेज़ के बारे में पूछें',
    quick2: 'उपकरण फोटो का विश्लेषण करें',
    quick3: 'रखरखाव चेकलिस्ट बनाएं',
    quick4: 'SOP खोजें',
  },
  kn: {
    chat: 'ಚಾಟ್ (Chat)',
    documents: 'ದಾಖಲೆಗಳು (Documents)',
    settings: 'ಸೆಟ್ಟಿಂಗ್ಗಳು (Settings)',
    audit: 'ಆಡಿಟ್ ಲಾಗ್ (Audit Log)',
    health: 'ಸಿಸ್ಟಮ್ ಸ್ಥಿತಿ (Health)',
    systemReady: 'ಸಿಸ್ಟಮ್ ಸಿದ್ಧವಾಗಿದೆ',
    goodMorning: 'ಶುಭೋದಯ',
    goodAfternoon: 'ಶುಭ ಮಧ್ಯಾಹ್ನ',
    goodEvening: 'ಶುಭ ಸಂಜೆ',
    howCanHelp: 'Secra AI ಇಂದು ನಿಮಗೆ ಹೇಗೆ ಸಹಾಯ ಮಾಡಬಹುದು?',
    askPlaceholder: 'ರಿಫೈನರಿ ಕಾರ್ಯಾಚರಣೆಗಳ ಬಗ್ಗೆ Secra AI ಅನ್ನು ಕೇಳಿ…',
    addDocument: '+ ದಾಖಲೆ ಸೇರಿಸಿ',
    addDocDesc: 'SOPಗಳು, ಕೈಪಿಡಿಗಳು ಅಥವಾ ವರದಿಗಳನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ',
    sources: 'ಮೂಲಗಳು (Sources)',
    safetyCritical: 'ಸುರಕ್ಷತಾ-ನಿರ್ಣಾಯಕ. ಕ್ರಮ ಕೈಗೊಳ್ಳುವ ಮೊದಲು ಅಧಿಕೃತ ಎಂಜಿನಿಯರ್‌ನಿಂದ ಪರಿಶೀಲಿಸಿ.',
    uncertainTitle: 'ಸಾಕಷ್ಟು ವಿಶ್ವಾಸಾರ್ಹ ಮಾಹಿತಿ ಕಂಡುಬಂದಿಲ್ಲ.',
    uncertainDesc: 'ದಯವಿಟ್ಟು ಸಂಬಂಧಿತ SOP ಅಥವಾ ಕೈಪಿಡಿಯನ್ನು ಅಪ್ಲೋಡ್ ಮಾಡಿ.',
    disclaimer: 'Secra AI ಅಧಿಕೃತ ದಾಖಲೆಗಳನ್ನು ಮಾತ್ರ ಬಳಸುತ್ತದೆ · ಉತ್ತರಗಳು ಮೂಲ ಉಲ್ಲೇಖಗಳನ್ನು ಹೊಂದಿವೆ',
    quick1: 'ದಾಖಲೆಯ ಬಗ್ಗೆ ಕೇಳಿ',
    quick2: 'ಉಪಕರಣ ಫೋಟೋ ವಿಶ್ಲೇಷಿಸಿ',
    quick3: 'ನಿರ್ವಹಣಾ ಚೆಕ್‌ಲಿಸ್ಟ್ ರಚಿಸಿ',
    quick4: 'SOP ಹುಡುಕಿ',
  }
}

const LanguageContext = createContext({
  language: 'English',
  langCode: 'en',
  setLanguage: () => {},
  t: (key) => key,
})

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('secra_language') || 'English'
  })

  const langObj = LANGUAGES.find(l => l.name.toLowerCase() === language.toLowerCase()) || LANGUAGES[0]
  const langCode = langObj.code

  const setLanguage = (newLang) => {
    setLanguageState(newLang)
    localStorage.setItem('secra_language', newLang)
  }

  const t = (key) => {
    return TRANSLATIONS[langCode]?.[key] || TRANSLATIONS.en[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, langCode, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useLanguage = () => useContext(LanguageContext)
