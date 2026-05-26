"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

type Translations = Record<string, string>;

const en: Translations = {
  welcome: "Welcome back",
  subtitle: "Track your local sharing impact with EcoSwap.",
  editProfile: "Edit Profile",
  fullName: "Full Name",
  avatarUrl: "Avatar URL",
  city: "City",
  phone: "Phone Number",
  upiId: "UPI ID (For payments)",
  bankAccount: "Bank Account Info",
  cancel: "Cancel",
  save: "Save",
  notProvided: "Not provided",
  marketplaceOverview: "Marketplace Overview",
  communityRating: "Community Rating",
  activeListings: "Active Listings",
  unreadMessages: "Unread Messages",
  yourRecentListings: "Your Recent Listings",
  listFirstItem: "List your first item →",
  edit: "Edit",
  delete: "Delete",
  appLanguage: "App Language",
  needAssistance: "Need Assistance?",
  helpText: "If you have any issues with your swaps, payments, or account, reach out to our admin team anytime.",
  contactAdmin: "Contact Admin",
  loading: "Loading your eco data…",
  signInPrompt: "Please sign in to view your dashboard."
};

const hi: Translations = {
  welcome: "वापसी पर स्वागत है",
  subtitle: "इकोस्वैप के साथ अपने स्थानीय साझाकरण प्रभाव को ट्रैक करें।",
  editProfile: "प्रोफ़ाइल संपादित करें",
  fullName: "पूरा नाम",
  avatarUrl: "अवतार यूआरएल",
  city: "शहर",
  phone: "फ़ोन नंबर",
  upiId: "UPI आईडी (भुगतान के लिए)",
  bankAccount: "बैंक खाता जानकारी",
  cancel: "रद्द करें",
  save: "सहेजें",
  notProvided: "प्रदान नहीं किया गया",
  marketplaceOverview: "मार्केटप्लेस अवलोकन",
  communityRating: "सामुदायिक रेटिंग",
  activeListings: "सक्रिय लिस्टिंग",
  unreadMessages: "अपठित संदेश",
  yourRecentListings: "आपकी हाल की लिस्टिंग",
  listFirstItem: "अपनी पहली वस्तु सूचीबद्ध करें →",
  edit: "संपादित करें",
  delete: "हटाएं",
  appLanguage: "ऐप की भाषा",
  needAssistance: "क्या सहायता चाहिए?",
  helpText: "यदि आपको अपने स्वैप, भुगतान या खाते से कोई समस्या है, तो कभी भी हमारी एडमिन टीम से संपर्क करें।",
  contactAdmin: "एडमिन से संपर्क करें",
  loading: "आपका डेटा लोड हो रहा है…",
  signInPrompt: "अपना डैशबोर्ड देखने के लिए कृपया साइन इन करें।"
};

const mr: Translations = {
  welcome: "पुन्हा स्वागत आहे",
  subtitle: "इकोस्वॅप सोबत आपल्या स्थानिक शेअरिंग प्रभावाचा मागोवा घ्या.",
  editProfile: "प्रोफाइल संपादित करा",
  fullName: "पूर्ण नाव",
  avatarUrl: "अवतार यूआरएल",
  city: "शहर",
  phone: "फोन नंबर",
  upiId: "UPI आयडी (पेमेंटसाठी)",
  bankAccount: "बँक खाते माहिती",
  cancel: "रद्द करा",
  save: "जतन करा",
  notProvided: "प्रदान केलेले नाही",
  marketplaceOverview: "मार्केटप्लेस विहंगावलोकन",
  communityRating: "सामुदायिक रेटिंग",
  activeListings: "सक्रिय लिस्टिंग",
  unreadMessages: "न वाचलेले संदेश",
  yourRecentListings: "तुमच्या अलीकडील लिस्टिंग",
  listFirstItem: "तुमची पहिली वस्तू सूचीबद्ध करा →",
  edit: "संपादित करा",
  delete: "काढून टाका",
  appLanguage: "अॅपची भाषा",
  needAssistance: "मदत हवी आहे का?",
  helpText: "तुम्हाला तुमच्या स्वॅप, पेमेंट किंवा खात्यात कोणतीही समस्या असल्यास, आमच्या ॲडमिन टीमशी कधीही संपर्क साधा.",
  contactAdmin: "ॲडमिनशी संपर्क साधा",
  loading: "तुमचा डेटा लोड होत आहे…",
  signInPrompt: "तुमचा डॅशबोर्ड पाहण्यासाठी कृपया साइन इन करा."
};

const es: Translations = {
  welcome: "Bienvenido de nuevo",
  subtitle: "Sigue tu impacto de intercambio local con EcoSwap.",
  editProfile: "Editar perfil",
  fullName: "Nombre completo",
  avatarUrl: "URL del avatar",
  city: "Ciudad",
  phone: "Número de teléfono",
  upiId: "ID de UPI (Para pagos)",
  bankAccount: "Información de cuenta bancaria",
  cancel: "Cancelar",
  save: "Guardar",
  notProvided: "No proporcionado",
  marketplaceOverview: "Resumen del mercado",
  communityRating: "Calificación de la comunidad",
  activeListings: "Publicaciones activas",
  unreadMessages: "Mensajes no leídos",
  yourRecentListings: "Tus publicaciones recientes",
  listFirstItem: "Publica tu primer artículo →",
  edit: "Editar",
  delete: "Eliminar",
  appLanguage: "Idioma de la aplicación",
  needAssistance: "¿Necesitas ayuda?",
  helpText: "Si tienes algún problema con tus intercambios, pagos o cuenta, comunícate con nuestro equipo de administración en cualquier momento.",
  contactAdmin: "Contactar al administrador",
  loading: "Cargando tus datos…",
  signInPrompt: "Por favor, inicia sesión para ver tu panel."
};

const dictionaries: Record<string, Translations> = {
  English: en,
  "Hindi (हिंदी)": hi,
  "Marathi (मराठी)": mr,
  "Spanish (Español)": es,
};

type LanguageContextType = {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguage] = useState("English");
  
  useEffect(() => {
    const stored = localStorage.getItem("ecoswap_language");
    if (stored && dictionaries[stored]) {
      setLanguage(stored);
    }
  }, []);

  const handleSetLanguage = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem("ecoswap_language", lang);
  };

  const t = (key: string): string => {
    return dictionaries[language]?.[key] || dictionaries["English"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
