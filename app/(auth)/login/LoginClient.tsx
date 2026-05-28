"use client";

import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, Lock, Shield, Eye, EyeOff } from "lucide-react";

interface Props {
  logos?: { light: string | null; dark: string | null } | null;
  googleClientId?: string | null;
  enableGoogleSignin?: boolean;
}

type GoogleCredentialResponse = {
  credential?: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_black" | "filled_blue";
              size?: "large" | "medium" | "small";
              type?: "standard" | "icon";
              shape?: "pill" | "rectangular" | "square" | "circle";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              width?: string | number;
            }
          ) => void;
        };
      };
    };
  }
}

export default function LoginClient({
  logos,
  googleClientId,
  enableGoogleSignin = false,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState("");
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const googleLoadTimeoutRef = useRef<number | null>(null);

  const loadGoogleButton = () => {
    const container = googleButtonRef.current;
    const google = window.google;

    if (!container || !google?.accounts?.id || !googleClientId) return false;

    try {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          if (!credential) {
            setError("Google sign-in failed. Please try again.");
            return;
          }

          setError("");
          setGoogleError("");
          setGoogleLoading(true);

          try {
            const result = await signIn("google-id-token", {
              idToken: credential,
              redirect: false,
            });

            if (result?.error) {
              setError(result.error);
              return;
            }

            router.push(callbackUrl);
            router.refresh();
          } catch {
            setError("Google sign-in failed. Please try again.");
          } finally {
            setGoogleLoading(false);
          }
        },
      });

      container.innerHTML = "";
      google.accounts.id.renderButton(container, {
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "signin_with",
        width: "320",
      });

      setGoogleReady(true);
      setGoogleError("");
      return true;
    } catch {
      setGoogleError("Google sign-in failed to initialize.");
      setGoogleReady(false);
      return false;
    }
  };

  useEffect(() => {
    if (!enableGoogleSignin || !googleClientId) return;

    setGoogleReady(false);
    setGoogleError("");

    if (window.google?.accounts?.id) {
      loadGoogleButton();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );

    if (existingScript) {
      existingScript.addEventListener("load", loadGoogleButton, { once: true });
      existingScript.addEventListener("error", () => {
        setGoogleError("Unable to load Google sign-in.");
      }, { once: true });
      return () => {
        existingScript.removeEventListener("load", loadGoogleButton);
      };
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = loadGoogleButton;
    script.onerror = () => setGoogleError("Unable to load Google sign-in.");
    document.head.appendChild(script);

    googleLoadTimeoutRef.current = window.setTimeout(() => {
      if (!googleReady) {
        setGoogleError("Google sign-in is taking too long to load. Check your network or ad blocker.");
      }
    }, 8000);

    return () => {
      script.onload = null;
      script.onerror = null;
      if (googleLoadTimeoutRef.current) {
        window.clearTimeout(googleLoadTimeoutRef.current);
      }
    };
  }, [enableGoogleSignin, googleClientId, callbackUrl, router, googleReady]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("An unexpected error occurred");
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-[380px] px-4 py-6">
      <div className="rounded-xl bg-[#fbfbfc] dark:bg-[#121827] border border-[#e9ebf0] dark:border-white/10 px-8 py-8 shadow-sm">
        <div className="flex justify-center mb-6">
          {logos?.light || logos?.dark ? (
            <div className="h-20 flex items-center justify-center">
              {logos?.light && (
                <img
                  src={logos.light}
                  alt="System logo"
                  className="h-20 w-auto object-contain dark:hidden"
                />
              )}
              {logos?.dark && (
                <img
                  src={logos.dark}
                  alt="System logo"
                  className="h-20 w-auto object-contain hidden dark:block"
                />
              )}
            </div>
          ) : (
            <div className="h-16 w-16 rounded-full bg-[#fff1f4] flex items-center justify-center">
              <Shield className="h-8 w-8 text-[#c91f41]" />
            </div>
          )}
        </div>

        <div className="mb-6 text-center">
          <h1 className="text-2xl leading-tight font-black tracking-tight text-[#1b2536] dark:text-white">Welcome Back</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@crimson.gallery"
              required
              className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 text-sm font-semibold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-[11px] font-black uppercase tracking-[0.1em] text-[#75666f] dark:text-slate-300">
                Password
              </label>
              <Link
                href="/password-reset"
                className="text-[11px] font-black uppercase tracking-[0.06em] text-[#d54b6b] hover:text-[#c91f41]"
              >
                Reset?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 rounded-xl border border-transparent bg-[#dfe7f8] dark:bg-slate-800/80 px-4 pr-11 text-sm font-semibold text-[#25314a] dark:text-slate-100 placeholder:text-[#9ba7c0] focus:outline-none focus:ring-2 focus:ring-[#c91f41]/35"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-[#75666f] dark:text-slate-400 hover:text-[#c91f41]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || googleLoading}
            className="mt-1 w-full h-12 rounded-xl bg-[#c91f41] text-white text-base font-black tracking-tight shadow-[0_8px_16px_-8px_rgba(201,31,65,0.55)] hover:bg-[#b71b3a] transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing In...
              </>
            ) : (
              "Secure Login"
            )}
          </button>

          {enableGoogleSignin ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.18em] font-black text-[#8d7f88]">
                <span className="h-px flex-1 bg-[#e3dfe4]" />
                or
                <span className="h-px flex-1 bg-[#e3dfe4]" />
              </div>

              <div className="flex justify-center">
                <div ref={googleButtonRef} className="min-h-[44px]" />
              </div>

              {!googleReady ? (
                <div className="text-center space-y-2">
                  <p className="text-[11px] text-center font-semibold text-[#8d7f88]">
                    {googleError || "Preparing Google sign-in..."}
                  </p>
                  {googleError ? (
                    <button
                      type="button"
                      onClick={() => loadGoogleButton()}
                      className="text-[11px] font-black uppercase tracking-[0.12em] text-[#c91f41]"
                    >
                      Retry
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </form>

        <div className="mt-6 flex items-center justify-center gap-1.5 text-[#6d6169] dark:text-slate-300">
          <Lock className="h-3.5 w-3.5" />
          <span className="text-[11px] font-black uppercase tracking-[0.15em]">Encrypted Enterprise Access</span>
        </div>
      </div>

      <p className="mt-5 text-center text-xs font-medium text-[#726a72] dark:text-slate-300">
        Protected by 256-bit SSLEncryption.
        <span className="font-black text-[#2b3648] dark:text-white"> Privacy Policy</span>
      </p>
    </div>
  );
}
