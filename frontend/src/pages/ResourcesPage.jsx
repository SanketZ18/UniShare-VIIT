import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react'
import EmptyState from '../components/ui/EmptyState'
import ResourceCard from '../components/resources/ResourceCard'
import ResourceFilters from '../components/resources/ResourceFilters'
import { useAuth } from '../hooks/useAuth'
import {
  deleteResource,
  downloadResource,
  fetchResources,
  toggleBookmark,
} from '../services/resourceService'

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



  return (
    <div className="space-y-8">
      <section className="portal-page-hero rounded-[2.4rem] px-6 py-8">
        <p className="text-xs font-black uppercase tracking-[0.35em] text-amber-700">Resource Library</p>
        <h2 className="mt-3 font-display text-4xl text-slate-950 font-black">Search, filter, bookmark, and download academic content.</h2>
        <p className="mt-4 max-w-3xl text-sm font-semibold leading-7 text-slate-800">
          Students can discover materials quickly, while academic teams keep resource quality and access organized.
        </p>
      </section>

      <ResourceFilters filters={filters} onChange={handleFilterChange} />

      {loading ? <div className="grid gap-5 xl:grid-cols-2">{Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-72 animate-pulse rounded-[2rem] bg-white/5" />)}</div> : null}
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
