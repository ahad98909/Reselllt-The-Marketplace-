import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      "app_name": "ResellIt",
      "search_placeholder": "Search for electronics, cars, fashion...",
      "home": "Home",
      "chat": "Chat",
      "profile": "Profile",
      "admin": "Admin",
      "favorites": "Favorites",
      "sell": "Sell Item",
      "login": "Login",
      "register": "Register",
      "condition_new": "New",
      "condition_like_new": "Like New",
      "condition_good": "Good",
      "condition_fair": "Fair",
      "recent_listings": "Recent Listings",
      "price": "Price",
      "location": "Location",
      "buy_now": "Buy Now",
      "contact_seller": "Contact Seller",
      "logout": "Logout",
      "no_listings": "No listings found matching your search.",
      "ai_copilot": "AI Copilot"
    }
  },
  es: {
    translation: {
      "app_name": "ResellIt",
      "search_placeholder": "Buscar electrónica, coches, moda...",
      "home": "Inicio",
      "chat": "Chat",
      "profile": "Perfil",
      "admin": "Administrador",
      "favorites": "Favoritos",
      "sell": "Vender artículo",
      "login": "Iniciar sesión",
      "register": "Registrarse",
      "condition_new": "Nuevo",
      "condition_like_new": "Como nuevo",
      "condition_good": "Bueno",
      "condition_fair": "Aceptable",
      "recent_listings": "Anuncios recientes",
      "price": "Precio",
      "location": "Ubicación",
      "buy_now": "Comprar ahora",
      "contact_seller": "Contactar vendedor",
      "logout": "Cerrar sesión",
      "no_listings": "No se encontraron anuncios que coincidan.",
      "ai_copilot": "Copiloto IA"
    }
  }
};

// Simple custom i18n initialization to prevent external network fetching errors
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
