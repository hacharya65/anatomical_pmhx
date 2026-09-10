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
  Stethoscope,
  KeyRound
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

  // Custom Supabase configuration accordion
  const [showConfig, setShowConfig] = useState(false);
  const [customUrl, setCustomUrl] = useState(
    localStorage.getItem("pmhx_supabase_url") || ""
  );
  const [customKey, setCustomKey] = useState(
    localStorage.getItem("pmhx_supabase_anon_key") || ""
  );

  const configured = isSupabaseConfigured();

  // Password strength evaluation for Create Account
  const passwordCriteria = {
    length: password.length >= 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecial: /[^A-Za-z0-9]/.test(password)
  };

  const strengthScore = [
    passwordCriteria.length,
    passwordCriteria.hasUpper,
    passwordCriteria.hasLower,
    passwordCriteria.hasNumber,
    passwordCriteria.hasSpecial
  ].filter(Boolean).length;

  const getStrengthMeta = () => {
    if (password.length === 0)
      return { label: "", color: "bg-slate-200", textColor: "text-slate-500", width: "0%" };
    if (strengthScore <= 1)
      return { label: "Very Weak", color: "bg-rose-500", textColor: "text-rose-600", width: "20%" };
    if (strengthScore === 2)
      return { label: "Weak", color: "bg-orange-500", textColor: "text-orange-600", width: "40%" };
    if (strengthScore === 3)
      return { label: "Fair", color: "bg-amber-500", textColor: "text-amber-600", width: "60%" };
    if (strengthScore === 4)
      return { label: "Good", color: "bg-teal-500", textColor: "text-teal-600", width: "80%" };
    return { label: "Strong", color: "bg-emerald-600", textColor: "text-emerald-700", width: "100%" };
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Enforce stronger password requirements for account creation
    if (isSignUp && strengthScore < 4) {
      setErrorMsg(
        "Please meet the password strength criteria (at least 8 characters, an uppercase letter, a number, and a special character)."
      );
      setLoading(false);
      return;
    }

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
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-teal-50/40 to-slate-100 flex flex-col justify-between text-slate-800 p-4 sm:p-6 select-none">
      {/* Top Brand Nav */}
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between py-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-700/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              The Visual Medical History
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-850 border border-teal-300">
                v2.4
              </span>
            </h1>
            <p className="text-xs font-semibold text-slate-650 text-slate-700">
              Department of Internal Medicine • Spatial Clinical EMR
            </p>
          </div>
        </div>

        {/* High-Contrast Top Right Badge */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/95 border border-slate-300 text-slate-800 text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>EMR / HIPAA Compliant Sandbox</span>
          </span>
        </div>
      </header>

      {/* Main Login Card Container */}
      <main className="w-full max-w-md mx-auto my-auto py-6">
        <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden">
          {/* Card Header */}
          <div className="p-6 border-b border-slate-100 text-center bg-gradient-to-b from-slate-50 to-white">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-3 shadow-xs">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-extrabold text-slate-900">
              Clinician Authentication
            </h2>
            <p className="text-xs font-medium text-slate-600 mt-1">
              Sign in with your hospital or medical institution credentials
            </p>

            {/* Segmented Tab Toggle */}
            <div className="flex bg-slate-100 p-1 rounded-xl mt-5 border border-slate-200/80">
              <button
                type="button"
                onClick={() => {
                  setIsSignUp(false);
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${
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
                className={`flex-1 text-xs font-bold py-1.5 rounded-lg transition-all ${
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
                <span className="leading-snug font-medium">{errorMsg}</span>
              </div>
            )}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span className="leading-snug font-medium">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Institutional Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="physician@hospital.org"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full text-xs pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              {/* Password Strength Meter & Interactive Requirements (Shown when creating account) */}
              {isSignUp && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 pt-2 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-slate-750 text-slate-800 flex items-center gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-teal-700" />
                      <span>Password Strength:</span>
                    </span>
                    <span className={`font-bold ${getStrengthMeta().textColor}`}>
                      {getStrengthMeta().label || "Enter password"}
                    </span>
                  </div>

                  {/* 5-segment color-graded strength indicator bar */}
                  <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4, 5].map((seg) => (
                      <div
                        key={seg}
                        className={`h-full flex-1 rounded-full transition-all duration-300 ${
                          strengthScore >= seg ? getStrengthMeta().color : "bg-slate-200"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Requirements Checklist */}
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-1 text-[10.5px]">
                    <div className={`flex items-center gap-1 font-semibold ${passwordCriteria.length ? "text-emerald-700" : "text-slate-500"}`}>
                      <CheckCircle2 className={`w-3 h-3 shrink-0 ${passwordCriteria.length ? "text-emerald-600" : "text-slate-300"}`} />
                      <span>8+ Characters</span>
                    </div>
                    <div className={`flex items-center gap-1 font-semibold ${passwordCriteria.hasUpper ? "text-emerald-700" : "text-slate-500"}`}>
                      <CheckCircle2 className={`w-3 h-3 shrink-0 ${passwordCriteria.hasUpper ? "text-emerald-600" : "text-slate-300"}`} />
                      <span>Uppercase (A-Z)</span>
                    </div>
                    <div className={`flex items-center gap-1 font-semibold ${passwordCriteria.hasNumber ? "text-emerald-700" : "text-slate-500"}`}>
                      <CheckCircle2 className={`w-3 h-3 shrink-0 ${passwordCriteria.hasNumber ? "text-emerald-600" : "text-slate-300"}`} />
                      <span>Number (0-9)</span>
                    </div>
                    <div className={`flex items-center gap-1 font-semibold ${passwordCriteria.hasSpecial ? "text-emerald-700" : "text-slate-500"}`}>
                      <CheckCircle2 className={`w-3 h-3 shrink-0 ${passwordCriteria.hasSpecial ? "text-emerald-600" : "text-slate-300"}`} />
                      <span>Special Symbol (!@#$)</span>
                    </div>
                  </div>
                </div>
              )}

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
              <span className="bg-white px-3 text-xs font-bold text-slate-600 uppercase tracking-wider absolute">
                Or Quick Access
              </span>
            </div>

            {/* Demo Access Button / Card */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-teal-50/80 border border-teal-200/90 shadow-xs">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-teal-950">
                  <Sparkles className="w-4 h-4 text-teal-700" />
                  <span>Interactive Clinical Demo</span>
                </div>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200">
                  Instant Access
                </span>
              </div>
              <p className="text-xs text-slate-700 font-medium leading-relaxed mb-3">
                Bypass authentication to view the active 3D patient (Elena Vance) with vascular lines, JP drains, surgical hardware, and 3D pharmacy shelf.
              </p>
              <button
                type="button"
                onClick={onDemoAccess}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-teal-50 border border-teal-300 text-teal-950 text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 group"
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
                className="text-xs font-semibold text-slate-700 hover:text-slate-900 flex items-center justify-center gap-1 mx-auto transition-colors"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span>Link Custom Supabase Project</span>
                {showConfig ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showConfig && (
                <form onSubmit={handleSaveCustomConfig} className="mt-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-left space-y-2.5 animate-in fade-in">
                  <p className="text-xs text-slate-600 font-medium">
                    Connect directly to your own Supabase project instance by entering its URL and public key:
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Project URL
                    </label>
                    <input
                      type="url"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://your-project.supabase.co"
                      className="w-full text-xs font-mono p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Anon Public Key
                    </label>
                    <input
                      type="password"
                      value={customKey}
                      onChange={(e) => setCustomKey(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                      className="w-full text-xs font-mono p-2 bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-teal-600"
                      required
                    />
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResetConfig}
                      className="flex-1 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg border border-slate-300 transition-all"
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

      {/* High-Contrast Footer */}
      <footer className="w-full max-w-5xl mx-auto py-3 border-t border-slate-300/80 text-center text-xs text-slate-800 font-semibold flex flex-col sm:flex-row items-center justify-between gap-2">
        <div>
          The Visual Medical History &copy; {new Date().getFullYear()} • Epic LDA & EMR Spatial Visualizer
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-700">
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
