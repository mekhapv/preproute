import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { login } from "../api/auth";
import { useAuthStore } from "../store/authStore";

const loginSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  password: z.string().min(1, "Password is required"),
  remember: z.boolean().optional(),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const LoginPage = () => {
  const navigate = useNavigate();
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const setAuth = useAuthStore((state) => state.setAuth);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      userId: "",
      password: "",
      remember: true,
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);

    try {
      const response = await login({
        userId: values.userId,
        password: values.password,
      });

      if (response.status !== 'success' || !response.data?.token) {
        setApiError("Login failed. Please check your credentials.");
        return;
      }

      setAuth(
        response.data.token,
        response.data.user,
        Boolean(values.remember),
      );
      navigate("/dashboard", { replace: true });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const message =
          (error.response?.data as { message?: string } | undefined)?.message ??
          "Unable to login right now. Please try again.";
        setApiError(message);
        return;
      }

      setApiError("Unexpected error occurred. Please try again.");
    }
  };

  return (
    <main className="login-page">
      <section
        className="login-left-panel"
        aria-label="Brand illustration panel"
      >
        <div className="left-panel-overlay" />
        <img
          className="left-panel-icon"
          src="/loginpageicon.png"
          alt="Left panel icon"
        />
      </section>

      <section className="login-right-panel" aria-label="Login form panel">
        <div className="login-card">
          <img className="login-logo" src="/logo.png" alt="Company logo" />

          <h1>Login</h1>
          <p className="login-description">
            Use your company provided Login credentials
          </p>

          <form
            className="login-form"
            onSubmit={handleSubmit(onSubmit)}
            noValidate
          >
            <div className="login-form-field">
              <label htmlFor="userId">User ID</label>
              <input
                id="userId"
                type="text"
                autoComplete="username"
                placeholder="Enter user ID"
                {...register("userId")}
              />
              {errors.userId ? (
                <span className="field-error">{errors.userId.message}</span>
              ) : null}
            </div>

            <div className="login-form-field">
              <label htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter password"
                  {...register("password")}
                />
                <button
                  type="button"
                  className="password-toggle"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((visible) => !visible)}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="m3.3 2.3 18.4 18.4-1.4 1.4-3.2-3.2A10.8 10.8 0 0 1 12 20C6.6 20 2.5 16.5 1 12c.7-2.2 2.2-4.1 4.1-5.5L1.9 3.7l1.4-1.4Zm6 6 1.5 1.5a2.5 2.5 0 0 0 3.4 3.4l1.5 1.5A4.5 4.5 0 0 1 9.3 8.3Zm2.7-4.3c5.4 0 9.5 3.5 11 8-.4 1.3-1.2 2.5-2.1 3.6l-3.5-3.5V12A5.4 5.4 0 0 0 12 6.6h-.1L9.4 4.1c.8-.1 1.7-.1 2.6-.1Z" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 4c5.4 0 9.5 3.5 11 8-.7 2.2-2.1 4.1-4.1 5.6A11.3 11.3 0 0 1 12 20c-5.4 0-9.5-3.5-11-8 .7-2.2 2.1-4.1 4.1-5.6A11.3 11.3 0 0 1 12 4Zm0 2c-4.3 0-7.6 2.5-8.9 6 1.3 3.5 4.6 6 8.9 6s7.6-2.5 8.9-6C19.6 8.5 16.3 6 12 6Zm0 2a4 4 0 1 1 0 8 4 4 0 0 1 0-8Zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password ? (
                <span className="field-error">{errors.password.message}</span>
              ) : null}
            </div>

            <button type="button" className="forgot-password-link">
              Forgot password?
            </button>
            <input
              id="remember"
              type="checkbox"
              hidden
              {...register("remember")}
            />

            {apiError ? <p className="api-error">{apiError}</p> : null}

            <button type="submit" className="login-btn" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
};
