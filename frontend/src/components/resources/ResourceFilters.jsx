import { Filter, Hash, Layers, Search } from 'lucide-react'

const typeOptions = ['ALL', 'NOTES', 'ASSIGNMENT', 'QUESTION_PAPER', 'SYLLABUS', 'SPPU_RESOURCES']
const departmentOptions = ['ALL', 'MCA', 'MBA']
const sourceOptions = ['ALL', 'COLLEGE_AUTHORITY']

const typeLabels = {
  ALL: 'All Types',
  NOTES: 'Notes',
  ASSIGNMENT: 'Assignment',
  QUESTION_PAPER: 'Question Paper',
  SYLLABUS: 'Syllabus',
  SPPU_RESOURCES: 'SPPU Resources',
}

const sourceLabels = {
  ALL: 'All Sources',
  COLLEGE_AUTHORITY: 'College Authority',
}


export default function ResourceFilters({ filters, onChange }) {
  return (
    <div className="portal-panel portal-3d rounded-[2rem] p-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-6">
        <div className="space-y-2 md:col-span-2">
          <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Search</label>
          <div className="relative">
            <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" />
            <input
              value={filters.search}
              onChange={(event) => onChange('search', event.target.value)}
              placeholder="Search by title, subject, or keyword..."
              className="portal-form-field w-full pl-12 pr-4 py-3.5 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Type</label>
          <div className="relative">
            <Filter size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" />
            <select
              value={filters.type}
              onChange={(event) => onChange('type', event.target.value)}
              className="portal-form-field w-full cursor-pointer appearance-none pl-12 pr-4 py-3.5 text-sm"
            >
              {typeOptions.map((option) => (
                <option key={option} value={option}>
                  {typeLabels[option] || option.replaceAll('_', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Source</label>
          <div className="relative">
            <Layers size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" />
            <select
              value={filters.source || 'ALL'}
              onChange={(event) => onChange('source', event.target.value)}
              className="portal-form-field w-full cursor-pointer appearance-none pl-12 pr-4 py-3.5 text-sm"
            >
              {sourceOptions.map((option) => (
                <option key={option} value={option}>
                  {sourceLabels[option]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Department</label>
          <div className="relative">
            <Layers size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" />
            <select
              value={filters.department}
              onChange={(event) => onChange('department', event.target.value)}
              className="portal-form-field w-full cursor-pointer appearance-none pl-12 pr-4 py-3.5 text-sm"
            >
              {departmentOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">Semester / Year</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Hash size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-800" />
              <input
                value={filters.semester}
                onChange={(event) => onChange('semester', event.target.value)}
                type="number"
                placeholder="Sem"
                className="portal-form-field w-full pl-9 pr-3 py-3.5 text-sm"
              />
            </div>
            <div className="relative flex-1">
              <Hash size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-800" />
              <input
                value={filters.year}
                onChange={(event) => onChange('year', event.target.value)}
                type="number"
                placeholder="Year"
                className="portal-form-field w-full pl-9 pr-3 py-3.5 text-sm"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
