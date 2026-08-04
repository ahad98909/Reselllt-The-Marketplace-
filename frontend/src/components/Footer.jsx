import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export default function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-white py-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 text-center text-sm text-slate-500 dark:text-slate-400">
        <div className="flex justify-center gap-6 mb-4">
          <Link to="/about" className="hover:underline">About Us</Link>
          <Link to="/terms" className="hover:underline">Terms & Conditions</Link>
          <Link to="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link to="/contact" className="hover:underline">Contact</Link>
        </div>
        <p>&copy; {new Date().getFullYear()} {t('app_name')} Marketplace. All rights reserved.</p>
      </div>
    </footer>
  );
}
