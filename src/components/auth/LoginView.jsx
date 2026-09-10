import React, { useState } from "react";
import {
  Activity,
  ArrowRight,
  ShieldCheck,
  Lock,
  Mail,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  KeyRound
} from "lucide-react";
import {
  supabase,
  isSupabaseConfigured
} from "../../lib/supabase";
import { LoginAvatarPreview } from "./LoginAvatarPreview";

export function LoginView({ onDemoAccess, onLoginSuccess }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

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
      return { label: "", color: "bg-slate-200", textColor: "text-slate-500" };
    if (strengthScore <= 1)
      return { label: "Very Weak", color: "bg-rose-500", textColor: "text-rose-600" };
    if (strengthScore === 2)
      return { label: "Weak", color: "bg-orange-500", textColor: "text-orange-600" };
    if (strengthScore === 3)
      return { label: "Fair", color: "bg-amber-500", textColor: "text-amber-600" };
    if (strengthScore === 4)
      return { label: "Good", color: "bg-teal-500", textColor: "text-teal-600" };
    return { label: "Strong", color: "bg-emerald-600", textColor: "text-emerald-700" };
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

    if (!configured) {
      setErrorMsg(
        "Supabase credentials are not configured in your environment. You can launch Demo Access below to explore the workstation."
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

  return (
    <div className="h-screen w-full bg-gradient-to-br from-slate-50 via-teal-50/30 to-slate-100 flex flex-col justify-between text-slate-800 p-3 sm:p-4 md:px-6 overflow-x-hidden overflow-y-auto lg:overflow-hidden select-none">
      {/* Top Brand Navigation Header */}
      <header className="w-full max-w-7xl mx-auto flex items-center justify-between py-1.5 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-teal-700 text-white flex items-center justify-center shadow-md shadow-teal-700/20 shrink-0">
            <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              The Visual Medical History
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-teal-100 text-teal-900 border border-teal-300">
                v2.4
              </span>
            </h1>
            <p className="text-[10px] sm:text-xs font-semibold text-slate-700">
              Spatial Clinical EMR
            </p>
          </div>
        </div>

        {/* High-Contrast Top Right Badge */}
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-full bg-white/95 border border-slate-300 text-slate-800 text-[11px] sm:text-xs font-semibold shadow-xs">
            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 shrink-0" />
            <span className="hidden sm:inline">EMR / HIPAA Compliant Sandbox</span>
            <span className="sm:hidden">HIPAA Secure</span>
          </span>
        </div>
      </header>

      {/* Main Content Area: Left = 3D Rotating Avatar, Right = Login Box */}
      <main className="w-full max-w-7xl mx-auto flex-1 min-h-0 my-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-center">
        {/* Left Side: Continuous Clockwise Rotating 3D Avatar with Interactive Pins */}
        <div className="lg:col-span-7 h-full min-h-[380px] lg:min-h-0 flex flex-col justify-center">
          <LoginAvatarPreview />
        </div>

        {/* Right Side: Login Box */}
        <div className="lg:col-span-5 flex flex-col justify-center max-h-full overflow-y-auto">
          <div className="w-full max-w-md mx-auto bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 overflow-hidden">
            {/* Card Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 text-center bg-gradient-to-b from-slate-50 to-white">
              <div className="w-10 h-10 mx-auto rounded-xl bg-teal-50 border border-teal-100 flex items-center justify-center text-teal-700 mb-2 shadow-xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h2 className="text-base font-extrabold text-slate-900">
                Clinician Authentication
              </h2>
              <p className="text-xs font-medium text-slate-600 mt-0.5">
                Hospital or medical institution portal
              </p>

              {/* Segmented Tab Toggle */}
              <div className="flex bg-slate-100 p-1 rounded-xl mt-3.5 border border-slate-200/80">
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
            <div className="p-4 sm:p-5 space-y-3.5">
              {/* Alerts */}
              {errorMsg && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span className="leading-snug font-medium">{errorMsg}</span>
                </div>
              )}
              {successMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span className="leading-snug font-medium">{successMsg}</span>
                </div>
              )}

              <form onSubmit={handleAuthSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Institutional Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="physician@hospital.org"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white focus:ring-1 focus:ring-teal-600 transition-all font-medium"
                      required
                    />
                  </div>
                </div>

                {/* Password Strength Meter & Interactive Requirements (Shown when creating account) */}
                {isSignUp && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-800 flex items-center gap-1">
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
                    <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 pt-0.5 text-[10px]">
                      <div className={`flex items-center gap-1 font-semibold ${passwordCriteria.length ? "text-emerald-700" : "text-slate-500"}`}>
                        <CheckCircle2 className={`w-3 h-3 shrink-0 ${passwordCriteria.length ? "text-emerald-600" : "text-slate-300"}`} />
                        <span>8+ Chars</span>
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
                        <span>Symbol (!@#$)</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white text-xs font-bold shadow-md shadow-teal-700/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

              {/* Demo Access Button / Card */}
              <div className="p-3 rounded-xl bg-gradient-to-r from-teal-50/80 via-emerald-50/60 to-teal-50/80 border border-teal-200/90 shadow-xs">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-950">
                    <Sparkles className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                    <span>Interactive Clinical Demo</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-teal-100 text-teal-900 border border-teal-200 shrink-0">
                    Instant Access
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium leading-normal mb-2.5">
                  Bypass login to view Elena Vance with 3D vascular lines, JP drains, surgical hardware, and interactive pharmacy shelf.
                </p>
                <button
                  type="button"
                  onClick={onDemoAccess}
                  className="w-full py-2 px-3.5 rounded-xl bg-white hover:bg-teal-50 border border-teal-300 text-teal-950 text-xs font-bold shadow-xs hover:shadow transition-all flex items-center justify-center gap-2 group"
                >
                  <span>Launch Demo Patient (Bypass Login)</span>
                  <ArrowRight className="w-3.5 h-3.5 text-teal-700 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* High-Contrast Bottom Footer - centered text, guaranteed visible without cutoff */}
      <footer className="w-full max-w-7xl mx-auto py-1.5 shrink-0 border-t border-slate-300/80 text-xs text-slate-800 font-semibold flex items-center justify-center text-center">
        <div>
          The Visual Medical History &copy; {new Date().getFullYear()} • Epic LDA & EMR Spatial Visualizer
        </div>
      </footer>
    </div>
  );
}
