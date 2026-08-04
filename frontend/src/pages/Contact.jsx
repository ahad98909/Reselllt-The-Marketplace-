import React, { useState } from 'react';
import { Phone, Mail, MapPin, Send } from 'lucide-react';

export default function Contact() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setName('');
    setEmail('');
    setMessage('');
    setTimeout(() => setSubmitted(false), 5000);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Title */}
      <div className="text-center mb-16">
        <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-brand-600 to-emerald-600 bg-clip-text text-transparent sm:text-5xl dark:from-brand-400 dark:to-emerald-400">
          Contact Customer Support
        </h1>
        <p className="mt-4 text-lg text-slate-500 max-w-2xl mx-auto dark:text-slate-400">
          Have questions or need assistance with your escrow payments? Our support team is here to help you 24/7.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* Info Cards */}
        <div className="space-y-6 md:col-span-1">
          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850 flex gap-4">
            <div className="bg-brand-50 p-3 rounded-2xl w-fit shrink-0 dark:bg-brand-950/20">
              <Phone className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Helpline Phone</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">+92 (21) 111-222-333</p>
              <p className="text-xs text-slate-400">Mon - Sat: 9:00 AM - 6:00 PM</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850 flex gap-4">
            <div className="bg-emerald-50 p-3 rounded-2xl w-fit shrink-0 dark:bg-emerald-950/20">
              <Mail className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Email Support</h4>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">support@marketplace.com.pk</p>
              <p className="text-xs text-slate-400">Response within 24 hours</p>
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850 flex gap-4">
            <div className="bg-brand-50 p-3 rounded-2xl w-fit shrink-0 dark:bg-brand-950/20">
              <MapPin className="h-5 w-5 text-brand-600 dark:text-brand-400" />
            </div>
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200">Head Office</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                4th Floor, Tech Hub Towers, Shahrah-e-Faisal, Karachi, Pakistan.
              </p>
            </div>
          </div>
        </div>

        {/* Contact Form */}
        <div className="bg-white rounded-3xl p-8 border border-slate-150 shadow-sm dark:bg-slate-900 dark:border-slate-850 md:col-span-2">
          <h3 className="font-black text-xl mb-6">Send Us a Message</h3>

          {submitted && (
            <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-600 dark:bg-emerald-950/20 mb-6 font-semibold">
              🎉 Message sent! Our helpline support agent will contact you shortly via email.
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">YOUR NAME</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Ali Ahmed"
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">EMAIL ADDRESS</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ali@gmail.com"
                  className="w-full rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 mb-1">MESSAGE</label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe your issue or query..."
                className="w-full h-32 rounded-xl border border-slate-200 bg-transparent px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none dark:border-slate-800"
              />
            </div>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-bold text-white hover:bg-brand-700 dark:bg-brand-500 w-full sm:w-auto"
            >
              <Send className="h-4 w-4" />
              Send Message
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
