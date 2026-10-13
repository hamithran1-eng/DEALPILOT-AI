import React, { useState } from 'react';
import { X, Loader2, Sparkles, Building, Mail, Phone, DollarSign } from 'lucide-react';
import { api } from '../api/client';
import { Lead, PipelineStage } from '../types';

interface NewLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLeadCreated: (lead: Lead) => void;
}

export const NewLeadModal: React.FC<NewLeadModalProps> = ({ isOpen, onClose, onLeadCreated }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [companyDomain, setCompanyDomain] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('11-50');
  const [dealValue, setDealValue] = useState('');
  const [stage, setStage] = useState<PipelineStage>('new');
  const [source, setSource] = useState('Direct Research');
  const [notes, setNotes] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError('First name, last name, and email are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.createLead({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim() || undefined,
        job_title: jobTitle.trim() || undefined,
        company_name: companyName.trim() || undefined,
        company_domain: companyDomain.trim() || undefined,
        industry: industry.trim() || undefined,
        company_size: companySize || undefined,
        deal_value: dealValue ? Number(dealValue) : undefined,
        stage,
        status: 'active',
        source,
        notes: notes.trim() || undefined,
      });

      onLeadCreated(res.lead);
      onClose();
      // reset form
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setJobTitle('');
      setCompanyName('');
      setCompanyDomain('');
      setIndustry('');
      setDealValue('');
      setNotes('');
    } catch (err: any) {
      setError(err.message || 'Failed to create lead.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="glass-modal rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl border border-white/80 animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4.5 border-b border-slate-100/80 bg-white/40 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-600 flex items-center justify-center shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Add New Prospect Lead</h3>
                <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/60">
                  ₹ INR Base
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Grounded data scored via explainable AI qualification weights.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50/90 border border-rose-200/80 rounded-xl text-xs text-rose-700 backdrop-blur-xs">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                First Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder="Aarav"
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Last Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder="Sharma"
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Corporate Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="aarav.sharma@tarento.in"
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Job Title / Decision Role
              </label>
              <input
                type="text"
                value={jobTitle}
                onChange={e => setJobTitle(e.target.value)}
                placeholder="Chief Technology Officer"
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="Tarento Technologies India"
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Corporate Domain
              </label>
              <input
                type="text"
                value={companyDomain}
                onChange={e => setCompanyDomain(e.target.value)}
                placeholder="tarento.in"
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Target Industry
              </label>
              <input
                type="text"
                value={industry}
                onChange={e => setIndustry(e.target.value)}
                placeholder="Enterprise SaaS & Cloud"
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Company Scale
              </label>
              <select
                value={companySize}
                onChange={e => setCompanySize(e.target.value)}
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none bg-white/80"
              >
                <option value="1-10">1-10 employees</option>
                <option value="11-50">11-50 employees</option>
                <option value="51-200">51-200 employees</option>
                <option value="201-1000">201-1,000 employees</option>
                <option value="1000+">1,000+ enterprise</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Deal Value (₹ INR)
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold font-mono text-xs">
                  ₹
                </span>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={dealValue}
                  onChange={e => setDealValue(e.target.value)}
                  placeholder="2,50,000"
                  className="w-full pl-7 pr-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none font-mono tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                Initial Stage
              </label>
              <select
                value={stage}
                onChange={e => setStage(e.target.value as PipelineStage)}
                className="w-full px-3 py-1.5 text-xs glass-input rounded-xl focus:outline-none bg-white/80"
              >
                <option value="new">New</option>
                <option value="qualified">Qualified</option>
                <option value="contacted">Contacted</option>
                <option value="engaged">Engaged</option>
                <option value="meeting_scheduled">Meeting Scheduled</option>
                <option value="proposal">Proposal</option>
                <option value="won">Won</option>
                <option value="lost">Lost</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Context & Deal Notes
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Scaling revenue operations for FY26; interested in sales orchestration and INR billing workflows."
              className="w-full px-3 py-2 text-xs glass-input rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 glass-card rounded-xl hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-1.5 px-4.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 rounded-xl transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save & Score Lead (₹)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
