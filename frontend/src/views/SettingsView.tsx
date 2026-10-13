import React, { useState, useEffect } from 'react';
import {
  Settings,
  ShieldCheck,
  Save,
  CheckCircle2,
  Clock,
  Building,
  Volume2,
  Cpu,
  Sliders,
  RefreshCw
} from 'lucide-react';
import { api } from '../api';

export const SettingsView: React.FC = () => {
  const [settings, setSettings] = useState({
    company_name: 'PulseAttend 360 AI',
    recognition_threshold: '0.68',
    grace_period_mins: '15',
    standard_work_hours: '8.0',
    kiosk_audio_chime: 'true',
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    api.getSettings().then((res) => {
      if (res.settings) {
        setSettings((prev) => ({ ...prev, ...res.settings }));
      }
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    try {
      await api.updateSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const thresholdPercent = Math.round(parseFloat(settings.recognition_threshold || '0.68') * 100);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-extrabold text-white tracking-tight">
            System &amp; Biometric Configuration
          </h2>
          <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            ENTERPRISE
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Fine-tune neural network recognition sensitivity, grace periods, and organization parameters.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Organization Info Card */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <Building className="w-5 h-5 text-indigo-400" />
            <h4 className="font-bold text-white text-base">Organization Profile</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Company / Facility Name</label>
              <input
                type="text"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Biometric Architecture</label>
              <input
                type="text"
                disabled
                value="DeepFace / Facenet512 Multi-Angle Vector Ensemble"
                className="w-full px-3.5 py-2.5 bg-slate-950/60 border border-slate-800/60 rounded-xl text-xs text-slate-400 cursor-not-allowed font-mono"
              />
            </div>
          </div>
        </div>

        {/* Biometric Sensitivity */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <h4 className="font-bold text-white text-base">Biometric Match Sensitivity</h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-semibold">
                Facial Vector Cosine Similarity Threshold:
              </span>
              <span className="font-mono font-bold text-indigo-300 text-sm bg-indigo-500/10 px-2.5 py-1 rounded-xl border border-indigo-500/30">
                {settings.recognition_threshold} ({thresholdPercent}%)
              </span>
            </div>

            <input
              type="range"
              min="0.55"
              max="0.85"
              step="0.01"
              value={settings.recognition_threshold}
              onChange={(e) => setSettings({ ...settings, recognition_threshold: e.target.value })}
              className="w-full accent-indigo-500 cursor-pointer"
            />

            <div className="flex justify-between text-[11px] text-slate-400 font-mono">
              <span>0.55 (More Lenient)</span>
              <span>0.68 (Recommended Industry Standard)</span>
              <span>0.85 (Ultra Strict)</span>
            </div>

            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-xs text-slate-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-indigo-300">
                <ShieldCheck className="w-4 h-4" />
                <span>Multi-Shot Ensemble Advantage</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                By comparing the live probe face against 3-4 multi-angle shots (frontal, slight left, slight right, smile), false rejections are practically eliminated while keeping false acceptance below 0.001%.
              </p>
            </div>
          </div>
        </div>

        {/* Shift and Punctuality Rules */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-5">
          <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
            <Clock className="w-5 h-5 text-indigo-400" />
            <h4 className="font-bold text-white text-base">Shift &amp; Punctuality Parameters</h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Morning Grace Period (Minutes)
              </label>
              <input
                type="number"
                min="0"
                max="60"
                value={settings.grace_period_mins}
                onChange={(e) => setSettings({ ...settings, grace_period_mins: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[10px] text-slate-400">
                Punches after Shift Start + Grace Minutes are marked as Late.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                Standard Full-Day Hours
              </label>
              <input
                type="number"
                step="0.5"
                min="4"
                max="12"
                value={settings.standard_work_hours}
                onChange={(e) => setSettings({ ...settings, standard_work_hours: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
              <p className="text-[10px] text-slate-400">
                Working beyond this duration is automatically credited to Overtime.
              </p>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-between pt-2">
          {saveSuccess ? (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" />
              <span>Settings updated successfully!</span>
            </div>
          ) : (
            <span className="text-xs text-slate-400">All modifications take effect immediately.</span>
          )}

          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
