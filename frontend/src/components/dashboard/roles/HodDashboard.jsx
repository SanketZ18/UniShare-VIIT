import {
  Activity,
  ArrowRight,
  Bell,
  Clock,
  Database,
  FileText,
  Layers,
  PlusCircle,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
  Upload,
  X,
  Calendar,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { fetchNotices, uploadNotice, deleteNotice } from '../../../services/noticeService'
import { fetchTimetable, saveTimetable } from '../../../services/timetableService'

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const createEmptySchedule = () => DAYS_OF_WEEK.map(day => ({ day, slots: [] }))

export default function HodDashboard({ user, summary }) {
  const [announcements, setAnnouncements] = useState([])
  const [deletingId, setDeletingId] = useState(null)
  
  // Notice Form State
  const [showModal, setShowModal] = useState(false)
  const [formDept, setFormDept] = useState(user?.department || 'MCA')
  const [formInfo, setFormInfo] = useState('')
  const [formFile, setFormFile] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Timetable State
  const [activeTab, setActiveTab] = useState('notices') // 'notices' or 'timetable'
  const [selectedDept, setSelectedDept] = useState(user?.department || 'MCA')
  const [selectedSem, setSelectedSem] = useState(1)
  const [schedule, setSchedule] = useState([])
  const [activeEditorDay, setActiveEditorDay] = useState('Monday')
  const [isSavingTimetable, setIsSavingTimetable] = useState(false)

  const stats = [
    { label: 'Total Students', value: summary?.totalStudents || 0, icon: Users, shell: 'bg-amber-100 text-amber-700' },
    { label: 'Resources', value: summary?.totalResources || 0, icon: Database, shell: 'bg-orange-100 text-orange-700' },
    { label: 'Faculty', value: summary?.totalStaff || 0, icon: ShieldCheck, shell: 'bg-emerald-100 text-emerald-700' },
  ]

  // Fresh load notices on component mount
  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const data = await fetchNotices()
        if (active) {
          const mapped = data.map(n => ({
            id: n.id,
            title: n.information,
            description: n.information,
            type: 'ANNOUNCEMENT',
            subject: n.department + ' Department',
            uploadedBy: '',
            uploaderName: n.uploaderName,
            fileUrl: n.fileUrl,
            fileName: n.fileName,
            createdAt: n.createdAt
          }))
          setAnnouncements(mapped)
        }
      } catch (err) {
        console.error('Failed to load notices', err)
      }
    }
    load()
    return () => { active = false }
  }, [])

  // Auto load timetable when selected department, semester, or tab changes
  useEffect(() => {
    if (activeTab !== 'timetable') return
    let active = true
    const loadTimetable = async () => {
      try {
        const data = await fetchTimetable(selectedDept, selectedSem)
        if (active) {
          if (data && data.schedule) {
            setSchedule(data.schedule)
          } else {
            setSchedule(createEmptySchedule())
          }
        }
      } catch (err) {
        console.error('Failed to load timetable', err)
        if (active) {
          setSchedule(createEmptySchedule())
        }
      }
    }
    loadTimetable()
    return () => { active = false }
  }, [selectedDept, selectedSem, activeTab])

  const handleDeleteAnnouncement = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return
    
    setDeletingId(id)
    try {
      await deleteNotice(id)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    } catch (err) {
      alert('Failed to delete notice.')
    } finally {
      setDeletingId(null)
    }
  }

  const handleSubmitNotice = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('department', formDept)
      formData.append('information', formInfo)
      if (formFile) {
        formData.append('file', formFile)
      }
      
      const newNotice = await uploadNotice(formData)
      
      const mappedNotice = {
        id: newNotice.id,
        title: newNotice.information,
        description: newNotice.information,
        type: 'ANNOUNCEMENT',
        subject: newNotice.department + ' Department',
        uploadedBy: '',
        uploaderName: newNotice.uploaderName,
        fileUrl: newNotice.fileUrl,
        fileName: newNotice.fileName,
        createdAt: newNotice.createdAt
      }
      
      setAnnouncements(prev => [mappedNotice, ...prev])
      setShowModal(false)
      setFormInfo('')
      setFormFile(null)
    } catch (err) {
      console.error(err)
      alert('Failed to publish notice. Make sure notice details are filled.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Timetable Handlers
  const handleUpdateSlot = (dayName, slotIndex, field, value) => {
    setSchedule(prev => prev.map(daySch => {
      if (daySch.day !== dayName) return daySch
      const updatedSlots = daySch.slots.map((slot, idx) => {
        if (idx !== slotIndex) return slot
        return { ...slot, [field]: value }
      })
      return { ...daySch, slots: updatedSlots }
    }))
  }

  const handleAddSlot = (dayName) => {
    setSchedule(prev => prev.map(daySch => {
      if (daySch.day !== dayName) return daySch
      return {
        ...daySch,
        slots: [...daySch.slots, { time: '', subject: '', teacher: '', classroom: '' }]
      }
    }))
  }

  const handleRemoveSlot = (dayName, slotIndex) => {
    setSchedule(prev => prev.map(daySch => {
      if (daySch.day !== dayName) return daySch
      return {
        ...daySch,
        slots: daySch.slots.filter((_, idx) => idx !== slotIndex)
      }
    }))
  }

  const handleSaveTimetable = async () => {
    setIsSavingTimetable(true)
    try {
      await saveTimetable({
        department: selectedDept,
        semester: Number(selectedSem),
        schedule
      })
      alert(`Weekly Timetable for ${selectedDept} - Semester ${selectedSem} saved successfully!`)
    } catch (err) {
      console.error(err)
      alert('Failed to save weekly timetable. Please check all details.')
    } finally {
      setIsSavingTimetable(false)
    }
  }

  return (
    <div className="space-y-6 pb-8 animate-in relative">
      <section className="portal-banner rounded-[2.4rem] p-8 sm:p-10">
        <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="portal-chip text-[10px] font-black uppercase tracking-[0.22em]">
              <ShieldCheck size={13} />
              HOD Command | {user?.department}
            </div>
            <h1 className="mt-6 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Knowledge Governance for the
              <span className="block bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_52%,#ea580c_100%)] bg-clip-text text-transparent">
                {user?.department} Division
              </span>
            </h1>
            <p className="mt-4 max-w-2xl text-sm font-semibold leading-7 text-slate-800 sm:text-base">
              Manage your department's resources, academic announcements, weekly timetables, and student metrics from this centralized leadership hub.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="portal-panel portal-3d rounded-[1.8rem] p-5">
                <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${stat.shell}`}>
                  <stat.icon size={20} />
                </div>
                <p className="mt-4 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">{stat.label}</p>
                <p className="mt-2 text-2xl font-black text-slate-900">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-4 mb-4">
        <button
          onClick={() => setActiveTab('notices')}
          className={`pb-3 text-xs font-black uppercase tracking-[0.2em] border-b-2 transition-all ${
            activeTab === 'notices'
              ? 'border-amber-500 text-amber-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Notice Board
        </button>
        <button
          onClick={() => setActiveTab('timetable')}
          className={`pb-3 text-xs font-black uppercase tracking-[0.2em] border-b-2 transition-all ${
            activeTab === 'timetable'
              ? 'border-amber-500 text-amber-700 font-extrabold'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Manage Timetable
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-12">
        <section className="lg:col-span-8 space-y-6">
          {activeTab === 'notices' ? (
            <>
              {/* Announcement Management Section */}
              <div className="portal-panel portal-3d rounded-[2.4rem] p-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <div className="portal-chip text-[10px] font-black uppercase tracking-[0.22em]">
                      <Bell size={12} />
                      Announcements & Academic Signals
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-slate-900">Manage Department Notices</h2>
                  </div>
                  <button
                    onClick={() => setShowModal(true)}
                    className="portal-button-primary flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black uppercase tracking-[0.18em]"
                  >
                    <PlusCircle size={15} />
                    Add New
                  </button>
                </div>

                <div className="space-y-4">
                  {announcements.length ? (
                    announcements.map((announcement) => (
                      <div
                        key={announcement.id}
                        className="portal-3d flex items-center justify-between gap-4 rounded-[1.6rem] border border-slate-100 bg-slate-50/50 p-5 transition hover:border-amber-200 hover:bg-white"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 animate-pulse">
                            <Bell size={22} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="line-clamp-2 text-sm font-black text-slate-900">{announcement.title}</h3>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.12em] text-slate-700">
                                {announcement.subject || 'Notice'}
                              </span>
                              <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-[0.05em]">
                                {new Date(announcement.createdAt).toLocaleDateString()}
                              </span>
                              {announcement.fileUrl && (
                                <a
                                  href={announcement.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.18em] text-amber-700 hover:text-amber-800"
                                >
                                  View Attachment
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={deletingId === announcement.id}
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 disabled:opacity-50"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50/30 px-6 py-12 text-center">
                      <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-800">No active notices to manage</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Repository Section */}
              <div className="portal-panel portal-3d rounded-[2.4rem] p-8">
                <div className="mb-8 flex items-center justify-between gap-4">
                  <div>
                    <div className="portal-chip text-[10px] font-black uppercase tracking-[0.22em]">
                      <Layers size={12} />
                      Department Repository
                    </div>
                    <h2 className="mt-4 text-2xl font-black text-slate-900">Recent Syllabus & Notes</h2>
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
                            <div className="flex flex-wrap gap-2">
                              <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-orange-700">
                                {resource.type}
                              </span>
                            </div>
                            <h3 className="mt-3 truncate text-sm font-black uppercase tracking-[0.08em] text-slate-900">
                              {resource.title}
                            </h3>
                            <p className="mt-1 truncate text-xs font-medium text-slate-700">{resource.subject}</p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <div className="rounded-[1.8rem] border border-dashed border-slate-200 bg-slate-50/30 px-6 py-12 text-center sm:col-span-2">
                      <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-800">No resources found</p>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Weekly Timetable Management view */
            <div className="portal-panel portal-3d rounded-[2.4rem] p-8">
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="portal-chip text-[10px] font-black uppercase tracking-[0.22em]">
                    <Calendar size={12} className="text-amber-700 mr-1 inline" />
                    Academic Weekly Schedule Setup
                  </div>
                  <h2 className="mt-4 text-2xl font-black text-slate-900">Department Weekly Timetable</h2>
                </div>
              </div>

              {/* selectors */}
              <div className="grid gap-4 sm:grid-cols-2 bg-slate-50 p-6 rounded-[1.6rem] mb-6">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-700 mb-2">Department</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  >
                    <option value="MCA">MCA Department</option>
                    <option value="MBA">MBA Department</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-[0.15em] text-slate-700 mb-2">Semester Selection</label>
                  <select
                    value={selectedSem}
                    onChange={(e) => setSelectedSem(Number(e.target.value))}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none"
                  >
                    {[1, 2, 3, 4, 5, 6].map(sem => (
                      <option key={sem} value={sem}>Semester {sem}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Day Tab Selector */}
              <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-100 pb-4">
                {DAYS_OF_WEEK.map(day => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setActiveEditorDay(day)}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-[0.1em] transition ${
                      activeEditorDay === day
                        ? 'bg-amber-100 text-amber-900 font-extrabold shadow-sm'
                        : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>

              {/* Slots List */}
              <div className="space-y-4 mb-6">
                {schedule.find(daySch => daySch.day === activeEditorDay)?.slots.length ? (
                  schedule.find(daySch => daySch.day === activeEditorDay).slots.map((slot, idx) => (
                    <div key={idx} className="flex flex-wrap items-center gap-3 bg-slate-50/50 p-4 rounded-2xl border border-slate-100 relative group animate-in slide-in-from-bottom-2 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 flex-1">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1">Time Slot</label>
                          <input
                            type="text"
                            value={slot.time}
                            onChange={(e) => handleUpdateSlot(activeEditorDay, idx, 'time', e.target.value)}
                            placeholder="e.g. 09:00 AM - 10:00 AM"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1">Subject</label>
                          <input
                            type="text"
                            value={slot.subject}
                            onChange={(e) => handleUpdateSlot(activeEditorDay, idx, 'subject', e.target.value)}
                            placeholder="e.g. Advanced Java"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1">Teacher</label>
                          <input
                            type="text"
                            value={slot.teacher}
                            onChange={(e) => handleUpdateSlot(activeEditorDay, idx, 'teacher', e.target.value)}
                            placeholder="e.g. Prof. Patil"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-[0.1em] text-slate-500 mb-1">Classroom</label>
                          <input
                            type="text"
                            value={slot.classroom}
                            onChange={(e) => handleUpdateSlot(activeEditorDay, idx, 'classroom', e.target.value)}
                            placeholder="e.g. Classroom 402"
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSlot(activeEditorDay, idx)}
                        className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 transition hover:bg-rose-100 shrink-0 self-end mb-0.5"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/20 px-6 py-10 text-center">
                    <p className="text-xs font-black uppercase tracking-[0.15em] text-slate-600">No lectures scheduled for {activeEditorDay} yet</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleAddSlot(activeEditorDay)}
                  className="portal-button-secondary rounded-2xl px-5 py-3 text-xs font-black uppercase tracking-[0.18em] flex items-center gap-2"
                >
                  <PlusCircle size={15} />
                  Add Lecture Slot
                </button>
                <button
                  type="button"
                  disabled={isSavingTimetable}
                  onClick={handleSaveTimetable}
                  className="portal-button-primary rounded-2xl px-6 py-3 text-xs font-black uppercase tracking-[0.18em] flex items-center justify-center gap-2 ml-auto"
                >
                  {isSavingTimetable ? 'Saving...' : 'Save Weekly Timetable'}
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="lg:col-span-4 space-y-6">
          {/* Quick Actions */}
          <div className="portal-panel portal-3d rounded-[2.4rem] p-8">
            <div className="portal-chip text-[10px] font-black uppercase tracking-[0.22em]">
              <Activity size={12} />
              Quick Actions
            </div>
            <div className="mt-6 space-y-3">
              <Link to="/register" className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 transition hover:border-amber-200">
                <span className="text-sm font-black uppercase tracking-[0.1em] text-slate-900">Manage Students</span>
                <Users size={16} className="text-slate-700" />
              </Link>
              <Link to="/upload" className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-5 py-4 transition hover:border-amber-200">
                <span className="text-sm font-black uppercase tracking-[0.1em] text-slate-900">Upload Resources</span>
                <PlusCircle size={16} className="text-slate-700" />
              </Link>
            </div>
          </div>

          <div className="portal-panel portal-3d rounded-[2.4rem] p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[1.5rem] bg-amber-100 text-amber-700 shadow-xl">
              <ShieldCheck size={30} />
            </div>
            <h3 className="mt-6 text-xl font-black text-slate-900">HOD Verification</h3>
            <p className="mt-3 text-sm font-medium leading-7 text-slate-700">
              You are accessing the leadership node for {user?.department}. All deletions, notice uploads, and timetables are logged under your identity.
            </p>
          </div>
        </section>
      </div>

      {/* Modern Notice Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="portal-panel portal-3d relative w-full max-w-lg rounded-[2.5rem] bg-white p-8 shadow-[0_32px_64px_rgba(15,23,42,0.22)] border border-slate-100 animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowModal(false)
                setFormInfo('')
                setFormFile(null)
              }}
              className="absolute right-6 top-6 flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 hover:bg-slate-100 transition-colors"
            >
              <X size={18} />
            </button>
            <div className="portal-chip text-[10px] font-black uppercase tracking-[0.22em] text-amber-700 mb-4 inline-flex">
              <Bell size={12} className="mr-1" />
              Publish Department Notice
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-6">Create New Notice</h3>
            
            <form onSubmit={handleSubmitNotice} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">Target Department</label>
                <select
                  value={formDept}
                  onChange={(e) => setFormDept(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-semibold text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition"
                >
                  <option value="MCA">MCA Department</option>
                  <option value="MBA">MBA Department</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">Notice Information</label>
                <textarea
                  value={formInfo}
                  onChange={(e) => setFormInfo(e.target.value)}
                  placeholder="Type the academic notice details or information here..."
                  rows={4}
                  required
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-2">File Attachment (Optional)</label>
                <div className="relative flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 hover:border-amber-500 transition-all">
                  <input
                    type="file"
                    onChange={(e) => setFormFile(e.target.files[0])}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  />
                  <Upload size={24} className="text-slate-400 mb-2" />
                  <span className="text-xs font-black uppercase tracking-[0.1em] text-slate-700 text-center max-w-[200px] truncate">
                    {formFile ? formFile.name : 'Select or drag notice file'}
                  </span>
                  <span className="mt-1 text-[9px] font-semibold text-slate-500 uppercase tracking-[0.05em]">PDF, JPG, PNG, WEBP, DOCX</span>
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false)
                    setFormInfo('')
                    setFormFile(null)
                  }}
                  className="flex-1 rounded-2xl bg-slate-100 py-3.5 text-xs font-black uppercase tracking-[0.18em] text-slate-700 hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 portal-button-primary flex items-center justify-center gap-2 rounded-2xl py-3.5 text-xs font-black uppercase tracking-[0.18em] disabled:opacity-50"
                >
                  {isSubmitting ? 'Publishing...' : 'Publish Notice'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
