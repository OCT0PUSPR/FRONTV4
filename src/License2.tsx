
import React, { useState, useEffect } from 'react';
import { ArrowRight, ShieldCheck, Box, Truck, Activity, Copy, Check, Sun, Moon } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { API_CONFIG } from './config/api';
import { useTheme } from '../context/theme';

const LicensePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, setMode, colors } = useTheme();
  const isDarkMode = mode === 'dark';
  const [licenseKey, setLicenseKey] = useState(['', '', '', '']);
  const [activeInput, setActiveInput] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [activationStatus, setActivationStatus] = useState<'idle' | 'activating' | 'success'>('idle');
  const [error, setError] = useState('');
  const inputRefs = React.useRef<(HTMLInputElement | null)[]>([]);

  const toggleTheme = () => setMode(isDarkMode ? 'light' : 'dark');

  // Get tenant ID from navigation state or localStorage
  const tenantId = location.state?.tenantId || localStorage.getItem('current_tenant_id');

  // Calculate expiry date (1 year from today)
  const expiryDate = React.useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  }, []);

  // Handle input change for segmented fields
  const handleChange = (index: number, value: string) => {
    if (value.length > 4) return;
    const newKey = [...licenseKey];
    newKey[index] = value.toUpperCase();
    setLicenseKey(newKey);

    if (value.length === 4 && index < 3) {
      inputRefs.current[index + 1]?.focus();
      setActiveInput(index + 1);
    }
  };

  // Handle paste to distribute characters across fields
  const handlePaste = (index: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    // Get pasted text and clean it (remove dashes, spaces, non-alphanumeric)
    const pastedText = e.clipboardData.getData('text').replace(/[-\s]/g, '').toUpperCase();
    if (!pastedText) return;
    
    // Get current characters in the focused field before cursor
    const input = e.currentTarget;
    const selectionStart = input.selectionStart || 0;
    const currentFieldValue = licenseKey[index];
    const charsBeforeCursor = currentFieldValue.slice(0, selectionStart);
    
    // Combine existing chars before cursor with pasted text
    const combinedText = charsBeforeCursor + pastedText;
    
    // Distribute characters across fields starting from current index
    const newKey = [...licenseKey];
    let charIndex = 0;
    let lastFilledIndex = index;
    
    for (let fieldIdx = index; fieldIdx < 4 && charIndex < combinedText.length; fieldIdx++) {
      const charsForThisField = combinedText.slice(charIndex, charIndex + 4);
      newKey[fieldIdx] = charsForThisField;
      charIndex += 4;
      lastFilledIndex = fieldIdx;
    }
    
    setLicenseKey(newKey);
    
    // Move focus to appropriate field
    // If last field is full, stay there; otherwise move to the field where we stopped
    const targetFieldIndex = newKey[lastFilledIndex].length === 4 && lastFilledIndex < 3 
      ? lastFilledIndex + 1 
      : lastFilledIndex;
    
    setTimeout(() => {
      inputRefs.current[targetFieldIndex]?.focus();
      setActiveInput(targetFieldIndex);
      // Place cursor at the end of the field
      const targetInput = inputRefs.current[targetFieldIndex];
      if (targetInput) {
        const len = newKey[targetFieldIndex].length;
        targetInput.setSelectionRange(len, len);
      }
    }, 0);
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !licenseKey[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      setActiveInput(index - 1);
    }
    if (e.key === 'Enter' && licenseKey.every(k => k.length === 4)) {
      handleActivate();
    }
  };

  const handleActivate = async () => {
    // Check if all license key segments are filled
    if (!licenseKey.every(k => k.length === 4)) {
      setError('Please enter a complete license key');
      return;
    }

    // Check if tenant ID is available
    if (!tenantId) {
      setError('Tenant ID is required. Please set up an instance first.');
      setActivationStatus('idle');
      return;
    }

    setError('');
    setActivationStatus('activating');

    try {
      // Join license key segments and remove any dashes
      const cleanedKey = licenseKey.join('').replace(/-/g, '');

      // Use tenant license endpoint
      const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/tenants/license`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: parseInt(tenantId),
          licenseKey: cleanedKey,
        }),
      });

      const data = await res.json();

      if (res.ok && data?.success) {
        // Clear license cache to force fresh check on next page load
        localStorage.removeItem('licenseLastCheck');
        localStorage.removeItem('licenseValid');
        // Set success status to trigger animation
        setActivationStatus('success');
      } else {
        setError(data?.message || 'Failed to activate license');
        setActivationStatus('idle');
      }
    } catch (err: any) {
      setError(err?.message || 'An error occurred while activating the license');
      setActivationStatus('idle');
    }
  };

  // Check for existing license on mount
  useEffect(() => {
    const checkLicense = async () => {
      try {
        // Build headers with tenant ID if available
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (tenantId) {
          headers['X-Tenant-ID'] = tenantId;
        }

        const res = await fetch(`${API_CONFIG.BACKEND_BASE_URL}/license/check`, {
          method: 'GET',
          headers,
        });

        // Check if backend connection failed
        if (!res.ok && (res.status === 0 || res.status >= 500)) {
          // Backend connection failed, stay on page (or redirect to error500 if needed)
          return;
        }

        const data = await res.json();

        if (res.ok && data?.success && data?.valid) {
          // License is valid, redirect to signin
          navigate('/signin', { replace: true });
        }
        // If valid is false (license table empty), stay on license page
      } catch (err) {
        // Network error - stay on page
        console.error('License check error:', err);
      }
    };

    checkLicense();
  }, [navigate]);

  // Redirect to signin after success animation completes
  useEffect(() => {
    if (activationStatus === 'success') {
      const redirectTimer = setTimeout(() => {
        navigate('/signin', { replace: true });
      }, 2500);

      return () => clearTimeout(redirectTimer);
    }
  }, [activationStatus, navigate]);

  // Theme-aware configuration
  const themeConfig = {
    bg: colors.background,
    text: colors.textPrimary,
    textSecondary: colors.textSecondary,
    glassBg: isDarkMode ? 'rgba(30, 30, 35, 0.6)' : 'rgba(255, 255, 255, 0.7)',
    glassBorder: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(226, 232, 240, 0.8)',
    inputBg: colors.card,
    inputBorder: colors.border,
    inputFocusBg: isDarkMode ? 'rgba(40, 40, 45, 1)' : '#ffffff',
    glowColor: isDarkMode ? 'rgba(59, 130, 246, 0.3)' : 'rgba(59, 130, 246, 0.2)',
    accentGradient1: isDarkMode ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
    accentGradient2: isDarkMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.08)',
    successText: isDarkMode ? '#34d399' : '#15803d',
    successBg: isDarkMode ? 'rgba(16, 185, 129, 0.1)' : 'rgba(220, 252, 231, 0.5)',
    placeholderColor: isDarkMode ? '#6b7280' : '#cbd5e1',
    cardShadow: isDarkMode 
      ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)' 
      : '0 25px 50px -12px rgba(148, 163, 184, 0.15)'
  };

  return (
    <div
      className="relative h-screen w-full overflow-hidden flex flex-col"
      style={{
        backgroundColor: themeConfig.bg,
        color: themeConfig.text,
        fontFamily: "'Space Grotesk', sans-serif"
      }}
    >
      {/* Theme Toggle - Top Right */}
      <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
        <Sun className={`w-4 h-4 transition-colors ${isDarkMode ? "text-zinc-600" : "text-amber-500"}`} />
        <button
          onClick={toggleTheme}
          className={`relative inline-flex h-6 w-11 rounded-full transition-all duration-300 shadow-inner ${
            isDarkMode ? "bg-zinc-700 shadow-zinc-900/50" : "bg-slate-200 shadow-slate-300/50"
          }`}
          aria-label="Toggle theme"
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full transition-all duration-300 shadow-md ${
              isDarkMode ? "bg-gradient-to-br from-blue-500 to-cyan-500 right-0.5" : "bg-white left-0.5"
            }`}
          />
        </button>
        <Moon className={`w-4 h-4 transition-colors ${isDarkMode ? "text-blue-400" : "text-zinc-400"}`} />
      </div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');

        /* OVERRIDE GLOBAL SCROLLBAR */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: ${themeConfig.bg};
        }
        ::-webkit-scrollbar-thumb {
          background: ${isDarkMode ? '#4b5563' : '#cbd5e1'};
          border-radius: 4px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: ${isDarkMode ? '#6b7280' : '#94a3b8'};
        }

        /* ANIMATIONS */
        @keyframes blur-in {
          0% { filter: blur(20px); opacity: 0; transform: translateY(30px) scale(0.95); }
          100% { filter: blur(0); opacity: 1; transform: translateY(0) scale(1); }
        }
        
        @keyframes slide-up {
          0% { opacity: 0; transform: translateY(40px); }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes draw-circle {
          0% { stroke-dashoffset: 1000; opacity: 0; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes draw-check {
          0% { stroke-dashoffset: 100; opacity: 0; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }

        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.5; }
          100% { transform: scale(1.3); opacity: 0; }
        }

        .animate-blur-in { animation: blur-in 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        .animate-slide-up { animation: slide-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
        
        .animate-draw-circle {
          stroke-dasharray: 1000;
          stroke-dashoffset: 1000;
          animation: draw-circle 1.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        .animate-draw-check {
          stroke-dasharray: 100;
          stroke-dashoffset: 100;
          animation: draw-check 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          animation-delay: 0.6s;
        }

        .animate-pulse-ring {
          animation: pulse-ring 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
        }

        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-500 { animation-delay: 500ms; }
        .delay-700 { animation-delay: 700ms; }
        
        .glass-panel {
          background: ${themeConfig.glassBg};
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid ${themeConfig.glassBorder};
          box-shadow: ${themeConfig.cardShadow};
          transition: all 0.5s ease;
        }

        .glow-text {
          text-shadow: 0 0 40px ${themeConfig.glowColor};
        }

        /* Loading Spinner */
        .spinner {
          width: 20px;
          height: 20px;
          border: 2px solid rgba(0,0,0,0.1);
          border-radius: 50%;
          border-top-color: #000;
          animation: spin 0.8s ease-in-out infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Force placeholder color */
        ::placeholder {
          color: ${themeConfig.placeholderColor} !important;
          opacity: 1 !important;
        }
      `}</style>

      {/* Abstract Background Elements - Light Mode Optimized */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] animate-[pulse_8s_ease-in-out_infinite]"
          style={{ background: themeConfig.accentGradient1 }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full blur-[150px] animate-[pulse_10s_ease-in-out_infinite]"
          style={{ background: themeConfig.accentGradient2 }}
        />
        <div className="absolute top-[50%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] contrast-150 brightness-100 mix-blend-multiply" />
      </div>

      <div className="relative z-10 h-full flex flex-col items-center justify-center px-4 md:px-6 py-4 min-h-0 overflow-hidden">

        {/* Main Card */}
        <div className="w-full max-w-3xl flex flex-col items-center justify-center flex-shrink-0">

          {/* Header Section */}
          {activationStatus !== 'success' && (
            <div className="mb-3 md:mb-4 text-center transition-all duration-500">

              <h1 
                className="animate-blur-in delay-100 text-3xl md:text-4xl lg:text-5xl font-black tracking-tighter mb-1 md:mb-2 leading-none"
                style={{ color: themeConfig.text }}
              >
                OCTOPUS
              </h1>
              <div className="animate-blur-in delay-200 flex items-center justify-center gap-2 md:gap-4 mb-1 md:mb-2">
                <span 
                  className="h-px w-8 md:w-12"
                  style={{ backgroundColor: themeConfig.textSecondary }}
                ></span>
                <span 
                  className="text-sm md:text-lg lg:text-xl font-bold tracking-[0.3em] uppercase"
                  style={{ color: themeConfig.textSecondary }}
                >
                  WMS
                </span>
                <span 
                  className="h-px w-8 md:w-12"
                  style={{ backgroundColor: themeConfig.textSecondary }}
                ></span>
              </div>
              <p
                className="animate-slide-up delay-200 text-xs md:text-sm lg:text-base font-medium max-w-md mx-auto leading-relaxed"
                style={{ color: themeConfig.textSecondary }}
              >
                Intelligent Warehouse Operating System
              </p>
            </div>
          )}

          {/* Dynamic Content Container */}
          <div className="relative w-full flex flex-col items-center">

            {/* INPUT FORM STATE */}
            {activationStatus !== 'success' && (
              <div
                className={`
                  w-full transition-all duration-700 ease-out
                  ${activationStatus === 'activating' ? 'opacity-50 scale-95 blur-sm pointer-events-none' : 'opacity-100'}
                `}
              >
                <div className="animate-blur-in delay-300 glass-panel rounded-[24px] md:rounded-[32px] p-4 md:p-6 lg:p-8 relative group overflow-hidden">

                  {/* Subtle Border Gradient */}
                  <div
                    className="absolute -inset-[1px] bg-gradient-to-r from-transparent via-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-sm pointer-events-none"
                  />

                  <div className="relative flex flex-col items-center gap-4 md:gap-6 lg:gap-8">

                    <h3 
                      className="text-sm font-bold uppercase tracking-widest"
                      style={{ color: themeConfig.textSecondary }}
                    >
                      Enter License Key
                    </h3>

                    <div className="w-full grid grid-cols-4 gap-2 md:gap-3 lg:gap-4">
                      {[0, 1, 2, 3].map((index) => (
                        <div key={index} className="relative">
                          <input
                            ref={(el) => { inputRefs.current[index] = el; }}
                            type="text"
                            maxLength={4}
                            value={licenseKey[index]}
                            onChange={(e) => handleChange(index, e.target.value)}
                            onKeyDown={(e) => handleKeyDown(index, e)}
                            onPaste={(e) => handlePaste(index, e)}
                            onFocus={(e) => {
                              setActiveInput(index);
                              e.currentTarget.style.backgroundColor = themeConfig.inputFocusBg;
                              e.currentTarget.style.borderColor = isDarkMode ? '#60a5fa' : '#3b82f6';
                              e.currentTarget.style.boxShadow = isDarkMode 
                                ? '0 4px 20px -2px rgba(96, 165, 250, 0.2)' 
                                : '0 4px 20px -2px rgba(59, 130, 246, 0.1)';
                            }}
                            onBlur={(e) => {
                              e.currentTarget.style.backgroundColor = themeConfig.inputBg;
                              e.currentTarget.style.borderColor = themeConfig.inputBorder;
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                            className="w-full text-center text-xl md:text-2xl lg:text-3xl font-bold tracking-[0.2em] py-3 md:py-4 lg:py-5 outline-none transition-all duration-300 rounded-xl border-2"
                            placeholder="0000"
                            style={{
                              backgroundColor: themeConfig.inputBg,
                              borderColor: themeConfig.inputBorder,
                              color: themeConfig.text,
                              caretColor: isDarkMode ? '#60a5fa' : '#3b82f6',
                              fontFamily: "'Space Grotesk', sans-serif"
                            }}
                          />
                        </div>
                      ))}
                    </div>

                    {error && (
                      <div
                        className="w-full p-4 rounded-xl text-sm font-medium animate-slide-up flex items-center justify-center gap-2"
                        style={{
                          backgroundColor: isDarkMode ? '#7f1d1d' : '#FEF2F2',
                          color: isDarkMode ? '#fca5a5' : '#EF4444',
                          border: `1px solid ${isDarkMode ? '#991b1b' : '#FECACA'}`
                        }}
                      >
                        <Activity className="w-4 h-4" />
                        {error}
                      </div>
                    )}

                    <div className="flex flex-col md:flex-row w-full gap-3 md:gap-4 items-center justify-between pt-2 md:pt-4">
                      <div
                        className="flex items-center gap-2 text-xs md:text-sm font-semibold tracking-wider uppercase transition-colors duration-500"
                        style={{ color: themeConfig.textSecondary }}
                      >
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <span>Secure Verification</span>
                      </div>

                      <button
                        onClick={handleActivate}
                        onMouseEnter={() => setIsHovered(true)}
                        onMouseLeave={() => setIsHovered(false)}
                        disabled={activationStatus === 'activating' || !licenseKey.every(k => k.length === 4)}
                        className="group relative w-full md:w-auto overflow-hidden rounded-xl px-10 py-4 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-wait shadow-xl"
                        style={{
                          backgroundColor: isDarkMode ? '#1e293b' : '#0f172a',
                          color: '#ffffff',
                          boxShadow: isDarkMode 
                            ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.2)' 
                            : '0 20px 25px -5px rgba(59, 130, 246, 0.2), 0 10px 10px -5px rgba(59, 130, 246, 0.1)'
                        }}
                      >
                        <div className="relative z-10 flex items-center justify-center gap-3 font-bold uppercase tracking-wider text-sm">
                          {activationStatus === 'activating' ? (
                            <>
                              <div className="spinner border-white/20 border-t-white" />
                              <span>Verifying...</span>
                            </>
                          ) : (
                            <>
                              <span>Activate Product</span>
                              <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`} />
                            </>
                          )}
                        </div>
                      </button>
                    </div>

                  </div>
                </div>

                {/* Footer Features */}
                <div className="animate-slide-up delay-500 mt-3 md:mt-4 grid grid-cols-1 md:grid-cols-3 gap-2 md:gap-3 text-center md:text-left w-full max-w-3xl">
                  {[
                    { icon: Box, label: "Inventory Control", desc: "Real-time tracking" },
                    { icon: Truck, label: "Smart Fulfillment", desc: "AI-driven routing" },
                    { icon: Activity, label: "Analytics Engine", desc: "Predictive insights" }
                  ].map((feature, i) => (
                    <div
                      key={i}
                      className="group p-3 rounded-xl transition-all duration-300 cursor-default border border-transparent"
                      style={{
                        backgroundColor: 'transparent',
                        borderColor: 'transparent',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = isDarkMode 
                          ? 'rgba(255, 255, 255, 0.05)' 
                          : 'rgba(255, 255, 255, 0.5)';
                        e.currentTarget.style.borderColor = themeConfig.glassBorder;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                    >
                      <div 
                        className="mb-3 mx-auto md:mx-0 w-max"
                        style={{ color: themeConfig.text }}
                      >
                        <feature.icon 
                          className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" 
                          style={{ color: isDarkMode ? '#60a5fa' : '#2563eb' }}
                        />
                      </div>
                      <h3 
                        className="font-bold text-sm tracking-wide mb-1"
                        style={{ color: themeConfig.text }}
                      >
                        {feature.label}
                      </h3>
                      <p 
                        className="text-xs"
                        style={{ color: themeConfig.textSecondary }}
                      >
                        {feature.desc}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SUCCESS STATE */}
            {activationStatus === 'success' && (
              <div className="absolute inset-0 z-30 flex items-center justify-center animate-blur-in">
                <div 
                  className="glass-panel w-full rounded-[24px] md:rounded-[32px] p-4 md:p-6 lg:p-8 text-center relative overflow-hidden max-h-[90vh] overflow-y-auto"
                  style={{
                    backgroundColor: isDarkMode ? 'rgba(30, 30, 35, 0.9)' : 'rgba(255, 255, 255, 0.8)'
                  }}
                >

                  {/* Confetti / Glow Effect */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-emerald-500/10 rounded-full blur-[80px] animate-pulse-ring pointer-events-none" />

                  <div className="relative z-10 flex flex-col items-center">

                    {/* Animated Checkmark SVG */}
                    <div className="mb-8 relative w-24 h-24">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
                        {/* Outer Circle Drawing */}
                        <circle
                          cx="50" cy="50" r="45"
                          fill="none"
                          stroke={themeConfig.successText}
                          strokeWidth="2"
                          strokeLinecap="round"
                          className="animate-draw-circle rotate-[-90deg] origin-center"
                        />
                        {/* Inner Check Drawing */}
                        <path
                          d="M30 52 L45 67 L75 35"
                          fill="none"
                          stroke={themeConfig.successText}
                          strokeWidth="5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="animate-draw-check"
                        />
                      </svg>
                    </div>

                    <h2 
                      className="text-3xl md:text-4xl font-bold mb-3 tracking-tight animate-slide-up delay-200"
                      style={{ color: themeConfig.text }}
                    >
                      Activation Successful
                    </h2>

                    <p
                      className="text-lg mb-8 animate-slide-up delay-300"
                      style={{ color: themeConfig.textSecondary }}
                    >
                      License has been verified successfully. Redirecting to sign in...
                    </p>

                    {/* License Detail Card */}
                    <div
                      className="w-full rounded-2xl p-6 border animate-slide-up delay-500 flex flex-col gap-4"
                      style={{
                        backgroundColor: colors.mutedBg,
                        borderColor: colors.border
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <span 
                          className="text-xs uppercase tracking-widest font-bold"
                          style={{ color: themeConfig.textSecondary }}
                        >
                          License Key
                        </span>
                        <div className="flex items-center gap-2">
                          <span 
                            className="font-mono text-sm tracking-wider font-bold"
                            style={{ color: themeConfig.text }}
                          >
                            {licenseKey.join('-')}
                          </span>
                          <div 
                            className="p-1 rounded cursor-pointer transition-colors"
                            style={{
                              color: themeConfig.textSecondary,
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = colors.border;
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </div>
                        </div>
                      </div>

                      <div 
                        className="h-px w-full"
                        style={{ backgroundColor: colors.border }}
                      />

                      <div className="flex items-center justify-between">
                        <span 
                          className="text-xs uppercase tracking-widest font-bold"
                          style={{ color: themeConfig.textSecondary }}
                        >
                          Valid Until
                        </span>
                        <span 
                          className="font-bold px-2 py-1 rounded border text-sm"
                          style={{
                            color: themeConfig.successText,
                            backgroundColor: themeConfig.successBg,
                            borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : '#d1fae5'
                          }}
                        >
                          {expiryDate}
                        </span>
                      </div>
                    </div>

                    <div 
                      className="mt-8 text-sm font-medium animate-slide-up delay-700 flex items-center justify-center gap-2"
                      style={{ color: themeConfig.textSecondary }}
                    >
                      <div 
                        className="spinner" 
                        style={{ 
                          width: '16px', 
                          height: '16px', 
                          borderWidth: '2px',
                          borderColor: isDarkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
                          borderTopColor: isDarkMode ? '#ffffff' : themeConfig.textSecondary
                        }} 
                      />
                      <span>Redirecting to Dashboard...</span>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>

        </div>
      </div>
    </div>
  );
};

export default LicensePage;
