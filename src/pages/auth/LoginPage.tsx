import { motion } from "framer-motion";
import { Button } from "../../components/ui/button";

export default function LoginPage() {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col lg:grid lg:grid-cols-2 text-zinc-950 font-sans selection:bg-zinc-100">
      <div className="flex flex-col justify-center px-8 pt-16 pb-8 lg:py-12 lg:px-24 xl:px-32 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
            Welcome Back
          </h1>

          <p className="text-zinc-500 text-lg lg:text-xl max-w-md leading-relaxed">
            Sign in to continue to Zayd Industries Business OS.
          </p>
        </motion.div>
      </div>

      <div className="flex flex-col items-center justify-center px-8 pb-16 pt-8 lg:py-12 sm:px-12 bg-zinc-50/30 lg:bg-transparent">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut", delay: 0.1 }}
          className="w-full max-w-[400px]"
        >
          <div className="bg-white border border-zinc-200 rounded-2xl shadow-sm p-8">
            <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-zinc-900"
                >
                  Email
                </label>

                <input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  autoComplete="email"
                  required
                  className="flex h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-zinc-900"
                >
                  Password
                </label>

                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="flex h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm placeholder:text-zinc-500 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900"
                  />

                  <label
                    htmlFor="remember"
                    className="text-sm font-normal text-zinc-600"
                  >
                    Remember Me
                  </label>
                </div>

                <a
                  href="/forgot-password"
                  className="text-sm font-medium text-zinc-900 hover:underline underline-offset-4"
                >
                  Forgot Password?
                </a>
              </div>

              <Button
                type="submit"
                className="w-full h-11 bg-zinc-900 hover:bg-zinc-800"
              >
                Sign In
              </Button>
            </form>
          </div>

          <p className="mt-8 text-center text-sm text-zinc-400">
            Powered by Zayd Industries
          </p>
        </motion.div>
      </div>
    </div>
  );
}