import React, { useState } from "react";
import { X, Cloud, Key, Database, LogOut, Check, Copy } from "lucide-react";
import { supabase, reinitializeSupabase, resetSupabaseConfig, SUPABASE_SQL_SCHEMA } from "../../lib/supabase";

export function AuthModal({ isOpen, onClose, user, onAuthSuccess }) {
  const [activeTab, setActiveTab] = useState("auth"); // "auth" | "config" | "schema"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  // Custom Supabase config state
  const [customUrl, setCustomUrl] = useState(
    localStorage.getItem("pmhx_supabase_url") || ""
  );
  const [customKey, setCustomKey] = useState(
    localStorage.getItem("pmhx_supabase_anon_key") || ""
  );
  const [copiedSchema, setCopiedSchema] = useState(false);

  if (!isOpen) return null;

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: "success", text: "Account created! Welcome to Visual Medical History." });
        if (onAuthSuccess) onAuthSuccess({ isSignUp: true, email });
        setTimeout(onClose, 1000);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage({ type: "success", text: "Signed in successfully!" });
        if (onAuthSuccess) onAuthSuccess({ isSignUp: false, email });
        setTimeout(onClose, 1000);
      }
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setMessage({ type: "success", text: "Signed out successfully." });
      setTimeout(onClose, 800);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    if (customUrl && customKey) {
      reinitializeSupabase(customUrl, customKey);
      setMessage({ type: "success", text: "Supabase configuration updated! Reloading..." });
      setTimeout(() => window.location.reload(), 800);
    }
  };

  const handleResetConfig = () => {
    resetSupabaseConfig();
    setMessage({ type: "info", text: "Reset to default project configuration. Reloading..." });
    setTimeout(() => window.location.reload(), 800);
  };

  const handleCopySchema = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSchema(true);
    setTimeout(() => setCopiedSchema(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-sky-400" />
            <h2 className="text-sm font-bold text-white">Supabase Cloud Sync & Setup</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950/30 px-3 pt-2 gap-2">
          {[
            { key: "auth", label: user ? "Account" : "Sign In", icon: Cloud },
            { key: "config", label: "Project API", icon: Key },
            { key: "schema", label: "SQL Schema", icon: Database }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => {
                  setActiveTab(tab.key);
                  setMessage(null);
                }}
                className={`py-2 px-3 text-xs font-medium rounded-t-lg transition-all flex items-center gap-1.5 border-b-2 ${
                  isActive
                    ? "text-sky-400 border-sky-500 bg-slate-900 font-semibold"
                    : "text-slate-400 border-transparent hover:text-slate-200"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Status Message */}
        {message && (
          <div
            className={`mx-5 mt-4 p-3 rounded-lg text-xs ${
              message.type === "error"
                ? "bg-rose-950/40 text-rose-300 border border-rose-900/50"
                : message.type === "success"
                ? "bg-emerald-950/40 text-emerald-300 border border-emerald-900/50"
                : "bg-sky-950/40 text-sky-300 border border-sky-900/50"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* Tab 1: Auth (Sign In / Sign Up) */}
        {activeTab === "auth" && (
          <div className="p-5">
            {user ? (
              <div className="space-y-4">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <div className="text-[11px] uppercase tracking-wider text-slate-400">
                    Currently Signed In
                  </div>
                  <div className="text-sm font-semibold text-white mt-0.5">{user.email}</div>
                  <div className="text-[11px] text-slate-500 mt-1">User ID: {user.id}</div>
                </div>

                <p className="text-xs text-slate-400">
                  Your patient records, surgical history, and conditions are automatically synchronized with Row Level Security (RLS) enabled in your Supabase project.
                </p>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-semibold transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{loading ? "Signing Out..." : "Sign Out"}</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleAuthSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="doctor@hospital.org"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 rounded-lg bg-sky-500 hover:bg-sky-400 text-white text-xs font-semibold shadow-md transition-all disabled:opacity-50"
                >
                  {loading
                    ? "Authenticating..."
                    : isSignUp
                    ? "Create Account"
                    : "Sign In"}
                </button>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-xs text-sky-400 hover:text-sky-300"
                  >
                    {isSignUp
                      ? "Already have an account? Sign in"
                      : "Don't have an account? Sign up"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* Tab 2: Project API Config */}
        {activeTab === "config" && (
          <form onSubmit={handleSaveConfig} className="p-5 space-y-3.5">
            <p className="text-xs text-slate-400">
              Connect to your own Supabase project by entering your Project URL and anon public key:
            </p>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Supabase Project URL
              </label>
              <input
                type="url"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="https://your-project.supabase.co"
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Supabase Anon Public API Key
              </label>
              <input
                type="password"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full text-xs bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-sky-500 font-mono"
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleResetConfig}
                className="flex-1 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 rounded-lg border border-slate-800 hover:bg-slate-800 transition-all"
              >
                Reset Default
              </button>
              <button
                type="submit"
                className="flex-1 py-2 text-xs font-semibold text-white bg-sky-500 hover:bg-sky-400 rounded-lg shadow-md transition-all"
              >
                Save & Connect
              </button>
            </div>
          </form>
        )}

        {/* Tab 3: SQL Schema Setup */}
        {activeTab === "schema" && (
          <div className="p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Run this SQL in your Supabase SQL Editor:
              </span>
              <button
                type="button"
                onClick={handleCopySchema}
                className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 bg-sky-500/10 px-2.5 py-1 rounded-md border border-sky-500/30 transition-all"
              >
                {copiedSchema ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSchema ? "Copied!" : "Copy SQL"}</span>
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 max-h-56 overflow-y-auto font-mono text-[10px] text-slate-300 leading-relaxed">
              <pre>{SUPABASE_SQL_SCHEMA}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
