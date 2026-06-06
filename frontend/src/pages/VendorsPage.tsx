import { useState, useEffect } from 'react'
import { Search, Pencil, Trash2, Building2, Loader2, X, Check } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'

interface Vendor {
  id: number
  name: string
  category: string | null
  gst_number: string | null
  email: string | null
  phone_number: string | null
  status: string
  created_at: string
}

const CATEGORIES = ['Technology', 'Logistics', 'Raw Materials', 'Services', 'Construction', 'Other']
const EDITABLE_STATUSES = ['Pending', 'Active', 'Inactive', 'Blacklisted']

export default function VendorsPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin'
  const canManage = ['admin', 'officer'].includes(user?.role || '')

  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Vendor | null>(null)
  const [form, setForm] = useState({ category: '', status: 'Pending' })
  const [saving, setSaving] = useState(false)

  const fetchVendors = async () => {
    try {
      setLoading(true)
      const params: Record<string, string> = {}
      if (search) params.search = search
      if (filterCat) params.category = filterCat
      if (filterStatus) params.status = filterStatus
      const res = await api.get('/api/vendors', { params })
      setVendors(res.data)
    } catch {
      toast.error('Failed to load vendors')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchVendors() }, [search, filterCat, filterStatus])

  const openEdit = (v: Vendor) => {
    setEditing(v)
    setForm({ category: v.category || '', status: v.status })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        // Only update category and status
        await api.put(`/api/vendors/${editing.id}`, {
          name: editing.name,
          category: form.category,
          status: form.status,
          gst_number: editing.gst_number,
          email: editing.email,
          phone_number: editing.phone_number,
        })
        toast.success('Vendor updated')
      } else {
        toast.error('Vendor creation is not supported here. Vendors self-register.')
        setSaving(false)
        return
      }
      setShowModal(false)
      fetchVendors()
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this vendor?')) return
    try {
      await api.delete(`/api/vendors/${id}`)
      toast.success('Vendor deleted')
      fetchVendors()
    } catch {
      toast.error('Delete failed')
    }
  }

  const statusColor = (s: string) => ({
    Active: 'bg-green-100 text-green-700 border-green-200',
    Pending: 'bg-amber-100 text-amber-700 border-amber-200',
    Inactive: 'bg-gray-100 text-gray-600 border-gray-200',
    Blacklisted: 'bg-red-100 text-red-700 border-red-200',
  }[s] || 'bg-gray-100 text-gray-600 border-gray-200')

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin ? 'Manage your approved supplier network' : 'View vendor records'}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-card p-4 flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input-field pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select className="input-field sm:w-44" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input-field sm:w-36" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {EDITABLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-20">
            <Building2 size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No vendors found</p>
            <p className="text-gray-400 text-sm mt-1">Vendors will appear here after registration</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-100 border-b border-gray-200">
                <tr>
                  {['Name', 'Category', 'Email', 'Phone', 'GST Number', 'Status', ...(canManage ? ['Actions'] : [])].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendors.map(v => (
                  <tr key={v.id} className="hover:bg-surface-100 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{v.name}</td>
                    <td className="px-4 py-3 text-gray-500">{v.category || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{v.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{v.phone_number || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">{v.gst_number || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColor(v.status)}`}>
                        {v.status}
                      </span>
                    </td>
                    {canManage && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(v)} className="p-1.5 rounded-lg hover:bg-brand-50 text-gray-400 hover:text-brand-600 transition-colors" title="Edit status/category">
                            <Pencil size={15} />
                          </button>
                          {isAdmin && (
                            <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal - shows full vendor details, only status/category are editable */}
      {showModal && editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Vendor Details</h2>
                <p className="text-xs text-gray-400 mt-0.5">Only Status and Category can be changed</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Read-only details */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 rounded-xl p-4">
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Vendor Name</p>
                  <p className="text-sm font-semibold text-gray-900">{editing.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Email</p>
                  <p className="text-sm text-gray-700">{editing.email || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Phone</p>
                  <p className="text-sm text-gray-700">{editing.phone_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">GST Number</p>
                  <p className="text-sm text-gray-700">{editing.gst_number || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase font-semibold mb-1">Registered</p>
                  <p className="text-sm text-gray-700">{new Date(editing.created_at).toLocaleDateString()}</p>
                </div>
              </div>

              {/* Editable fields */}
              <div className="border border-brand-100 bg-brand-50/30 rounded-xl p-4 space-y-4">
                <p className="text-xs font-bold text-brand-700 uppercase tracking-wide">Editable Fields</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="form-label">Category</label>
                    <select className="input-field" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                      <option value="">Select…</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Status</label>
                    <select className="input-field" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                      {EDITABLE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
