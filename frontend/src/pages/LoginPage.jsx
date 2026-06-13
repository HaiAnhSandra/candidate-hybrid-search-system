import React, { useMemo, useState } from "react";
import { Eye, EyeOff, Lock, LogIn, Mail } from "lucide-react";

const DEMO_USERS = [
  {
    email: "admin@recruitiq.com",
    password: "admin123",
    name: "Admin User",
    role: "Admin"
  },
  {
    email: "recruiter@recruitiq.com",
    password: "recruiter123",
    name: "Nguyen Thi Lan",
    role: "Senior Recruiter"
  },
  {
    email: "demo@recruitiq.com",
    password: "demo123",
    name: "Demo User",
    role: "Recruiter"
  }
];

export default function LoginPage({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0,
    [email, password]
  );

  const handleLogin = (event) => {
    event.preventDefault();
    if (isLoading) {
      return;
    }
    setError("");
    setIsLoading(true);

    window.setTimeout(() => {
      const user = DEMO_USERS.find(
        (demoUser) => demoUser.email === email && demoUser.password === password
      );
      if (user) {
        localStorage.setItem("auth_user", JSON.stringify(user));
        onLogin?.(user);
      } else {
        setError("Invalid email or password");
      }
      setIsLoading(false);
    }, 400);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#F5F7FA] to-[#EDF2F7] px-6 py-12">
      <div className="flex w-full max-w-md flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-slate-900">RecruitIQ</h1>
          <p className="mt-2 text-sm text-slate-500">AI-Powered Candidate Search</p>
        </div>

        <div className="w-full rounded-2xl bg-white p-8 shadow-lg">
          <div className="mb-6 text-center">
            <h2 className="text-2xl font-semibold text-slate-900">Sign In</h2>
            <p className="mt-1 text-sm text-slate-500">
              Access your recruitment dashboard
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter your email"
                  className="w-full rounded-lg border border-gray-200 p-3 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-slate-500">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    setError("");
                  }}
                  placeholder="Enter your password"
                  className="w-full rounded-lg border border-gray-200 p-3 pl-10 pr-12 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-600"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff size={16} className="text-slate-400" />
                  ) : (
                    <Eye size={16} className="text-slate-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit || isLoading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#E53E3E] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#C53030] disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/70 border-t-transparent" />
                  Signing in...
                </span>
              ) : (
                <>
                  <LogIn size={16} className="text-white" />
                  Sign In
                </>
              )}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-center text-sm text-red-500">
              {error}
            </p>
          )}

          <p className="text-xs text-gray-400 text-center mt-4">
            Demo: admin@recruitiq.com / admin123
          </p>
        </div>
      </div>
    </div>
  );
}
