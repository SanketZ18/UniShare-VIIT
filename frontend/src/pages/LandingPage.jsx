import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BookOpen,
  Briefcase,
  Building2,
  CheckCircle,
  ChevronRight,
  Cpu,
  GraduationCap,
  Lock,
  MapPin,
  Search,
  Shield,
  Sparkles,
  Zap,
} from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import LoginModal from '../components/auth/LoginModal'
import { useAuth } from '../hooks/useAuth'
import viitLogo from '../assets/logo.png'

const featureCards = [
  {
    title: 'Organized Academic Access',
    desc: 'Students and faculty can quickly reach syllabus files, notes, question papers, and departmental updates from one clean interface.',
    icon: Shield,
    accent: 'from-amber-500 to-orange-500',
    iconShell: 'bg-amber-100 text-amber-700',
  },
  {
    title: 'Fast Search Experience',
    desc: 'Smart filters and structured resource collections help learners find the right material without wasting time in scattered folders.',
    icon: Search,
    accent: 'from-orange-500 to-rose-500',
    iconShell: 'bg-orange-100 text-orange-700',
  },
  {
    title: 'Built for Daily Study',
    desc: 'The portal is designed around student routines, making revision, downloading, and department-wise browsing simple and dependable.',
    icon: BookOpen,
    accent: 'from-amber-500 to-orange-500',
    iconShell: 'bg-amber-100 text-amber-700',
  },
]

const departmentCards = [
  {
    name: 'MCA',
    label: 'Department of Computer Applications',
    description:
      'A focused digital space for software, programming, practical assignments, NEP-aligned syllabus resources, and semester-wise academic material.',
    accent: 'from-amber-500 to-orange-600',
    glow: 'bg-amber-400/20',
    points: ['Semester-wise syllabus support', 'Question paper archive', 'Programming and project resources', 'Faculty-ready document sharing'],
  },
  {
    name: 'MBA',
    label: 'Department of Management Studies',
    description:
      'A refined content hub for management students with academic documents, case-study references, presentations, and examination support materials.',
    accent: 'from-orange-500 to-rose-600',
    glow: 'bg-orange-400/20',
    points: ['Course and subject updates', 'Presentation and case resources', 'Exam preparation material', 'Department-level academic repository'],
  },
]

const campusFacts = [
  {
    title: 'Established',
    value: '2000',
    detail: 'VIIT Baramati has supported postgraduate education in technology and management for more than two decades.',
  },
  {
    title: 'Location',
    value: 'Vidyanagari, Baramati',
    detail: 'The institute is based on Bhigwan Road, Baramati, serving students across the region with a dedicated academic environment.',
  },
  {
    title: 'Academic Standing',
    value: 'SPPU & AICTE',
    detail: 'The institute is affiliated to Savitribai Phule Pune University and approved by AICTE, New Delhi.',
  },
]

const programCards = [
  {
    title: 'Master of Computer Applications',
    short: 'MCA',
    icon: Cpu,
    shell: 'bg-amber-100 text-amber-700',
    bullets: ['Programming, software development, and system design focus', 'Curriculum-supported learning resources for every semester', 'Useful for notes, practical support, and exam preparation'],
  },
  {
    title: 'Master of Business Administration',
    short: 'MBA',
    icon: Briefcase,
    shell: 'bg-amber-100 text-amber-700',
    bullets: ['Management-oriented study support for coursework and presentations', 'Helps organize subject material, question banks, and academic notices', 'Designed for stronger daily access to department resources'],
  },
]

export default function LandingPage() {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [loginOpen, setLoginOpen] = useState(false)

  useEffect(() => {
    const justLoggedOut = sessionStorage.getItem('justLoggedOut')
    if (justLoggedOut) {
      // User deliberately logged out — clear the flag and show home page, no modal
      sessionStorage.removeItem('justLoggedOut')
      return
    }
    if (location.state?.loginRequired && !isAuthenticated) {
      setLoginOpen(true)
      // Clear the state so the modal doesn't re-open on refresh
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [isAuthenticated, location.state, navigate, location.pathname])

  return (
    <div className="min-h-screen overflow-x-hidden bg-[linear-gradient(180deg,#fff8ec_0%,#fff0d2_32%,#fff4e8_66%,#fffdf8_100%)] text-slate-900 selection:bg-amber-200 selection:text-slate-950">
      <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-slate-200/70 bg-white/78 backdrop-blur-xl">
        <div className="mx-auto flex h-18 w-full items-center justify-between px-2 lg:px-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/80 bg-white p-2.5 shadow-[0_16px_45px_rgba(249,115,22,0.14)] transition-transform duration-500 hover:scale-105">
              <img src={viitLogo} alt="VIIT" className="h-full w-auto object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tight text-slate-950 leading-none">UniShare</span>
              <span className="mt-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Smart Academic Portal</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-7 md:flex">
              <a href="#features" className="text-xs font-black uppercase tracking-[0.22em] text-slate-800 transition hover:text-slate-950">Features</a>
              <a href="#departments" className="text-xs font-black uppercase tracking-[0.22em] text-slate-800 transition hover:text-slate-950">Departments</a>
              <a href="#about" className="text-xs font-black uppercase tracking-[0.22em] text-slate-800 transition hover:text-slate-950">About</a>
            </div>
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="rounded-full bg-[linear-gradient(135deg,#f59e0b_0%,#ea580c_100%)] px-6 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-white shadow-[0_18px_36px_rgba(194,65,12,0.24)] transition hover:-translate-y-0.5"
              >
                Dashboard
              </Link>
            ) : (
              <button
                onClick={() => setLoginOpen(true)}
                className="rounded-full border border-slate-200 bg-white px-6 py-2.5 text-xs font-black uppercase tracking-[0.2em] text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="relative overflow-hidden pt-28">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-[8%] top-16 h-64 w-64 rounded-full bg-amber-300/35 blur-[110px]" />
          <div className="absolute right-[8%] top-24 h-72 w-72 rounded-full bg-amber-200/50 blur-[120px]" />
          <div className="absolute left-1/2 top-[42%] h-80 w-80 -translate-x-1/2 rounded-full bg-orange-200/35 blur-[140px]" />
          <div className="absolute bottom-0 right-[12%] h-72 w-72 rounded-full bg-rose-200/30 blur-[130px]" />
        </div>

        <section className="mx-auto w-full px-2 pb-24 lg:px-4 lg:pb-28">
          <div className="grid items-center gap-16 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="relative z-10">
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-white/80 px-5 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-800 shadow-[0_10px_24px_rgba(245,158,11,0.10)]">
                <Lock size={14} />
                VIIT Academic Resource Hub
              </div>

              <div className="portal-slit-enter">
                <h1 className="mt-8 max-w-4xl text-5xl font-black tracking-tight text-slate-950 sm:text-6xl lg:text-7xl leading-[1.02]">
                  A brighter, smarter
                  <span className="block bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#dc2626_100%)] bg-clip-text text-transparent">
                    academic home for VIIT students.
                  </span>
                </h1>

                <p className="mt-7 max-w-2xl text-lg font-black leading-8 text-slate-800">
                  UniShare brings MCA and MBA learning material into one professional portal so students can discover syllabus files, question papers, notes, and departmental updates without the clutter of disconnected systems.
                </p>
              </div>

              <div className="mt-10 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() => setLoginOpen(true)}
                  className="group inline-flex items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#f59e0b_0%,#ea580c_100%)] px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-white shadow-[0_20px_40px_rgba(194,65,12,0.22)] transition hover:-translate-y-1"
                >
                  Access Portal
                  <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
                </button>
                <a
                  href="#about"
                  className="inline-flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white/80 px-8 py-4 text-sm font-black uppercase tracking-[0.18em] text-slate-900 shadow-[0_16px_32px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:border-amber-200 hover:bg-amber-50"
                >
                  About VIIT
                </a>
              </div>

              <div className="mt-12 grid gap-4 sm:grid-cols-3">
                <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">Programs</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">MCA & MBA</p>
                </div>
                <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-800">Institution</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">VIIT Baramati</p>
                </div>
                <div className="rounded-3xl border border-white/80 bg-white/80 p-5 shadow-[0_20px_40px_rgba(15,23,42,0.06)] backdrop-blur">
                  <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">Approach</p>
                  <p className="mt-3 text-2xl font-black text-slate-950">Student First</p>
                </div>
              </div>
            </div>

            <div className="relative z-10">
              <div className="absolute -left-6 top-10 h-32 w-32 rounded-full bg-amber-300/30 blur-3xl" />
              <div className="absolute -right-6 bottom-8 h-28 w-28 rounded-full bg-amber-200/40 blur-3xl" />
              <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/75 p-6 shadow-[0_30px_80px_rgba(15,23,42,0.10)] backdrop-blur-xl sm:p-8">
                <div className="flex items-center justify-between rounded-[1.5rem] bg-[linear-gradient(135deg,#b45309_0%,#ea580c_100%)] p-6 text-white shadow-[0_20px_45px_rgba(154,52,18,0.26)]">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-100">Campus Digital Desk</p>
                    <h2 className="mt-3 text-3xl font-black">UniShare</h2>
                    <p className="mt-4 max-w-sm text-sm font-semibold leading-7 text-slate-800">
                      Access your academic workspace from a simple popup with a soft light palette and a cleaner, easier form.
                    </p>
                  </div>
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/15">
                    <Sparkles size={30} />
                  </div>
                </div>

                <div className="mt-6 grid gap-4">
                  {[
                    'Department-based resource organization',
                    'Cleaner access to academic documents',
                    'Professional presentation for students and faculty',
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                      <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                        <CheckCircle size={18} />
                      </div>
                      <p className="text-sm font-semibold leading-6 text-slate-700">{item}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-[1.75rem] border border-amber-100 bg-[linear-gradient(135deg,#fff7db_0%,#fff0d6_100%)] p-6">
                  <div className="flex items-center gap-3">
                    <Building2 className="text-amber-700" size={20} />
                    <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-700">Why this redesign works</p>
                  </div>
                  <p className="mt-3 text-sm font-semibold leading-7 text-slate-800">
                    The new interface replaces the heavier cool tones with layered gold, orange, and warm neutral tones so the homepage feels more welcoming, credible, and college-ready.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto w-full px-2 py-20 lg:px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-amber-700">Features</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Everything important stays easy to reach.
            </h2>
            <p className="mt-5 text-base font-semibold leading-7 text-slate-800">
              The homepage now feels less technical and more student-friendly while still keeping the portal professional.
            </p>
          </div>

          <div className="mt-14 grid gap-8 md:grid-cols-3">
            {featureCards.map((feature) => (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-[2rem] border border-white/80 bg-white/82 p-8 shadow-[0_24px_60px_rgba(15,23,42,0.08)] transition duration-500 hover:-translate-y-2"
              >
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${feature.accent}`} />
                <div className={`flex h-14 w-14 items-center justify-center rounded-2xl ${feature.iconShell}`}>
                  <feature.icon size={26} />
                </div>
                <h3 className="mt-6 text-2xl font-black text-slate-950">{feature.title}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-800 font-semibold">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="departments" className="mx-auto w-full px-2 py-20 lg:px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-emerald-700">Departments</p>
            <h2 className="mt-4 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
              Dedicated hubs for each academic stream.
            </h2>
            <p className="mt-5 text-base leading-7 text-slate-800 font-semibold">
              Each department gets a space that feels purposeful, organized, and ready for everyday academic use.
            </p>
          </div>

          <div className="mt-14 grid gap-8 lg:grid-cols-2">
            {departmentCards.map((department) => (
              <div
                key={department.name}
                className="group relative overflow-hidden rounded-[2.5rem] border border-white/80 bg-white/82 p-8 shadow-[0_28px_70px_rgba(15,23,42,0.08)] transition duration-500 hover:-translate-y-2 sm:p-10"
              >
                <div className={`absolute -right-8 -top-8 h-36 w-36 rounded-full ${department.glow} blur-3xl`} />
                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-6">
                    <div>
                      <div className={`inline-flex rounded-full bg-gradient-to-r ${department.accent} px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-white`}>
                        {department.name}
                      </div>
                      <h3 className="mt-5 text-3xl font-black text-slate-950">{department.label}</h3>
                      <p className="mt-4 max-w-xl text-sm leading-7 text-slate-800 font-semibold">{department.description}</p>
                    </div>
                    <div className="hidden h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 transition duration-500 group-hover:bg-slate-900 group-hover:text-white sm:flex">
                      <ChevronRight size={24} />
                    </div>
                  </div>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    {department.points.map((point) => (
                      <div key={point} className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                          <CheckCircle size={15} />
                        </div>
                        <span className="text-sm font-semibold leading-6 text-slate-700">{point}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setLoginOpen(true)}
                    className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-black uppercase tracking-[0.16em] text-slate-900 shadow-[0_16px_30px_rgba(15,23,42,0.06)] transition hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50"
                  >
                    Access {department.name} Resources
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section id="about" className="mx-auto w-full px-2 py-24 lg:px-4">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_0.95fr]">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full border border-amber-200 bg-white/85 px-5 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-700 shadow-[0_10px_24px_rgba(245,158,11,0.10)]">
                <GraduationCap size={14} />
                About VIIT Baramati
              </div>
              <h2 className="mt-7 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Vidya Pratishthan&apos;s Institute of Information Technology
              </h2>
              <p className="mt-6 text-lg leading-8 text-slate-800 font-semibold">
                VIIT Baramati is a postgraduate-focused institute that supports technology and management education in a disciplined academic setting. The about section is now part of the same landing page, so students can quickly understand the college before moving deeper into the portal.
              </p>
              <p className="mt-5 text-base leading-8 text-slate-800 font-semibold">
                The institute was established in 2000 and is associated with Savitribai Phule Pune University. It is approved by AICTE, New Delhi, and currently highlights the MCA and MBA academic streams represented in UniShare.
              </p>

              <div className="mt-10 grid gap-5">
                {campusFacts.map((fact) => (
                  <div key={fact.title} className="rounded-[1.75rem] border border-white/85 bg-white/82 p-6 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        {fact.title === 'Location' ? <MapPin size={20} /> : fact.title === 'Academic Standing' ? <Building2 size={20} /> : <Zap size={20} />}
                      </div>
                      <div>
                        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">{fact.title}</p>
                        <p className="mt-1 text-xl font-black text-slate-950">{fact.value}</p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm leading-7 text-slate-800 font-semibold">{fact.detail}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="overflow-hidden rounded-[2.25rem] border border-white/85 bg-white/82 p-7 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-amber-700">Academic Programs</p>
                <div className="mt-6 space-y-5">
                  {programCards.map((program) => (
                    <div key={program.short} className="rounded-[1.75rem] border border-slate-100 bg-slate-50/90 p-5">
                      <div className="flex items-center gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${program.shell}`}>
                          <program.icon size={22} />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-slate-950">{program.title}</h3>
                          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-800">{program.short}</p>
                        </div>
                      </div>
                      <div className="mt-5 grid gap-3">
                        {program.bullets.map((bullet) => (
                          <div key={bullet} className="flex items-start gap-3">
                            <div className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-emerald-600 shadow-sm">
                              <CheckCircle size={14} />
                            </div>
                            <p className="text-sm leading-6 text-slate-800 font-semibold">{bullet}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-[2.25rem] border border-amber-100 bg-[linear-gradient(135deg,#fff7db_0%,#fff1de_54%,#fff7ed_100%)] p-7 shadow-[0_20px_50px_rgba(15,23,42,0.06)] sm:p-8">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-slate-800 font-semibold">UniShare Purpose</p>
                <h3 className="mt-4 text-2xl font-black text-slate-950">One about section, no extra page needed.</h3>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  The new `ABOUT` button now points directly to this section on the homepage, giving visitors a clear summary of the college and its courses without sending them to a separate route.
                </p>
              </div>
            </div>
          </div>
        </section>

        <footer className="border-t border-white/70 bg-[linear-gradient(180deg,#ffffff_0%,#fff5e8_100%)] py-14">
          <div className="mx-auto w-full px-2 lg:px-4">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white bg-white p-2.5 shadow-[0_14px_32px_rgba(249,115,22,0.10)]">
                    <img src={viitLogo} alt="VIIT" className="h-full w-auto object-contain" />
                  </div>
                  <div>
                    <p className="text-2xl font-black tracking-tight text-slate-950">UniShare</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.24em] text-amber-700">Academic Excellence</p>
                  </div>
                </div>
                <p className="mt-6 text-base leading-8 text-slate-800 font-semibold">
                  Vidya Pratishthan&apos;s Institute of Information Technology, Baramati. A student-friendly portal experience for organized academic access, cleaner navigation, and a more professional first impression.
                </p>
              </div>

              <div className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white/85 px-6 py-5 shadow-[0_18px_36px_rgba(15,23,42,0.05)]">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.55)]" />
                  <span className="text-[11px] font-black uppercase tracking-[0.22em] text-emerald-700">All Systems Operational</span>
                </div>
                <p className="text-[11px] font-black uppercase tracking-[0.26em] text-slate-800">
                  Copyright 2026 UniShare | VIIT Baramati
                </p>
                <p className="mt-3 text-[11px] font-black uppercase tracking-[0.25em] text-slate-950">
                  Website Developed By <span className="bg-[linear-gradient(135deg,#f59e0b_0%,#ea580c_100%)] bg-clip-text text-transparent">Sanket Zagade</span>
                </p>
                <p className="mt-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                  Email - <a href="mailto:sanketzagade2004@gmail.com" className="text-amber-600 hover:underline">sanketzagade2004@gmail.com</a>
                </p>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </div>
  )
}
