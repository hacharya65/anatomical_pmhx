import React, { useState } from "react";
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  Sparkles,
  Layers,
  Settings,
  Database,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Stethoscope
} from "lucide-react";
import {
  supabase,
  reinitializeSupabase,
  resetSupabaseConfig,
  isSupabaseConfigured
} from "../../lib/supabase";

export function LoginView({ onDemoAccess, onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Custom Supabase configuration accordion (for testing custom projects without env vars)
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(
    localStorage.getItem("pmhx_supabase_url") || ""
  );
  const [customKey, setCustomKey] = useState(
    localStorage.getItem("pmhx_supabase_anon_key") || ""
  );

  const configured = isSupabaseConfigured();

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!configured && !customUrl) {
      setErrorMsg(
        "Supabase credentials are not configured yet. You can launch Demo Access below or configure your project keys."
      );
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password
        });
        if (error) throw error;
        if (data?.session) {
          setSuccessMsg("Account created! Accessing clinical workstation...");
          if (onLoginSuccess) onLoginSuccess(data.user);
        } else {
          setSuccessMsg(
            "Account registered! Please check your email inbox to verify your account."
          );
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        if (error) throw error;
        setSuccessMsg("Authentication verified! Launching clinical session...");
        if (onLoginSuccess) onLoginSuccess(data.user);
      }
    } catch (err) {
      setErrorMsg(err.message || "Authentication failed. Please verify credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCustomConfig = (e) => {
    e.preventDefault();
    if (customUrl && customKey) {
      reinitializeSupabase(customUrl, customKey);
      setSuccessMsg("Supabase configuration saved! Reloading...");
      setTimeout(() => window.location.reload(), 600);
    }
  };

  const handleResetConfig = () => {
    resetSupabaseConfig();
    setSuccessMsg("Project configuration reset to defaults.");
    setTimeout(() => window.location.reload(), 600);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 flex flex-col justify-between text-slate-800 p-4 sm:p-6 select-none">
      {/* Top Brand Nav */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-700/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              The Visual Medical History
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800 border border-teal-200">
                v2.4
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Department of Internal Medicine • Spatial Clinical EMR
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="hidden sm:flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>EMR / HIPAA Compliant Sandbox</span>
          </span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-slate-100 text-center bg-gradient-to-b from-slate-50/80 to-white">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-3 shadow-xs">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Clinician Authentication
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Sign in with your hospital or medical institution credentials
            </p>

            {/* Segmented Tab Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl mt-5 border border-slate-200/60">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                  !isSignUp
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(true);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 text-xs font-semibold py-1.5 rounded-lg transition-all ${
                  isSignUp
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 space-y-4">
            {/* Alerts */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-snug">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="physician@hospital.org"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600 transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600 transition-all"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold shadow-md shadow-teal-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <span>{isSignUp ? "Register Clinician Account" : "Sign In to EMR"}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-4 flex items-center justify-center">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider absolute">
                Or Quick Access
              </span>
            </div>

            {/* Demo Access Button / Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-50/70 via-emerald-50/50 to-teal-50/70 border border-teal-200/80 shadow-xs">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-900">
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  <span>Interactive Clinical Demo</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-800">
                  Instant Access
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                Bypass authentication to view the active 3D patient (Elena Vance) with vascular lines, JP drains, surgical hardware, and 3D pharmacy shelf.
              </p>
              <button
                type="button"
                onClick={onDemoAccess}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-teal-50 border border-teal-300 text-teal-900 text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 group"
              >
                <span>Launch Demo Patient (Bypass Login)</span>
                <ArrowRight className="w-4 h-4 text-teal-700 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Collapsible Custom Supabase Configuration */}
            <div className="pt-2 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Link Custom Supabase Project</span>
                {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showConfig && (
                <form onSubmit={handleSaveCustomConfig} className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2.5 animate-in fade-in">
                  <p className="text-[10px] text-slate-500">
                    Connect directly to your own Supabase project instance by entering its URL and public key:
                  </p>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Project URL
                    </label>
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      className="w-full text-xs font-mono p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-teal-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                      Anon Public Key
                    </label>
                    <input
                      type="password"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      className="w-full text-xs font-mono p-2 bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:border-teal-600"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResetConfig}
                      className="flex-1 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-lg border border-slate-300 transition-all"
                    >
                      Reset Default
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-1.5 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs transition-all"
                    >
                      Save & Link
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 border-t border-slate-200/60 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          The Visual Medical History &copy; {new Date().getFullYear()} • Epic LDA & EMR Spatial Visualizer
        </div>
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span>PostgreSQL + Supabase Cloud</span>
          <span>•</span>
          <span>Three.js / React 3D</span>
          <span>•</span>
          <span>Vercel Optimized</span>
        </div>
      </footer>
    </div>
  );
}
