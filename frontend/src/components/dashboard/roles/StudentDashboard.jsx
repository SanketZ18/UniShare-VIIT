import {
  ArrowRight,
  BookOpen,
  Calendar,
  CheckCircle,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { fetchTimetable } from '../../../services/timetableService'
import TimetableRenderer from '../TimetableRenderer'
import { X } from 'lucide-react'

export default function StudentDashboard({ user, summary }) {
  const [selectedSemester, setSelectedSemester] = useState(user?.semester || 1)
  const [timetable, setTimetable] = useState(null)
  const [activeDay, setActiveDay] = useState('Monday')
  const [loadingTimetable, setLoadingTimetable] = useState(true)
  const [showTimetableModal, setShowTimetableModal] = useState(false)

  useEffect(() => {
    let active = true
    const getTimetableData = async () => {
      if (!user?.department) return
      try {
        setLoadingTimetable(true)
        const data = await fetchTimetable(user.department, selectedSemester)
        if (active) {
          setTimetable(data)
        }
      } catch (err) {
        console.error('Failed to fetch timetable', err)
        if (active) {
          setTimetable(null)
        }
      } finally {
        if (active) {
          setLoadingTimetable(false)
        }
      }
    }
    getTimetableData()
    return () => { active = false }
  }, [user?.department, selectedSemester])

  const stats = [
    { label: 'Resources', value: summary?.totalResources || 0, icon: BookOpen, shell: 'bg-amber-100 text-amber-700' },
    { label: 'Downloads', value: summary?.totalDownloads || 0, icon: BookOpen, shell: 'bg-orange-100 text-orange-700' },
    { label: 'Peer Access', value: user?.active ? 'Active' : 'Locked', icon: Users, shell: user?.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700' },
  ]

  const getActiveDaySlots = () => {
    if (!timetable) return []
    
    if (timetable.schedule) {
      return timetable.schedule.find(s => s.day === activeDay)?.slots || []
    }
    
    if (timetable.rows) {
      const dayKey = activeDay.toLowerCase()
      return timetable.rows
        .map(row => {
          const subjectCode = row[dayKey] || ''
          
          if (row.isBreak) {
            return {
              time: row.time,
              subject: `${row.breakName || 'Break'}`,
              isBreak: true,
              teacher: 'Universal',
              classroom: 'Campus'
            }
          }
          
          if (!subjectCode.trim()) return null
          
          // Try to look up subject info in the courses table
          const course = timetable.courses?.find(c => 
            c.code?.toLowerCase() === subjectCode.toLowerCase() || 
            subjectCode.toLowerCase().includes(c.code?.toLowerCase())
          )
          
          return {
            time: row.time,
            subject: course ? `${course.title} (${subjectCode})` : subjectCode,
            teacher: course ? course.faculty : 'Faculty',
            classroom: subjectCode.includes('Lab') || subjectCode.includes('(PR)') 
              ? (timetable.lab || 'Lab') 
              : (timetable.classroom || 'Classroom'),
            isBreak: false
          }
        })
        .filter(Boolean)
    }
    
    return []
  }

  return (
    <div className="space-y-6 pb-8 animate-in">
      <section className="portal-banner rounded-[2.4rem] p-8 sm:p-10">
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="portal-chip text-[10px] font-black uppercase tracking-[0.22em]">
              <GraduationCap size={13} />
              Student Portal | {user?.department || 'MCA'}
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Welcome back,
              <span className="block bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_52%,#ea580c_100%)] bg-clip-text text-transparent">
                {user?.fullName?.split(' ')[0]}
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-800 sm:text-base">
              Your academic workspace now follows a professional light-theme design system, consistent with the institutional landing page for a seamless experience.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/resources"
              className="portal-button-primary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-[0.18em]"
            >
              Open Library
              <ArrowRight size={15} />
            </Link>
            <Link
              to="/bookmarks"
              className="portal-button-secondary inline-flex items-center gap-2 rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-[0.18em]"
            >
              Saved Resources
            </Link>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* ROW 1 LEFT: Stats (Spans 8) */}
        <section className="lg:col-span-8">
          <div className="grid gap-4 md:grid-cols-3 h-full">
            {stats.map((stat) => (
              <div key={stat.label} className="portal-panel portal-3d rounded-[2rem] p-6 flex flex-col justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.shell}`}>
                  <stat.icon size={22} />
                </div>
                <div>
                  <p className="mt-5 text-[11px] font-black uppercase tracking-[0.22em] text-slate-700">{stat.label}</p>
                  <p className="mt-2 text-3xl font-black text-slate-900">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ROW 1 RIGHT: Announcements (Spans 4) */}
        <section className="lg:col-span-4">
          <div className="portal-panel portal-3d rounded-[2.4rem] p-8 h-full flex flex-col justify-between">
            <div>
              <div className="portal-chip text-[10px] font-black uppercase tracking-[0.22em]">
                <Clock size={12} />
                Announcements
              </div>
              <div className="mt-6 space-y-4">
                {summary?.recentAnnouncements?.length ? (
                  summary.recentAnnouncements.slice(0, 2).map((announcement) => (
                    announcement.fileUrl ? (
                      <a
                        key={announcement.id}
                        href={announcement.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="portal-3d block rounded-[1.5rem] border border-slate-100 bg-slate-50/50 p-4 transition hover:border-amber-200 hover:bg-white animate-in"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[9px] font-black uppercase tracking-[0.15em] text-emerald-700">
                            {announcement.subject || 'Academic Update'}
                          </p>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[8px] font-black uppercase tracking-[0.1em] text-amber-800">
                            Attachment
                          </span>
                        </div>
                        <h3 className="mt-2 line-clamp-1 text-sm font-black text-slate-900">{announcement.title}</h3>
                      </a>
                    ) : (
                      <div
                        key={announcement.id}
                        className="portal-3d block rounded-[1.5rem] border border-slate-100 bg-slate-50/50 p-4 bg-slate-50/30"
                      >
                        <p className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-600">
                          {announcement.subject || 'Academic Update'}
                        </p>
                        <h3 className="mt-2 text-sm font-semibold text-slate-900 line-clamp-1">{announcement.title}</h3>
                      </div>
                    )
                  ))
                ) : (
                  <p className="text-sm font-medium text-slate-700">No active academic announcements.</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ROW 2 LEFT: Recent Materials (Spans 8) */}
        <section className="lg:col-span-8">
          <div className="portal-panel portal-3d rounded-[2.4rem] p-8 h-full">
            <div className="mb-8 flex items-center justify-between gap-4">
              <div>
                <div className="portal-chip text-[10px] font-black uppercase tracking-[0.22em]">
                  <Layers size={12} />
                  Academic Resources
                </div>
                <h2 className="mt-4 text-2xl font-black text-slate-900">Recent Materials for Sem {user?.semester || 1}</h2>
              </div>
              <Link to="/resources" className="portal-button-secondary flex h-11 w-11 items-center justify-center rounded-2xl">
                <Layers size={18} />
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {summary?.recentResources?.length ? (
                summary.recentResources.slice(0, 4).map((resource) => (
                  <Link
                    key={resource.id}
                    to="/resources"
                    className="portal-3d rounded-[1.6rem] border border-slate-100 bg-slate-50/50 p-5 transition hover:border-amber-200 hover:bg-white"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
                        <FileText size={22} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="rounded-full bg-orange-150 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-orange-700">
                          {resource.type}
                        </span>
                        <h3 className="mt-3 truncate text-sm font-black uppercase tracking-[0.08em] text-slate-900">
                          {resource.title}
                        </h3>
                        <p className="mt-1 truncate text-xs font-semibold text-slate-600">{resource.subject}</p>
                      </div>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50/30 px-6 py-12 text-center sm:col-span-2">
                  <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-800">No resources matched your semester filter</p>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ROW 2 RIGHT: Weekly Timetable (Spans 4) */}
        <section className="lg:col-span-4">
          <div className="portal-panel portal-3d rounded-[2.4rem] p-8 h-full flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                    <Calendar size={22} />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-slate-700">Weekly Timetable</p>
                    <h3 className="mt-1 text-base font-black text-slate-900">
                      {user?.department || 'MCA'} - Sem {selectedSemester}
                    </h3>
                  </div>
                </div>

                {timetable && (
                  <button
                    onClick={() => setShowTimetableModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider transition border border-amber-200/50"
                  >
                    View Full
                  </button>
                )}
              </div>

              {/* Semester Selector */}
              <div className="flex gap-1.5 p-1 bg-slate-100/80 rounded-2xl border border-slate-200/50 mb-4">
                {[1, 2, 3, 4].map((sem) => (
                  <button
                    key={sem}
                    type="button"
                    onClick={() => setSelectedSemester(sem)}
                    className={`flex-1 text-[10px] font-black uppercase py-2 rounded-xl transition ${
                      selectedSemester === sem
                        ? 'bg-white text-amber-900 border border-amber-200 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Sem {sem}
                  </button>
                ))}
              </div>

              {loadingTimetable ? (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-5 h-5 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-500 font-bold uppercase">Loading schedule...</p>
                </div>
              ) : timetable && (timetable.schedule || timetable.rows) ? (
                <div className="space-y-4">
                  {/* Status Indicator */}
                  <div className="flex items-center justify-between bg-emerald-50/50 border border-emerald-100/60 rounded-2xl px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                        Active Schedule Loaded
                      </span>
                    </div>
                    <span className="text-[9px] font-bold text-slate-500">
                      W.e.f. {timetable.wef || 'Immediate'}
                    </span>
                  </div>

                  {/* Cohort Details Grid */}
                  <div className="grid grid-cols-2 gap-3 bg-slate-50/60 border border-slate-100/80 rounded-2xl p-4">
                    <div>
                      <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Classroom</span>
                      <span className="text-xs font-black text-slate-800">{timetable.classroom || 'Room -'}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Practical Lab</span>
                      <span className="text-xs font-black text-slate-800">{timetable.lab || 'Lab -'}</span>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-slate-250/50">
                      <span className="block text-[8px] font-black uppercase tracking-wider text-slate-400 mb-0.5">Class Coordinator</span>
                      <span className="text-xs font-bold text-slate-700">{timetable.classCoordinator || 'Not Assigned'}</span>
                    </div>
                  </div>

                  {/* Main Action Button */}
                  <button
                    onClick={() => setShowTimetableModal(true)}
                    className="w-full text-center py-3.5 rounded-2xl bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_100%)] hover:opacity-95 hover:shadow-lg text-white text-xs font-black uppercase tracking-[0.18em] shadow-md transition duration-205 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Search size={14} />
                    Launch Interactive Schedule
                  </button>
                </div>
              ) : (
                <div className="text-center py-8 px-4 bg-slate-50/30 rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs font-black uppercase tracking-[0.1em] text-slate-700 mb-1">No Timetable Uploaded</p>
                  <p className="text-[10px] text-slate-500 font-semibold uppercase leading-normal">The HOD has not registered a schedule for your cohort yet.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Stunning high-fidelity full screen schedule modal */}
      {showTimetableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto bg-white rounded-[2.5rem] p-8 shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowTimetableModal(false)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition"
            >
              <X size={20} />
            </button>
            <div className="mb-6">
              <span className="portal-chip text-[10px] font-black uppercase tracking-[0.22em] bg-amber-50 text-amber-700">
                <Calendar size={12} className="inline mr-1" />
                Cohort Master Schedule
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                Weekly Class Timetable & Syllabus
              </h2>
              <p className="text-xs text-slate-500 font-bold uppercase mt-1">
                Department: {user?.department || 'MCA'} | Semester: {selectedSemester}
              </p>
            </div>

            <div className="border-t border-slate-100 pt-6">
              <TimetableRenderer timetableData={timetable} semester={selectedSemester} department={user?.department || 'MCA'} isEditMode={false} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
