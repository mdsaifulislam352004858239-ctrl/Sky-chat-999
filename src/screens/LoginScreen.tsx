import React, { useState, useEffect, useRef } from 'react';
import { 
  Cloud, 
  ArrowRight, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  MessageSquare, 
  Copy, 
  Check, 
  X, 
  RefreshCw, 
  Mail, 
  Phone,
  Sparkles,
  User as UserIcon,
  CheckCheck
} from 'lucide-react';
import { countries, playSmsNotificationSound } from '../services/phoneUtils';
import { useAuth } from '../context/AuthContext';

export const LoginScreen: React.FC = () => {
  const { 
    sendPhoneOtp, 
    verifyOtp, 
    resendPhoneOtp, 
    loginWithGoogle, 
    loading,
    activeOtp 
  } = useAuth();

  // Active Login Method Tab: 'phone' or 'gmail'
  const [loginMethod, setLoginMethod] = useState<'phone' | 'gmail'>('phone');

  // Phone Login State
  const [selectedCountry, setSelectedCountry] = useState(countries[0]);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [isPhoneLoading, setIsPhoneLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);

  // Incoming SMS notification banner state
  const [incomingSms, setIncomingSms] = useState<{
    code: string;
    timestamp: number;
    copied: boolean;
  } | null>(null);

  // Countdown timer for resending OTP (60s)
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Any Gmail Login State
  const [gmailAddress, setGmailAddress] = useState('');
  const [userName, setUserName] = useState('');
  const [isGmailLoading, setIsGmailLoading] = useState(false);

  // Common UI State
  const [error, setError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Timer countdown handler
  useEffect(() => {
    if (step === 'otp' && countdown > 0) {
      timerRef.current = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [step, countdown]);

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessNotice(null);

    const rawDigits = phoneNumber.trim().replace(/\D/g, '');
    const cleanDigits = rawDigits.startsWith('0') ? rawDigits.substring(1) : rawDigits;
    const fullNumber = `${selectedCountry.code}${cleanDigits}`;

    if (cleanDigits.length < 6) {
      setError('অনুগ্রহ করে সঠিক মোবাইল নম্বর লিখুন (Please enter a valid mobile number)');
      return;
    }

    setIsPhoneLoading(true);
    try {
      const result = await sendPhoneOtp(fullNumber);
      if (result.success) {
        setStep('otp');
        setOtpCode(['', '', '', '', '', '']);
        setCountdown(60);
        setCanResend(false);

        // Play realistic SMS chime & vibrate
        playSmsNotificationSound();

        // Trigger realistic SMS notification banner
        setIncomingSms({
          code: result.otp,
          timestamp: Date.now(),
          copied: false,
        });

        // Focus first OTP input after DOM updates
        setTimeout(() => {
          inputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError('ভেরিফিকেশন ওটিপি পাঠাতে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।');
      }
    } catch (err: any) {
      setError(err?.message || 'মোবাইল নম্বরে ওটিপি পাঠাতে ব্যর্থ হয়েছে।');
    } finally {
      setIsPhoneLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setError(null);
    try {
      const newOtp = await resendPhoneOtp();
      setCountdown(60);
      setCanResend(false);

      // Sound & vibration
      playSmsNotificationSound();

      // Show fresh incoming SMS notification banner
      setIncomingSms({
        code: newOtp,
        timestamp: Date.now(),
        copied: false,
      });
    } catch {
      setError('ওটিপি পুনরায় পাঠাতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handleAutoFillOtp = (code: string) => {
    const digits = code.split('').slice(0, 6);
    const newOtp = ['', '', '', '', '', ''];
    digits.forEach((d, i) => {
      newOtp[i] = d;
    });
    setOtpCode(newOtp);
    setError(null);

    // Auto submit after short visual delay
    setTimeout(() => {
      submitOtpCode(newOtp.join(''));
    }, 200);
  };

  const handleCopyOtp = (code: string) => {
    try {
      navigator.clipboard?.writeText(code);
      if (incomingSms) {
        setIncomingSms({ ...incomingSms, copied: true });
        setTimeout(() => {
          setIncomingSms((prev) => (prev ? { ...prev, copied: false } : null));
        }, 2000);
      }
    } catch {
      // ignore clipboard error
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    const digitsOnly = value.replace(/\D/g, '');

    // Handle pasting entire code into one box
    if (digitsOnly.length > 1) {
      const newOtp = [...otpCode];
      digitsOnly.slice(0, 6).split('').forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpCode(newOtp);
      const targetIndex = Math.min(digitsOnly.length, 5);
      inputRefs.current[targetIndex]?.focus();

      if (digitsOnly.length >= 6) {
        submitOtpCode(digitsOnly.slice(0, 6));
      }
      return;
    }

    const singleDigit = digitsOnly.slice(-1);
    const newOtp = [...otpCode];
    newOtp[index] = singleDigit;
    setOtpCode(newOtp);

    // Auto-focus next input
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // If completed 6 digits, auto trigger submit
    if (singleDigit && index === 5) {
      const fullCode = newOtp.join('');
      if (fullCode.length === 6) {
        submitOtpCode(fullCode);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length > 0) {
      const newOtp = [...otpCode];
      pasted.split('').forEach((d, i) => {
        if (i < 6) newOtp[i] = d;
      });
      setOtpCode(newOtp);
      const targetIndex = Math.min(pasted.length, 5);
      inputRefs.current[targetIndex]?.focus();

      if (pasted.length === 6) {
        submitOtpCode(pasted);
      }
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!otpCode[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    }
  };

  const submitOtpCode = async (codeToVerify: string) => {
    if (codeToVerify.length !== 6) {
      setError('অনুগ্রহ করে ৬ ডিজিটের সম্পূর্ণ ওটিপি কোডটি লিখুন');
      return;
    }

    setIsVerifying(true);
    setError(null);
    try {
      const result = await verifyOtp(codeToVerify);
      if (!result.success) {
        setError(result.error || 'ভুল ওটিপি কোড! অনুগ্রহ করে আপনার মোবাইলে আসা সঠিক কোডটি দিন।');
      }
    } catch (err: any) {
      setError(err?.message || 'যাচাইকরণ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleOtpFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitOtpCode(otpCode.join(''));
  };

  /**
   * Safe, 100% reliable Gmail login with ANY Gmail address
   * Never triggers popups, iframe redirects, or kick-outs
   */
  const handleGmailLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const email = gmailAddress.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setError('অনুগ্রহ করে একটি সঠিক জিমেইল বা ইমেইল ঠিকানা দিন (e.g. user@gmail.com)');
      return;
    }

    setIsGmailLoading(true);
    try {
      const displayName = userName.trim() || email.split('@')[0];
      const success = await loginWithGoogle({
        email,
        displayName,
      });
      if (!success) {
        setError('জিমেইল দিয়ে লগইন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      }
    } catch (err: any) {
      setError(err?.message || 'লগইন করতে ব্যর্থ হয়েছে।');
    } finally {
      setIsGmailLoading(false);
    }
  };

  /**
   * Instant 1-tap quick login with HT Saiful Islam
   */
  const handleQuickLoginHTSaiful = async () => {
    setError(null);
    setIsGmailLoading(true);
    try {
      await loginWithGoogle({
        email: 'htsaifulislam24@gmail.com',
        displayName: 'HT Saiful Islam',
      });
    } catch {
      setError('লগইন ব্যর্থ হয়েছে।');
    } finally {
      setIsGmailLoading(false);
    }
  };

  const currentDisplayOtp = incomingSms?.code || activeOtp || '123456';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8 relative overflow-x-hidden">
      
      {/* Real-time SMS Push Notification Toast */}
      {incomingSms && (
        <div className="fixed top-4 left-4 right-4 max-w-md mx-auto z-50 animate-in slide-in-from-top-6 duration-300">
          <div className="bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white rounded-2xl p-4 shadow-2xl border border-slate-700/60 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 rounded-lg bg-sky-500 flex items-center justify-center text-white shadow-xs">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-bold tracking-wider uppercase text-sky-400">
                  SMS Message • Just Now
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIncomingSms(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-200 leading-relaxed">
              <span className="font-semibold text-white">Sky Chat Security: </span>
              Your 6-digit phone verification code is{' '}
              <span className="font-mono font-bold text-sky-400 text-sm tracking-widest px-1.5 py-0.5 rounded bg-sky-950/60 border border-sky-500/30">
                {incomingSms.code}
              </span>
              . Valid for 5 minutes. Never share this code.
            </div>

            {/* Quick Action Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => handleAutoFillOtp(incomingSms.code)}
                className="flex-1 flex items-center justify-center space-x-1.5 py-1.5 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Auto-Fill Code (স্বয়ংক্রিয় পূরণ)</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyOtp(incomingSms.code)}
                className="flex items-center justify-center space-x-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
              >
                {incomingSms.copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Logo */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-500/20">
            <Cloud className="w-9 h-9 text-white fill-white/30" />
          </div>
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Welcome to Sky Chat
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Fast, secure messaging with HD audio & video calls
        </p>
      </div>

      {/* Main Card */}
      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-slate-900 py-7 px-5 sm:px-8 shadow-xl sm:rounded-3xl border border-slate-100 dark:border-slate-800">
          
          {/* Method Switcher Tabs (Phone vs Any Gmail) */}
          {step === 'phone' && (
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod('phone');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  loginMethod === 'phone'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>মোবাইল নম্বর (OTP)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLoginMethod('gmail');
                  setError(null);
                }}
                className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  loginMethod === 'gmail'
                    ? 'bg-white dark:bg-slate-700 text-sky-600 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>যেকোনো জিমেইল (Gmail)</span>
              </button>
            </div>
          )}

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 flex items-start space-x-2.5 text-rose-600 dark:text-rose-400 text-xs leading-relaxed animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successNotice && (
            <div className="mb-5 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-start space-x-2.5 text-emerald-600 dark:text-emerald-400 text-xs leading-relaxed animate-in fade-in">
              <CheckCheck className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{successNotice}</span>
            </div>
          )}

          {/* TAB 1: PHONE LOGIN (NUMBER -> OTP) */}
          {loginMethod === 'phone' && (
            <>
              {step === 'phone' ? (
                <form onSubmit={handlePhoneSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                      মোবাইল নম্বর লিখুন (Mobile Number)
                    </label>
                    <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus-within:ring-2 focus-within:ring-sky-500 focus-within:border-sky-500 transition-all overflow-hidden">
                      <select
                        value={selectedCountry.code}
                        onChange={(e) => {
                          const c = countries.find((item) => item.code === e.target.value);
                          if (c) setSelectedCountry(c);
                        }}
                        className="bg-transparent border-none py-3.5 pl-3 pr-1 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer"
                      >
                        {countries.map((c) => (
                          <option key={c.code} value={c.code} className="dark:bg-slate-800 text-slate-800 dark:text-slate-100">
                            {c.flag} {c.code} ({c.name})
                          </option>
                        ))}
                      </select>

                      <div className="w-px bg-slate-200 dark:bg-slate-700 my-2.5" />

                      <input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder={selectedCountry.example}
                        required
                        autoFocus
                        className="flex-1 bg-transparent px-3.5 py-3.5 text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                    <p className="mt-1.5 text-xs text-slate-400">
                      নম্বর দেওয়ার সাথে সাথে স্ক্রিনে ৬ ডিজিটের ওটিপি কোড পাঠানো হবে।
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isPhoneLoading}
                    className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/25 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    {isPhoneLoading ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>ওটিপি কোড পাঠানো হচ্ছে...</span>
                      </div>
                    ) : (
                      <>
                        <span>ওটিপি কোড পান (Get OTP)</span>
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                /* Step: OTP Verification */
                <form onSubmit={handleOtpFormSubmit} className="space-y-4 animate-in fade-in duration-200">
                  <div className="text-center">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-sky-50 dark:bg-sky-950/50 text-sky-500 mb-2">
                      <ShieldCheck className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                      মোবাইল নম্বর যাচাইকরণ
                    </h3>
                    <div className="mt-1 flex items-center justify-center space-x-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                      <span>{selectedCountry.code} {phoneNumber.replace(/^0+/, '')}</span>
                      <button
                        type="button"
                        onClick={() => setStep('phone')}
                        className="text-sky-600 dark:text-sky-400 hover:underline font-medium text-[11px] ml-1 cursor-pointer"
                      >
                        (নম্বর পরিবর্তন)
                      </button>
                    </div>
                  </div>

                  {/* Prominent On-Screen OTP Box with 1-Tap Auto-Fill */}
                  <div className="p-3.5 rounded-2xl bg-sky-50/80 dark:bg-sky-950/40 border border-sky-200/80 dark:border-sky-800/60 text-slate-900 dark:text-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5 text-sky-500" />
                        আপনার সিকিউরিটি ওটিপি কোড:
                      </span>
                      <span className="font-mono font-bold text-sm text-sky-600 dark:text-sky-400 tracking-wider px-2 py-0.5 rounded bg-white dark:bg-slate-800 border border-sky-300 dark:border-sky-700">
                        {currentDisplayOtp}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAutoFillOtp(currentDisplayOtp)}
                      className="w-full flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-sky-500 hover:bg-sky-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>অটো-ফিল কোড ও সরাসরি অ্যাপে প্রবেশ (Auto-Fill & Enter)</span>
                    </button>
                  </div>

                  {/* 6-Digit OTP Input Boxes */}
                  <div>
                    <label className="block text-xs font-semibold text-center text-slate-600 dark:text-slate-400 mb-2.5">
                      অথবা ৬ ডিজিটের কোডটি নিজে লিখুন
                    </label>
                    <div className="flex justify-between gap-1.5 sm:gap-2">
                      {otpCode.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => {
                            inputRefs.current[index] = el;
                          }}
                          id={`otp-${index}`}
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          onPaste={handleOtpPaste}
                          className={`w-10 h-12 sm:w-11 sm:h-12 text-center text-lg font-bold rounded-xl border bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white transition-all focus:outline-none ${
                            digit
                              ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/20 dark:bg-sky-950/20'
                              : 'border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-sky-500 focus:border-sky-500'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Verify Button */}
                  <button
                    type="submit"
                    disabled={isVerifying}
                    className="w-full flex items-center justify-center py-3.5 px-4 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/25 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                  >
                    {isVerifying ? (
                      <div className="flex items-center space-x-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>কোড যাচাই করা হচ্ছে...</span>
                      </div>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        <span>যাচাই করে অ্যাপে প্রবেশ করুন</span>
                      </>
                    )}
                  </button>

                  {/* Resend and Change Number Bar */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <button
                      type="button"
                      onClick={() => setStep('phone')}
                      className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium cursor-pointer"
                    >
                      নম্বর পরিবর্তন
                    </button>

                    {canResend ? (
                      <button
                        type="button"
                        onClick={handleResendOtp}
                        className="flex items-center space-x-1 text-sky-600 dark:text-sky-400 hover:text-sky-700 font-semibold cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>নতুন ওটিপি কোড পাঠান</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 font-medium">
                        পুনরায় কোড পাঠানোর সময়: <span className="font-semibold text-slate-600 dark:text-slate-300">00:{countdown < 10 ? `0${countdown}` : countdown}</span>
                      </span>
                    )}
                  </div>
                </form>
              )}
            </>
          )}

          {/* TAB 2: ANY GMAIL / GOOGLE LOGIN */}
          {loginMethod === 'gmail' && (
            <div className="space-y-4 animate-in fade-in duration-200">
              
              {/* Option A: Quick 1-tap with HT Saiful Islam */}
              <div>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  ১-ক্লিকে সাইন ইন (Quick Sign In)
                </p>
                <button
                  type="button"
                  onClick={handleQuickLoginHTSaiful}
                  disabled={isGmailLoading || loading}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-xs transition-all duration-200 disabled:opacity-60 cursor-pointer"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <div className="text-left min-w-0">
                      <p className="text-xs font-bold text-slate-800 dark:text-white truncate">
                        HT Saiful Islam
                      </p>
                      <p className="text-[11px] text-slate-400 truncate">
                        htsaifulislam24@gmail.com
                      </p>
                    </div>
                  </div>
                  {isGmailLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin text-sky-500 shrink-0" />
                  ) : (
                    <span className="text-[11px] font-semibold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-full shrink-0">
                      লগইন করুন
                    </span>
                  )}
                </button>
              </div>

              {/* OR Divider */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-900 px-3 text-slate-400 font-medium">
                    অথবা যেকোনো ভিন্ন জিমেইল দিয়ে
                  </span>
                </div>
              </div>

              {/* Option B: Enter ANY Gmail address and Name */}
              <form onSubmit={handleGmailLoginSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    যেকোনো জিমেইল অ্যাকাউন্ট (Any Gmail Address)
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={gmailAddress}
                      onChange={(e) => setGmailAddress(e.target.value)}
                      placeholder="e.g. friend@gmail.com, yourname@gmail.com"
                      required
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    যেকোনো ভিন্ন জিমেইল দিয়ে লগইন করলে তার নিজস্ব ইউনিক অ্যাকাউন্ট তৈরি হবে।
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    আপনার নাম (Display Name - ঐচ্ছিক)
                  </label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      placeholder="e.g. Shakib Khan, Tanvir, etc."
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isGmailLoading || !gmailAddress.trim()}
                  className="w-full flex items-center justify-center py-3 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 shadow-md shadow-sky-500/25 transition-all duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {isGmailLoading ? (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>প্রবেশ করা হচ্ছে...</span>
                    </div>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      <span>এই জিমেইল দিয়ে অ্যাপে প্রবেশ করুন (Sign In)</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Developer Attribution Card */}
          <div className="mt-7 pt-4 border-t border-slate-100 dark:border-slate-800 text-center space-y-2.5">
            <p className="text-[11px] text-slate-400">
              Sky Chat • নিরাপদ ও দ্রুতগতির মেসেজিং প্ল্যাটফর্ম
            </p>
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold tracking-wide border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                <span>Developer</span>
                <span className="font-bold text-sky-600 dark:text-sky-400">HT Saiful Islam</span>
              </span>
            </div>
          </div>
        </div>

        {/* Developer Attribution Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">
            Developer  HT Saiful Islam
          </p>
        </div>
      </div>
    </div>
  );
};
