import Link from "next/link";
import { Camera, QrCode, Cloud, ChevronRight, Zap } from "lucide-react";

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-black selection:bg-purple-500/30">
      {/* Background Ambient Glows */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[500px] w-[500px] rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute -bottom-[10%] -right-[10%] h-[600px] w-[600px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute left-[40%] top-[30%] h-[400px] w-[400px] rounded-full bg-fuchsia-600/10 blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-12">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 text-white shadow-lg shadow-purple-500/20">
            <Camera className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            PhotoCloud
          </span>
        </div>
        <div>
          <Link
            href="/login"
            className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10 hover:shadow-lg hover:shadow-white/5"
          >
            Sign In
            <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-center justify-center px-6 pt-20 text-center sm:pt-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-purple-300">
          <Zap className="h-4 w-4 text-purple-400" />
          <span>The next-generation photobooth platform</span>
        </div>

        <h1 className="mt-8 max-w-4xl text-5xl font-extrabold tracking-tight text-white sm:text-7xl">
          Elevate Your{" "}
          <span className="bg-gradient-to-r from-purple-400 via-fuchsia-400 to-blue-400 bg-clip-text text-transparent">
            Wedding
          </span>{" "}
          <br className="hidden sm:block" />
          Photobooth Experience
        </h1>

        <p className="mt-6 max-w-2xl text-lg text-gray-400 sm:text-xl">
          Instantly sync captures from your camera to the cloud. Give your guests a magical experience with real-time galleries and QR code downloads.
        </p>

        <div className="mt-10 flex flex-col gap-4 sm:flex-row">
          <Link
            href="/dashboard"
            className="group relative flex items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-8 py-4 text-base font-semibold text-black transition-transform hover:scale-105 active:scale-95"
          >
            <span className="relative z-10 flex items-center gap-2">
              Go to Dashboard
              <ChevronRight className="h-5 w-5" />
            </span>
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 to-white opacity-0 transition-opacity group-hover:opacity-100" />
          </Link>
          
          <Link
            href="/login"
            className="flex items-center justify-center rounded-full border border-white/15 bg-black/50 px-8 py-4 text-base font-semibold text-white backdrop-blur-md transition-all hover:bg-white/10 hover:text-white"
          >
            Sign In for Photographers
          </Link>
        </div>

        {/* Feature Bento Grid */}
        <div className="mt-24 grid w-full gap-6 pb-24 sm:grid-cols-3">
          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-left transition-all hover:bg-white/10">
            <div className="mb-6 inline-flex rounded-2xl bg-purple-500/20 p-4 text-purple-300 ring-1 ring-purple-500/30">
              <Camera className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">Live Session Panel</h3>
            <p className="text-gray-400">
              Monitor and upload captures in real-time. Instantly push high-quality photos straight from your tethered camera to the cloud.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-left transition-all hover:bg-white/10">
            <div className="mb-6 inline-flex rounded-2xl bg-blue-500/20 p-4 text-blue-300 ring-1 ring-blue-500/30">
              <QrCode className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">Instant QR Access</h3>
            <p className="text-gray-400">
              Guests simply scan a unique QR code to access their personal gallery and download memories instantly, without creating an account.
            </p>
          </div>

          <div className="group relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-8 text-left transition-all hover:bg-white/10">
            <div className="mb-6 inline-flex rounded-2xl bg-fuchsia-500/20 p-4 text-fuchsia-300 ring-1 ring-fuchsia-500/30">
              <Cloud className="h-8 w-8" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-white">Secure Cloud</h3>
            <p className="text-gray-400">
              Powered by robust infrastructure with Signed URLs. Your clients' privacy is guaranteed with enterprise-grade security.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
