import { ArrowUpRight, Bookmark, Database, Download, Sparkles, Trash2, User } from 'lucide-react'

const typeMap = {
  NOTES: 'Lecture Notes',
  ASSIGNMENT: 'Assignment',
  QUESTION_PAPER: 'Question Paper',
  SYLLABUS: 'Syllabus',
  ANNOUNCEMENT: 'SPPU Announcement',
}

const typeStyles = {
  NOTES: 'bg-amber-100 text-amber-700 border-amber-200',
  ASSIGNMENT: 'bg-orange-100 text-orange-700 border-orange-200',
  QUESTION_PAPER: 'bg-amber-100 text-amber-700 border-amber-200',
  SYLLABUS: 'bg-rose-100 text-rose-700 border-rose-200',
  ANNOUNCEMENT: 'bg-emerald-100 text-emerald-700 border-emerald-200',
}

export default function ResourceCard({ resource, userRole, onBookmark, onDelete, onDownload }) {
  const canDelete = ['SUPER_ADMIN', 'DIRECTOR', 'HOD', 'STAFF'].includes(userRole)
  
  const isNew = resource.createdAt && (new Date() - new Date(resource.createdAt)) < 24 * 60 * 60 * 1000

  return (
    <article className="portal-panel portal-3d rounded-[2rem] p-6">
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-700">{resource.subject}</span>
              {isNew && (
                <span className="flex items-center gap-1 rounded-md bg-rose-500 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider text-white shadow-[0_4px_12px_rgba(244,63,94,0.3)] animate-pulse">
                  <Sparkles size={8} />
                  New
                </span>
              )}
            </div>
            <h3 className="line-clamp-1 text-xl font-black text-slate-900">{resource.title}</h3>
          </div>
          <button
            type="button"
            onClick={() => onBookmark(resource.id)}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition ${
              resource.bookmarked
                ? 'border-amber-500/24 bg-amber-500 text-white'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-orange-400/20 hover:text-slate-900'
            }`}
          >
            <Bookmark size={16} fill={resource.bookmarked ? 'currentColor' : 'none'} />
          </button>
        </div>

        <p className="mt-4 text-sm font-medium leading-7 text-slate-700">
          {resource.description || 'No description provided for this academic resource.'}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${typeStyles[resource.type] || 'border-slate-200 text-slate-600'}`}>
            {typeMap[resource.type] || resource.type}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-800">
            Sem {resource.semester}
          </span>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-800">
            {resource.department}
          </span>
        </div>
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between border-t border-slate-100 pt-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100">
              <User size={14} className="text-slate-800" />
            </div>
            <div className="text-[11px]">
              <p className="max-w-[120px] truncate font-black text-slate-900">{resource.uploaderName}</p>
              <p className="mt-1 font-bold uppercase tracking-[0.14em] text-slate-800">{resource.downloadCount || 0} downloads</p>
            </div>
          </div>

          <div className="flex gap-2">
            {canDelete ? (
              <button
                type="button"
                onClick={() => onDelete(resource.id)}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-rose-400/20 bg-rose-400/10 text-rose-600 transition hover:bg-rose-400/18"
              >
                <Trash2 size={16} />
              </button>
            ) : null}
            {resource.type === 'ANNOUNCEMENT' ? (
              <a
                href={resource.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="portal-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em]"
              >
                <ArrowUpRight size={14} />
                View Link
              </a>
            ) : (
              <button
                type="button"
                onClick={() => onDownload(resource.id, resource.fileName)}
                className="portal-button-primary inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.18em]"
              >
                <Download size={14} />
                Download
              </button>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-[10px] text-slate-800">
          <Database size={12} className="text-amber-600" />
          <span className="flex-1 truncate font-medium">{resource.fileName}</span>
          <ArrowUpRight size={12} className="opacity-70" />
        </div>
      </div>
    </article>
  )
}
