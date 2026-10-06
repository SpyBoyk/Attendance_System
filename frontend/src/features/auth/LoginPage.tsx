import { type ChangeEvent, type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from "react";
import {
  Camera,
  CameraOff,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  ScanFace,
  ShieldCheck,
  User as UserIcon,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { Navigate, useNavigate } from "react-router";
import { toast } from "sonner";

import { login, loginFace, register } from "@/api/auth";
import { extractApiErrorMessage, setStoredAuth } from "@/api/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

function homeForRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "/admin";
    case "TEACHER":
    case "HOD":
      return "/teacher";
    default:
      return "/student";
  }
}

const BADGES = [
  { icon: Camera, label: "Face Recognition" },
  { icon: ShieldCheck, label: "Role-Based Access" },
  { icon: UsersIcon, label: "Live Roster" },
];

type Mode = "signin" | "register";
type SignInMethod = "face" | "password";

export function LoginPage() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [signInMethod, setSignInMethod] = useState<SignInMethod>("face");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLockOn, setCapsLockOn] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isRegister = mode === "register";
  const isFaceSignIn = mode === "signin" && signInMethod === "face";

  useEffect(() => {
    if (!isFaceSignIn || !cameraOn) return;
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        toast.error("Could not access the camera");
        setCameraOn(false);
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [isFaceSignIn, cameraOn]);

  if (isAuthenticated && user) return <Navigate to={homeForRole(user.role)} replace />;

  function switchMode(next: Mode) {
    setMode(next);
    setFormError("");
    setPassword("");
    setCameraOn(false);
  }

  function switchSignInMethod(next: SignInMethod) {
    setSignInMethod(next);
    setFormError("");
    setCameraOn(false);
  }

  const checkCapsLock = (e: KeyboardEvent<HTMLInputElement>) => {
    if (typeof e.getModifierState === "function") setCapsLockOn(e.getModifierState("CapsLock"));
  };

  function handlePhotoChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function clearPhoto() {
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhoto(null);
    setPhotoPreview(null);
    if (photoInputRef.current) photoInputRef.current.value = "";
  }

  async function captureAndLoginFace() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      setFormError("Camera isn't ready yet -- give it a second and try again.");
      return;
    }
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);

    setFormError("");
    setSubmitting(true);
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          setSubmitting(false);
          return;
        }
        try {
          const { access_token, user: loggedInUser } = await loginFace(blob);
          setStoredAuth({ access_token, user: loggedInUser });
          navigate(homeForRole(loggedInUser.role), { replace: true });
        } catch (err) {
          setFormError(extractApiErrorMessage(err));
        } finally {
          setSubmitting(false);
        }
      },
      "image/jpeg",
      0.9,
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (isRegister && !photo) {
      setFormError("Upload a photo of your face to finish registering.");
      return;
    }

    setSubmitting(true);
    try {
      if (isRegister) {
        const result = await register(fullName, email, password, photo!);
        toast.success(result.detail);
        switchMode("signin");
        setFullName("");
        clearPhoto();
      } else {
        const { access_token, user: loggedInUser } = await login(email, password);
        setStoredAuth({ access_token, user: loggedInUser });
        navigate(homeForRole(loggedInUser.role), { replace: true });
      }
    } catch (err) {
      setFormError(extractApiErrorMessage(err));
      toast.error(extractApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-x-hidden overflow-y-auto bg-canvas text-ink md:fixed md:inset-0 md:h-screen md:w-screen md:flex-row md:overflow-hidden">
      {/* Brand panel -- full hero on desktop, a compact banner on mobile so a
          phone still opens on the brand instead of a bare form. */}
      <div className="relative flex w-full shrink-0 items-center justify-center overflow-hidden bg-canvas md:h-full md:w-[60%]">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-brand-50 via-canvas to-brand-100/60" />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{ backgroundImage: "radial-gradient(rgb(var(--brand-700)/0.12) 1px, transparent 1px)", backgroundSize: "18px 18px" }}
        />
        <div
          className="pointer-events-none absolute -left-24 -top-24 h-[420px] w-[420px] rounded-full opacity-70 blur-3xl motion-safe:animate-[login-glow-pulse_9s_ease-in-out_infinite]"
          style={{ background: "radial-gradient(circle, rgb(var(--brand-700)/0.16) 0%, transparent 70%)" }}
        />
        <div
          className="pointer-events-none absolute -bottom-32 right-[8%] h-[380px] w-[380px] rounded-full opacity-60 blur-3xl motion-safe:animate-[login-glow-pulse_11s_ease-in-out_infinite_1.5s]"
          style={{ background: "radial-gradient(circle, rgb(var(--brand-600)/0.12) 0%, transparent 70%)" }}
        />
        <div className="pointer-events-none absolute inset-y-0 -right-24 hidden w-48 -skew-x-6 bg-surface shadow-[-15px_0_50px_rgba(16,24,40,0.06)] md:block" />

        {/* Desktop hero */}
        <div className="relative z-10 hidden flex-col items-center px-10 py-16 text-center md:flex animate-[login-panel-in_0.5s_cubic-bezier(0.16,1,0.3,1)_both]">
          <img
            src="/GIT-logo-new.png"
            alt="Gharda Institute of Technology"
            className="mb-7 h-20 w-auto max-w-[320px] object-contain drop-shadow-[0_8px_20px_rgba(16,24,40,0.15)]"
          />
          <span className="label-eyebrow mb-3.5 block text-brand-700">* Smart College Attendance *</span>
          <h1 className="mb-3.5 text-2xl font-bold leading-snug text-brand-900">
            Attendance, tracked
            <br />
            the moment it happens.
          </h1>
          <p className="mb-5 text-[11px] font-medium tracking-wide text-ink-faint">GIT ATTENDANCE // Face Check-In &amp; Session Roster</p>
          <div className="flex flex-wrap items-center justify-center gap-2.5">
            {BADGES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1.5 border border-brand-700/15 bg-surface/70 px-2.5 py-1 text-[11px] font-bold tracking-wide text-brand-800 uppercase shadow-xs backdrop-blur-sm transition-all duration-200 [clip-path:polygon(5px_0,100%_0,calc(100%-5px)_100%,0_100%)] hover:-translate-y-0.5 hover:border-brand-700/25 hover:bg-surface hover:shadow-sm"
              >
                <Icon className="size-3.5 text-brand-600" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Mobile compact banner */}
        <div className="relative z-10 flex w-full flex-col items-center gap-2.5 px-6 pb-7 pt-9 text-center md:hidden animate-[login-panel-in_0.4s_cubic-bezier(0.16,1,0.3,1)_both]">
          <img
            src="/GIT-logo-new.png"
            alt="Gharda Institute of Technology"
            className="h-11 w-auto max-w-[220px] object-contain drop-shadow-[0_4px_10px_rgba(16,24,40,0.12)]"
          />
          <h1 className="text-base font-bold leading-tight text-brand-900">Attendance, tracked the moment it happens.</h1>
          <div className="flex flex-wrap items-center justify-center gap-1.5">
            {BADGES.map(({ icon: Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-1 border border-brand-700/15 bg-surface/70 px-2 py-0.5 text-[10px] font-bold tracking-wide text-brand-800 uppercase shadow-xs backdrop-blur-sm [clip-path:polygon(4px_0,100%_0,calc(100%-4px)_100%,0_100%)]"
              >
                <Icon className="size-3 text-brand-600" />
                {label}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-6 left-[6%] right-[8%] hidden h-0.5 bg-[repeating-linear-gradient(90deg,rgb(var(--brand-700))_0_14px,transparent_14px_32px)] opacity-40 md:block" />
      </div>

      {/* Sign-in panel */}
      <div className="relative z-[3] flex w-full flex-1 items-center justify-center bg-surface px-6 py-8 sm:px-10 md:h-full md:w-[40%] md:overflow-y-auto md:py-6">
        <div className="w-full max-w-[360px] animate-[login-panel-in_0.45s_cubic-bezier(0.16,1,0.3,1)_both]">
          <div className="relative mx-auto w-fit">
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-60 blur-2xl"
              style={{ background: "radial-gradient(circle, rgb(var(--brand-700)/0.14) 0%, transparent 70%)" }}
            />
            <img src="/college_logo-1.png" alt="GITM crest" className="mx-auto mb-3 block h-14 w-auto object-contain" />
          </div>
          <h2 className="mb-1 text-center text-base font-bold text-ink">{isRegister ? "Create account" : "Sign in"}</h2>
          <p className="mb-3 text-center text-xs text-ink-faint">
            {isRegister
              ? "Create a student account with your face photo."
              : isFaceSignIn
                ? "Look at the camera to sign in -- no password needed."
                : "Admin sign-in with your email and password."}
          </p>

          {!isRegister && (
            <button
              type="button"
              onClick={() => switchSignInMethod(signInMethod === "face" ? "password" : "face")}
              className="mb-3 flex w-full items-center justify-center gap-1.5 text-[11px] font-semibold text-brand-700 hover:underline"
            >
              {signInMethod === "face" ? (
                <>
                  <KeyRound className="size-3.5" />
                  Sign in as Admin instead
                </>
              ) : (
                <>
                  <ScanFace className="size-3.5" />
                  Use face sign-in instead
                </>
              )}
            </button>
          )}

          <form onSubmit={handleSubmit}>
            {isFaceSignIn ? (
              <div className="mb-4">
                <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
                <canvas ref={canvasRef} className="hidden" />
                {cameraOn ? (
                  <div className="relative mx-auto w-full overflow-hidden rounded-lg bg-black">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video ref={videoRef} autoPlay playsInline muted className="w-full" />
                    <button
                      type="button"
                      onClick={() => setCameraOn(false)}
                      className="absolute top-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white"
                    >
                      <CameraOff className="size-3" />
                      Stop
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCameraOn(true)}
                    className="flex w-full flex-col items-center justify-center gap-2 bg-surface-alt py-8 text-xs font-semibold text-ink-soft transition-colors hover:text-brand-700"
                  >
                    <ScanFace className="size-8" />
                    Start camera
                  </button>
                )}
              </div>
            ) : (
              <>
                {isRegister && (
              <div className="mb-2.5">
                <label htmlFor="fullName" className="mb-1 block text-[11px] font-bold tracking-wider text-ink-soft uppercase">
                  Full name
                </label>
                <div className="group relative bg-surface-alt transition-colors focus-within:ring-2 focus-within:ring-brand-500/30">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint transition-colors group-focus-within:text-brand-600">
                    <UserIcon className="size-4" />
                  </span>
                  <input
                    id="fullName"
                    type="text"
                    autoComplete="name"
                    autoFocus
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    className="w-full bg-transparent py-2 pl-8 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:text-brand-800"
                  />
                </div>
              </div>
            )}

            <div className="mb-2.5">
              <label htmlFor="email" className="mb-1 block text-[11px] font-bold tracking-wider text-ink-soft uppercase">
                Email
              </label>
              <div className="group relative bg-surface-alt transition-colors focus-within:ring-2 focus-within:ring-brand-500/30">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint transition-colors group-focus-within:text-brand-600">
                  <Mail className="size-4" />
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoFocus={!isRegister}
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-transparent py-2 pl-8 pr-3 text-sm text-ink outline-none placeholder:text-ink-faint focus:text-brand-800"
                />
              </div>
            </div>

            <div className="mb-2.5">
              <label htmlFor="password" className="mb-1 block text-[11px] font-bold tracking-wider text-ink-soft uppercase">
                Password
              </label>
              <div className="group relative bg-surface-alt transition-colors focus-within:ring-2 focus-within:ring-brand-500/30">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint transition-colors group-focus-within:text-brand-600">
                  <Lock className="size-4" />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete={isRegister ? "new-password" : "current-password"}
                  placeholder={isRegister ? "At least 8 characters" : "Enter your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyUp={checkCapsLock}
                  onKeyDown={checkCapsLock}
                  onBlur={() => setCapsLockOn(false)}
                  required
                  minLength={isRegister ? 8 : undefined}
                  className="w-full bg-transparent py-2 pl-8 pr-10 text-sm text-ink outline-none placeholder:text-ink-faint focus:text-brand-800"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2.5 top-1/2 flex -translate-y-1/2 p-1 text-ink-faint hover:text-brand-700"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
              {capsLockOn && <p className="mt-1 text-[11px] font-medium text-warn">Caps Lock is on</p>}
            </div>

            {isRegister && (
              <div className="mb-4">
                <label className="mb-1 block text-[11px] font-bold tracking-wider text-ink-soft uppercase">Face photo</label>
                <input ref={photoInputRef} type="file" accept="image/*" hidden onChange={handlePhotoChange} />
                {photoPreview ? (
                  <div className="flex items-center gap-2.5 bg-surface-alt p-2">
                    <img src={photoPreview} alt="Your upload" className="size-10 shrink-0 rounded-full object-cover ring-1 ring-hairline-strong" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-ink">{photo?.name}</p>
                      <p className="text-[11px] text-ink-faint">Used to match you at check-in</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearPhoto}
                      className="shrink-0 p-1 text-ink-faint hover:text-crit"
                      aria-label="Remove photo"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 bg-surface-alt py-2.5 text-xs font-semibold text-ink-soft transition-colors hover:text-brand-700"
                  >
                    <Camera className="size-4" />
                    Upload a clear, front-facing photo
                  </button>
                )}
                <p className="mt-1 text-[11px] text-ink-faint">We check that it's a real face before your account is created.</p>
              </div>
            )}
              </>
            )}

            {formError && (
              <p className="mb-3 rounded-md border border-crit/20 bg-crit-soft px-3 py-2 text-xs text-crit">{formError}</p>
            )}

            <div className="grid grid-cols-2 gap-2">
              <Button
                type={isRegister || isFaceSignIn ? "button" : "submit"}
                variant={isRegister ? "outline" : "primary"}
                className="[clip-path:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)]"
                onClick={isRegister ? () => switchMode("signin") : isFaceSignIn ? captureAndLoginFace : undefined}
                disabled={submitting || (isFaceSignIn && !cameraOn)}
              >
                {!isRegister && submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : isFaceSignIn ? (
                  "Scan & sign in"
                ) : (
                  "Login"
                )}
              </Button>
              <Button
                type={isRegister ? "submit" : "button"}
                variant={isRegister ? "primary" : "outline"}
                className="[clip-path:polygon(7px_0,100%_0,calc(100%-7px)_100%,0_100%)]"
                onClick={!isRegister ? () => switchMode("register") : undefined}
                disabled={submitting}
              >
                {isRegister && submitting ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                ) : (
                  "Register"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes login-panel-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes login-glow-pulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.08); }
        }
      `}</style>
    </div>
  );
}
