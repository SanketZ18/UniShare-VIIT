import { useAuth } from '../hooks/useAuth'
import { useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, Trash2, FileSpreadsheet, UserPlus, ShieldCheck, Database, RefreshCw, UserCheck, UserX, AlertTriangle } from 'lucide-react'
import { useState, useEffect } from 'react'
import { fetchAllUsers, deleteUserAccount, toggleUserStatus, bulkDeleteStudentsByBatch, bulkRegisterStudents } from '../services/authService'
import RolePill from '../components/ui/RolePill'

const roleOptions = ['STUDENT', 'STAFF', 'HOD', 'SENIOR_CLERK', 'DIRECTOR', 'SUPER_ADMIN']
const departments = ['MCA', 'MBA']

const initialState = {
  role: 'STUDENT',
  email: '',
  password: '',
  fullName: '',
  mobile: '',
  gender: 'MALE',
  department: 'MCA',
  status: 'ACTIVE',
  prn: '',
  year: '1',
  semester: '1',
  division: '',
  staffId: '',
  designation: '',
  subjects: '',
  birthDate: '',
  batchYear: '',
}

export default function RegisterPage() {
  const { user, register, authBusy } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [form, setForm] = useState(() => {
    const roleParam = searchParams.get('role')
    return {
      ...initialState,
      role: roleParam && roleOptions.includes(roleParam) ? roleParam : 'STUDENT'
    }
  })
  const [result, setResult] = useState({ type: '', message: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [excelFile, setExcelFile] = useState(null)
  const [bulkProcessing, setBulkProcessing] = useState(false)
  const [users, setUsers] = useState([])
  const [loadingUsers, setLoadingUsers] = useState(true)

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const data = await fetchAllUsers()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  useEffect(() => {
    let active = true

    fetchAllUsers()
      .then((data) => {
        if (active) {
          setUsers(data)
        }
      })
      .catch((requestError) => {
        console.error('Failed to load users:', requestError)
      })
      .finally(() => {
        if (active) {
          setLoadingUsers(false)
        }
      })

    return () => {
      active = false
    }
  }, [])

  const filteredUsers = users.filter(u => {
    const roleFilter = searchParams.get('role') || 'STUDENT'
    const deptFilter = searchParams.get('dept')
    const yearFilter = searchParams.get('year')

    // If no role filter is set, default to showing the role from the active tab if possible
    // but here we just follow the searchParams.

    if (roleFilter === 'STAFF_LIST' || roleFilter === 'STAFF') {
      // Custom filter for "All Staff" tab (everything except STUDENT)
      if (u.role === 'STUDENT') return false
    } else if (roleFilter && u.role !== roleFilter) {
      return false
    }

    if (deptFilter && u.department !== deptFilter) return false
    if (yearFilter && String(u.year) !== yearFilter) return false

    return true
  })

  // Determine current active tab
  const currentTab = searchParams.get('role') === 'STUDENT' || !searchParams.get('role') ? 'STUDENT' : 'STAFF';

  const visibleRoles = roleOptions.filter((role) => {
    if (user?.role === 'SUPER_ADMIN') return true
    if (user?.role === 'DIRECTOR') return ['STUDENT', 'STAFF', 'HOD', 'SENIOR_CLERK'].includes(role)
    if (user?.role === 'HOD') return ['STUDENT', 'STAFF'].includes(role)
    if (user?.role === 'SENIOR_CLERK') return role === 'STUDENT'
    return false
  })

  const isStudent = form.role === 'STUDENT'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setResult({ type: '', message: '' })
    try {
      await register({
        ...form,
        year: Number(form.year),
        semester: Number(form.semester),
        subjects: isStudent ? [] : form.subjects.split(',').map((item) => item.trim()).filter(Boolean),
      })
      setResult({ type: 'success', message: `${form.role.replaceAll('_', ' ')} account created successfully.` })
      setForm(initialState)
      loadUsers()
    } catch (error) {
      setResult({ type: 'error', message: error.response?.data?.message || 'Registration failed.' })
    }
  }

  const handleBulkUpload = async (event) => {
    event.preventDefault()
    if (!excelFile) return
    setBulkProcessing(true)
    setResult({ type: '', message: '' })
    const formData = new FormData()
    formData.append('file', excelFile)
    try {
      const response = await bulkRegisterStudents(formData)
      setResult({ type: 'success', message: response.message })
      setExcelFile(null)
      loadUsers()
    } catch (error) {
      setResult({ type: 'error', message: error.response?.data?.message || 'Bulk registration failed.' })
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Delete this user? This cannot be undone.')) return
    try {
      // Optimistic update: remove user from local state immediately
      setUsers(prev => prev.filter(u => u.accountId !== userId))
      await deleteUserAccount(userId)
      setResult({ type: 'success', message: 'User deleted.' })
    } catch {
      setResult({ type: 'error', message: 'Failed to delete user.' })
      loadUsers() // Rollback on error
    }
  }

  const handleToggleStatus = async (userId) => {
    try {
      // Optimistic update: toggle status in local state immediately
      setUsers(prev => prev.map(u => u.accountId === userId ? { ...u, active: !u.active } : u))
      await toggleUserStatus(userId)
      setResult({ type: 'success', message: 'User access status updated.' })
    } catch {
      setResult({ type: 'error', message: 'Failed to update user status.' })
      loadUsers() // Rollback on error
    }
  }

  const handleBulkDeleteByBatch = async (batch) => {
    if (!batch) {
      setResult({ type: 'error', message: 'Please provide a Batch Year for bulk deletion.' })
      return
    }
    if (!window.confirm(`WARNING: Are you sure you want to delete ALL students in Batch ${batch}? This action is IRREVERSIBLE.`)) return

    try {
      // Optimistic update
      setUsers(prev => prev.filter(u => u.batchYear !== batch))
      await bulkDeleteStudentsByBatch(batch)
      setResult({ type: 'success', message: `SUCCESS: Registry wiped for Batch ${batch}. All associated student profiles and accounts have been permanently removed.` })
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (error) {
      setResult({ type: 'error', message: error.response?.data?.message || 'Bulk deletion failed.' })
      loadUsers() // Rollback
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="portal-page-hero rounded-[2.4rem] px-6 py-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-950">Identity Provisioning</h1>
          <p className="text-slate-800 text-sm mt-1">Manage institutional credentials and departmental node access.</p>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-100 px-4 py-1.5">
          <ShieldCheck size={16} className="text-amber-700" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">Governance Active</span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Manual Form */}
        <div className="lg:col-span-2 space-y-6">
          <section className="portal-panel portal-3d rounded-2xl p-8">
            <div className="mb-8 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <UserPlus size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Direct Registration</h3>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Assigned Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="portal-form-field w-full px-4 py-3 text-sm"
                >
                  {visibleRoles.map((r) => <option key={r} value={r}>{r.replaceAll('_', ' ')}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Department Node</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="portal-form-field w-full px-4 py-3 text-sm"
                >
                  {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Full Legal Name</label>
                <input
                  required
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="portal-form-field w-full px-4 py-3 text-sm font-semibold text-black"
                  placeholder="Enter Name"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Mobile Number</label>
                <input
                  required
                  type="tel"
                  placeholder="Enter 10-digit mobile"
                  value={form.mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setForm({ ...form, mobile: val });
                  }}
                  className="portal-form-field w-full px-4 py-3 text-sm font-semibold text-black"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Institutional Email</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="portal-form-field w-full px-4 py-3 text-sm font-semibold text-black"
                  placeholder="Enter Institutional Email"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Initial Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength="8"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="portal-form-field w-full px-4 py-3 text-sm font-semibold text-black"
                    placeholder="Enter Initial Password"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-700">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Biological Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm({ ...form, gender: e.target.value })}
                  className="portal-form-field w-full px-4 py-3 text-sm"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Date of Birth</label>
                <input
                  type="date"
                  required
                  value={form.birthDate}
                  onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                  className="portal-form-field w-full px-4 py-3 text-sm"
                />
              </div>

              {isStudent ? (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">PRN Identifier</label>
                    <input required value={form.prn} onChange={(e) => setForm({ ...form, prn: e.target.value })} className="portal-form-field w-full px-4 py-3 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Batch Year (e.g. 2022-26)</label>
                    <input required placeholder="2022-26" value={form.batchYear} onChange={(e) => setForm({ ...form, batchYear: e.target.value })} className="portal-form-field w-full px-4 py-3 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Division</label>
                    <input required value={form.division} onChange={(e) => setForm({ ...form, division: e.target.value })} className="portal-form-field w-full px-4 py-3 text-sm" />
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Staff Identifier</label>
                    <input value={form.staffId} onChange={(e) => setForm({ ...form, staffId: e.target.value })} className="portal-form-field w-full px-4 py-3 text-sm" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-950 uppercase tracking-widest ml-1">Designation</label>
                    <input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} className="portal-form-field w-full px-4 py-3 text-sm" />
                  </div>
                </>
              )}

              {result.message && (
                <div className={`sm:col-span-2 rounded-xl border px-5 py-3 text-xs font-bold ${result.type === 'success' ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-500' : 'border-rose-500/20 bg-rose-500/5 text-rose-500'}`}>
                  {result.message}
                </div>
              )}

              <div className="sm:col-span-2 flex justify-end pt-4">
                <button type="submit" disabled={authBusy} className="portal-button-primary flex items-center gap-2 rounded-xl px-8 py-3 text-sm font-bold">
                  <UserPlus size={18} />
                  {authBusy ? 'Provisioning...' : 'Provision Account'}
                </button>
              </div>
            </form>
          </section>
        </div>

        {/* Sidebar Tools */}
        <div className="space-y-6">
          {/* Bulk Upload */}
          <section className="portal-panel portal-3d rounded-2xl p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
                <FileSpreadsheet size={20} />
              </div>
              <h3 className="text-lg font-bold text-slate-950">Bulk Intake</h3>
            </div>
            <p className="text-xs font-medium leading-relaxed text-slate-700 mb-6">Process multiple student records via secure Excel synchronization.</p>
            <form onSubmit={handleBulkUpload} className="space-y-4">
              <input
                type="file"
                accept=".xlsx"
                onChange={(e) => setExcelFile(e.target.files[0])}
                className="w-full text-[10px] text-slate-800 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-200 file:px-4 file:py-2 file:text-[10px] file:font-black file:uppercase file:text-slate-900 hover:file:bg-slate-300 transition"
              />
              <button disabled={!excelFile || bulkProcessing} className="portal-button-primary w-full rounded-xl py-3 text-xs font-bold uppercase tracking-widest">
                {bulkProcessing ? 'Processing...' : 'Upload Data Node'}
              </button>
            </form>
          </section>

          {/* Directory Stats */}
          <section className="portal-panel portal-3d rounded-2xl p-8">
            <h3 className="text-lg font-bold text-slate-950 mb-6 flex items-center gap-3">
              <Database size={18} className="text-amber-600" />
              Registry Pulse
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Total Nodes</span>
                <span className="text-lg font-bold text-slate-950">{users.length}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Registry Load</span>
                <span className="text-[10px] font-black text-emerald-600 uppercase">Optimal</span>
              </div>
            </div>
          </section>

          {/* Bulk Cleanup Tools */}
          <section className="portal-panel portal-3d rounded-2xl p-8 border-rose-500/10 bg-rose-500/5">
            <h3 className="text-lg font-bold text-rose-950 mb-6 flex items-center gap-3">
              <AlertTriangle size={18} className="text-rose-600" />
              Registry Cleanup
            </h3>
            <p className="text-[10px] font-bold text-rose-900 uppercase tracking-widest mb-4">Wipe Data by Batch Year</p>
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Enter Batch (e.g. 2022-26)"
                id="bulkBatchInput"
                className="portal-form-field w-full px-4 py-2.5 text-xs font-bold border-rose-200 focus:border-rose-500"
              />
              <button
                onClick={() => handleBulkDeleteByBatch(document.getElementById('bulkBatchInput').value)}
                className="w-full rounded-xl bg-rose-600 py-3 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-rose-600/20 hover:bg-rose-700 transition"
              >
                Confirm Batch Wipe
              </button>
            </div>
          </section>
        </div>
      </div>

      {/* Directory Table */}
      <section className="portal-panel portal-3d rounded-2xl p-8">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Identity Directory</h2>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-slate-700 text-sm">Registry of all provisioned departmental credentials.</p>
              {(searchParams.get('role') || searchParams.get('dept') || searchParams.get('year')) && (
                <button
                  onClick={() => window.history.replaceState(null, '', window.location.pathname)}
                  className="rounded bg-orange-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-orange-300 transition-colors hover:bg-orange-500/20"
                >
                  Clear Filter
                </button>
              )}
            </div>
          </div>
          <button onClick={loadUsers} className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-100 text-slate-800 hover:text-slate-900 transition">
            <RefreshCw size={18} className={loadingUsers ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="mb-8 flex border-b border-slate-100">
          <button
            onClick={() => setSearchParams({ role: 'STUDENT' })}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${currentTab === 'STUDENT' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Student Registry
          </button>
          <button
            onClick={() => setSearchParams({ role: 'STAFF_LIST' })}
            className={`px-6 py-3 text-xs font-black uppercase tracking-widest transition-all ${currentTab === 'STAFF' ? 'border-b-2 border-orange-500 text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            Professional Staff
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-bold uppercase tracking-widest text-slate-900">
                <th className="pb-4 text-left font-bold">Institutional Identity</th>
                <th className="pb-4 text-left font-bold">{currentTab === 'STUDENT' ? 'Student Name' : 'Profile Name'}</th>
                <th className="pb-4 text-left font-bold">{currentTab === 'STUDENT' ? 'Batch' : 'Designation'}</th>
                <th className="pb-4 text-left font-bold">Department</th>
                <th className="pb-4 text-left font-bold">Access</th>
                <th className="pb-4 text-right font-bold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingUsers && users.length === 0 ? (
                <tr><td colSpan="6" className="py-20 text-center text-xs font-bold text-slate-700 uppercase tracking-[0.2em]">Synchronizing Registry...</td></tr>
              ) : filteredUsers.length === 0 ? (
                <tr><td colSpan="6" className="py-20 text-center text-xs font-bold text-slate-800 uppercase tracking-[0.2em]">No records found for this node</td></tr>
              ) : filteredUsers.map((u) => (
                <tr key={u.accountId} className="group transition hover:bg-slate-50/50">
                  <td className="py-5">
                    <div className="text-xs font-bold text-slate-900">{u.email}</div>
                    <div className="text-[10px] text-slate-800 font-bold mt-0.5">{u.role}</div>
                  </td>
                  <td className="py-5">
                    <div className="text-base font-bold text-slate-950">{u.fullName}</div>
                  </td>
                  <td className="py-5 text-sm font-bold text-amber-600 uppercase tracking-widest">
                    {currentTab === 'STUDENT' ? (u.batchYear || 'N/A') : (u.designation || u.role)}
                  </td>
                  <td className="py-5 text-sm font-bold text-slate-700 uppercase tracking-wider">{u.department} {u.year ? `• Y${u.year}` : ''}</td>
                  <td className="py-5">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${u.active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {u.active ? <UserCheck size={10} /> : <UserX size={10} />}
                      {u.active ? 'Active' : 'Locked'}
                    </span>
                  </td>
                  <td className="py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleToggleStatus(u.accountId)}
                        title={u.active ? 'Deactivate Access' : 'Activate Access'}
                        className={`rounded-lg p-2 transition shadow-sm ${u.active ? 'bg-amber-100 text-amber-700 hover:bg-amber-200' : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'}`}
                      >
                        {u.active ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u.accountId)}
                        className="rounded-lg p-2 bg-rose-100 text-rose-700 hover:bg-rose-200 transition shadow-sm"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
