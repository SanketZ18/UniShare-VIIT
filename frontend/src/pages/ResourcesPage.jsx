import { RefreshCw } from 'lucide-react'
import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import EmptyState from '../components/ui/EmptyState'
import ResourceCard from '../components/resources/ResourceCard'
import ResourceFilters from '../components/resources/ResourceFilters'
import { useAuth } from '../hooks/useAuth'
import {
  deleteResource,
  downloadResource,
  fetchResources,
  syncExternalResources,
  toggleBookmark,
} from '../services/resourceService'

const STAFF_ROLES = ['SUPER_ADMIN', 'DIRECTOR', 'HOD', 'STAFF']

const initialFilters = {
  search: '',
  type: 'ALL',
  department: 'ALL',
  semester: '',
  year: '',
}

export default function ResourcesPage() {
  const { user } = useAuth()
  const [resources, setResources] = useState([])
  const [filters, setFilters] = useState(initialFilters)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Sync state
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncError, setSyncError] = useState('')

  const isStaff = user && STAFF_ROLES.includes(user.role)

  const deferredSearch = useDeferredValue(filters.search)

  const query = useMemo(
    () => ({
      search: deferredSearch || undefined,
      type: filters.type === 'ALL' ? undefined : filters.type,
      department: filters.department === 'ALL' ? undefined : filters.department,
      semester: filters.semester || undefined,
      year: filters.year || undefined,
    }),
    [deferredSearch, filters.type, filters.department, filters.semester, filters.year],
  )

  useEffect(() => {
    let active = true

    fetchResources(query)
      .then((data) => {
        if (active) {
          setResources(data)
          setError('')
        }
      })
      .catch((requestError) => {
        if (active) {
          setError(requestError.response?.data?.message || 'Unable to fetch resources.')
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false)
        }
      })

    return () => {
      active = false
    }
  }, [query])

  const handleFilterChange = (key, value) => {
    setLoading(true)
    startTransition(() => {
      setFilters((current) => ({
        ...current,
        [key]: value,
      }))
    })
  }

  const [downloadingId, setDownloadingId] = useState(null)

  const handleBookmark = async (resourceId) => {
    const response = await toggleBookmark(resourceId)
    setResources((current) =>
      current.map((resource) =>
        resource.id === resourceId ? { ...resource, bookmarked: response.bookmarked } : resource,
      ),
    )
  }

  const handleDelete = async (resourceId) => {
    await deleteResource(resourceId)
    setResources((current) => current.filter((resource) => resource.id !== resourceId))
  }

  const handleDownload = async (resourceId, fileName) => {
    setDownloadingId(resourceId)
    try {
      await downloadResource(resourceId, fileName)
    } catch (downloadError) {
      alert(downloadError.response?.data?.message || 'Download failed. The file might be currently unavailable.')
    } finally {
      setDownloadingId(null)
    }
  }

  /**
   * Triggers an on-demand SPPU content sync and re-fetches the resource list
   * after a short delay to allow the backend time to ingest new records.
   */
  const handleSppuSync = async () => {
    setSyncing(true)
    setSyncMessage('')
    setSyncError('')
    try {
      const result = await syncExternalResources()
      setSyncMessage(result?.message || 'SPPU sync started! New resources will appear shortly.')

      // Re-fetch the resource list after ~5 s to pick up newly synced items
      setTimeout(() => {
        setLoading(true)
        fetchResources(query)
          .then((data) => setResources(data))
          .catch(() => {})
          .finally(() => setLoading(false))
      }, 5000)
    } catch (syncErr) {
      setSyncError(syncErr.response?.data?.message || 'Sync failed. Please try again later.')
    } finally {
      setSyncing(false)
      // Auto-dismiss toast after 8 s
      setTimeout(() => {
        setSyncMessage('')
        setSyncError('')
      }, 8000)
    }
  }

  return (
    <div className="space-y-8">
      <section className="portal-page-hero rounded-[2.4rem] px-6 py-8">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-700">Resource Library</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <h2 className="font-display text-4xl text-slate-950 font-black">
            Search, filter, bookmark, and download academic content.
          </h2>

          {/* Sync SPPU Feed button – staff / admin only */}
          {isStaff && (
            <button
              id="sppu-sync-btn"
              onClick={handleSppuSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-2xl border-2 border-amber-400 bg-amber-50 px-5 py-3 text-sm font-black text-amber-800 shadow-sm transition-all hover:bg-amber-100 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
              title="Manually pull the latest MCA &amp; MBA resources from the SPPU website"
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              {syncing ? 'Syncing SPPU Feed…' : 'Sync SPPU Feed'}
            </button>
          )}
        </div>

        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-800">
          Students can discover materials quickly, while academic teams keep resource quality and access organized.
          {isStaff && (
            <span className="ml-2 text-amber-700">
              Staff: use the <strong>Sync SPPU Feed</strong> button to pull the latest syllabi, question papers, timetables,
              and announcements directly from the SPPU official website.
            </span>
          )}
        </p>

        {/* Sync status toasts */}
        {syncMessage && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-800">
            <span className="text-emerald-500">✔</span>
            {syncMessage}
          </div>
        )}
        {syncError && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-red-50 border border-red-200 px-5 py-3 text-sm font-semibold text-red-800">
            <span className="text-red-500">✖</span>
            {syncError}
          </div>
        )}
      </section>

      <ResourceFilters filters={filters} onChange={handleFilterChange} />

      {loading ? (
        <div className="grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-72 animate-pulse rounded-[2rem] bg-white/5" />
          ))}
        </div>
      ) : null}
      {error ? <EmptyState title="Library unavailable" description={error} /> : null}
      {!loading && !error && !resources.length ? (
        <EmptyState
          title="No resources matched these filters"
          description="Try broadening the search or switching to a different department, subject, or semester."
        />
      ) : null}

      <section className="grid gap-5 xl:grid-cols-2">
        {resources.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            userRole={user.role}
            onBookmark={handleBookmark}
            onDelete={handleDelete}
            onDownload={handleDownload}
            isDownloading={downloadingId === resource.id}
          />
        ))}
      </section>
    </div>
  )
}
