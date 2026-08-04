import React from 'react';
import { EyeOff, Key, ShieldCheck, Mail } from 'lucide-react';

export default function Privacy() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent sm:text-5xl dark:from-brand-400 dark:to-emerald-400">
          Privacy Policy
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto dark:text-slate-400">
          How we handle, secure, and respect your personal data and account credentials.
        </p>
      </div>

      {/* Pillars */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850">
            <div className="bg-brand-50 p-3 rounded-2xl w-fit mb-4 dark:bg-brand-950/20">
              <Key className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Secure Authentication</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              We encrypt passwords using advanced hashing before storing them in our database. We never share your password credentials with anyone.
            </p>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850">
            <div className="bg-emerald-50 p-3 rounded-2xl w-fit mb-4 dark:bg-emerald-950/20">
              <EyeOff className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h3 className="font-bold text-lg mb-2">Private Messaging</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Inboxes are completely private to the chat participants. Chat transcripts are only accessed by administrators in the event of reported fraud or abuse.
            </p>
          </div>
        </div>

        <section className="bg-white rounded-3xl p-8 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850">
          <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            Data Usage and Sharing
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            We store product images, descriptions, titles, and public profiles solely to run the marketplace. When you provide contact details (such as a phone number or email) for buyer coordinate, we render them only to authorized buyers with active, secured escrow bookings to prevent marketing scraping.
          </p>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            We do not sell user data to advertising networks. Your privacy remains our absolute commitment.
          </p>
        </section>

        <div className="flex flex-col items-center justify-center p-8 bg-brand-50/50 dark:bg-brand-950/10 rounded-3xl border border-brand-100/50 dark:border-brand-950/30">
          <Mail className="h-6 w-6 text-brand-600 dark:text-brand-400 mb-2" />
          <h4 className="font-bold text-slate-800 dark:text-slate-200">Have privacy concerns?</h4>
          <p className="text-xs text-slate-450 mt-1">Send a message to our security officer at privacy@marketplace.com.pk</p>
        </div>
      </div>
    </div>
  );
}
