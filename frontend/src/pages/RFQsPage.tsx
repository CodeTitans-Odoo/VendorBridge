import { useState, useEffect } from 'react'
import { Plus, FileText, Loader2, X, Calendar, Trash2, ChevronDown, ChevronRight, Package, Upload, CheckCircle2, XCircle } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'

interface RFQItem { product_name: string; quantity: number; units: string; category: string }
interface RFQ {
  id: number; title: string; description: string | null; deadline: string
  status: string; created_by: number | null; created_at: string; items: RFQItem[]; vendor_ids: number[]
}
interface Vendor { id: number; name: string }

const STATUS_COLORS: Record<string, string> = {
  Draft: 'bg-gray-100 text-gray-600 border-gray-200',
  'Pending Approval': 'bg-amber-100 text-amber-700 border-amber-200',
  Open: 'bg-blue-100 text-blue-700 border-blue-200',
  Closed: 'bg-purple-100 text-purple-700 border-purple-200',
  Cancelled: 'bg-red-100 text-red-700 border-red-200',
}

const EMPTY_ITEM: RFQItem = { product_name: '', quantity: 1, units: 'pcs', category: '' }

import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RFQsPage() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isVendor = user?.role === 'vendor'
  const isOfficerOrAbove = ['officer', 'manager', 'admin'].includes(user?.role || '')
  const canCreateOrDeleteRFQ = ['officer', 'admin'].includes(user?.role || '')

  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showPanel, setShowPanel] = useState(false)
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [form, setForm] = useState({
    title: '', description: '', deadline: '', vendor_ids: [] as number[], items: [{ ...EMPTY_ITEM }], attachments: [] as File[]
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setForm(p => ({ ...p, attachments: [...p.attachments, ...Array.from(e.target.files!)] }))
    }
  }

  const removeFile = (index: number) => {
    setForm(p => ({ ...p, attachments: p.attachments.filter((_, i) => i !== index) }))
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const rfqRes = await api.get('/api/rfqs')
      let vendorRes = { data: [] }
      if (isOfficerOrAbove) {
        vendorRes = await api.get('/api/vendors')
      }
      setRfqs(rfqRes.data)
      setVendors(vendorRes.data)
    } catch { toast.error('Failed to load data') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_ITEM }] }))
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))
  const updateItem = (i: number, field: keyof RFQItem, val: string | number) =>
    setForm(p => { const items = [...p.items]; items[i] = { ...items[i], [field]: val }; return { ...p, items } })

  const toggleVendor = (id: number) => setForm(p => ({
    ...p,
    vendor_ids: p.vendor_ids.includes(id) ? p.vendor_ids.filter(v => v !== id) : [...p.vendor_ids, id]
  }))

  const handleCreate = async () => {
    if (!form.title.trim()) { toast.error('Title required'); return }
    if (!form.deadline) { toast.error('Deadline required'); return }
    if (form.items.some(i => !i.product_name.trim())) { toast.error('All items need a product name'); return }
    setSaving(true)
    try {
      await api.post('/api/rfqs', form)
      toast.success('RFQ created!')
      setShowPanel(false)
      setForm({ title: '', description: '', deadline: '', vendor_ids: [], items: [{ ...EMPTY_ITEM }], attachments: [] })
      fetchData()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Failed to create RFQ') }
    finally { setSaving(false) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this RFQ?')) return
    try { await api.delete(`/api/rfqs/${id}`); toast.success('RFQ deleted'); fetchData() }
    catch { toast.error('Delete failed') }
  }

  const handleApproveRFQ = async (id: number, status: 'Open' | 'Rejected') => {
    try {
      await api.post(`/api/rfqs/${id}/approve`, { status })
      toast.success(`RFQ ${status === 'Open' ? 'Approved' : 'Rejected'}`)
      fetchData()
    } catch { toast.error('Action failed') }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isVendor ? 'Invited RFQs' : 'Request for Quotations'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isVendor ? 'View and respond to procurement requests' : 'Create and manage procurement requests'}
          </p>
        </div>
        {canCreateOrDeleteRFQ && (
          <button onClick={() => setShowPanel(true)} className="flex items-center gap-2 btn-primary w-auto px-5 py-2.5">
            <Plus size={16} /> New RFQ
          </button>
        )}
      </div>

      {/* RFQ List */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-card flex items-center justify-center py-20">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : rfqs.length === 0 ? (
          <div className="glass-card text-center py-20">
            <FileText size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No RFQs yet</p>
            <p className="text-gray-400 text-sm mt-1">Create your first RFQ to invite vendor quotes</p>
          </div>
        ) : rfqs.map(rfq => (
          <div key={rfq.id} className="glass-card overflow-hidden">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-surface-100 transition-colors"
              onClick={() => setExpandedId(expandedId === rfq.id ? null : rfq.id)}
            >
              <div className="flex items-center gap-3">
                {expandedId === rfq.id ? <ChevronDown size={16} className="text-brand-500" /> : <ChevronRight size={16} className="text-gray-400" />}
                <div>
                  <p className="font-semibold text-gray-900">{rfq.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {rfq.items.length} item{rfq.items.length !== 1 ? 's' : ''} · {rfq.vendor_ids.length} vendor{rfq.vendor_ids.length !== 1 ? 's' : ''} invited · Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[rfq.status] || STATUS_COLORS.Draft}`}>
                  {rfq.status}
                </span>
                {isVendor && rfq.status === 'Open' && (
                  <button onClick={e => { e.stopPropagation(); navigate(`/quotations?rfq_id=${rfq.id}`) }} className="btn-primary py-1 px-3 text-xs">
                    Submit Quotation
                  </button>
                )}
                {rfq.status === 'Open' && ['officer', 'admin'].includes(user?.role || '') && (
                  <button 
                    onClick={e => { e.stopPropagation(); navigate(`/quotations?rfq_id=${rfq.id}`) }}
                    className="btn-primary py-1 px-3 text-xs"
                  >
                    View Quotations
                  </button>
                )}
                {rfq.status === 'Pending Approval' && ['manager', 'admin'].includes(user?.role || '') && (
                  <div className="flex gap-2">
                    <button onClick={e => { e.stopPropagation(); handleApproveRFQ(rfq.id, 'Open') }} className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors" title="Approve">
                      <CheckCircle2 size={15} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); handleApproveRFQ(rfq.id, 'Rejected') }} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors" title="Reject">
                      <XCircle size={15} />
                    </button>
                  </div>
                )}
                {canCreateOrDeleteRFQ && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(rfq.id) }} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </div>

            {expandedId === rfq.id && (
              <div className="border-t border-gray-100 px-4 py-4 bg-surface-50">
                {rfq.description && <p className="text-sm text-gray-600 mb-4">{rfq.description}</p>}
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Line Items</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
                    <thead className="bg-gray-100">
                      <tr>
                        {['Product', 'Qty', 'Units', 'Category'].map(h => (
                          <th key={h} className="px-3 py-2 text-left text-xs font-semibold text-gray-600">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {rfq.items.map((item, i) => (
                        <tr key={i}>
                          <td className="px-3 py-2 font-medium text-gray-800">{item.product_name}</td>
                          <td className="px-3 py-2 text-gray-600">{item.quantity}</td>
                          <td className="px-3 py-2 text-gray-600">{item.units}</td>
                          <td className="px-3 py-2 text-gray-600">{item.category || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Create RFQ Side Panel */}
      {showPanel && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setShowPanel(false)} />
          <div className="w-full max-w-lg bg-white shadow-2xl overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">Create New RFQ</h2>
              <button onClick={() => setShowPanel(false)} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <div className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="form-label">RFQ Title *</label>
                <input className="input-field" placeholder="e.g. Q3 Office Supplies" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              {/* Description */}
              <div>
                <label className="form-label">Description</label>
                <textarea rows={3} className="input-field resize-none" placeholder="Provide context for vendors…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              {/* Deadline */}
              <div>
                <label className="form-label"><Calendar size={10} className="inline mr-1" />Deadline *</label>
                <input type="datetime-local" className="input-field" value={form.deadline} onChange={e => setForm(p => ({ ...p, deadline: e.target.value }))} />
              </div>

              {/* Line Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="form-label mb-0"><Package size={10} className="inline mr-1" />Line Items</label>
                  <button onClick={addItem} className="text-xs text-brand-600 font-semibold hover:underline flex items-center gap-1">
                    <Plus size={12} /> Add Item
                  </button>
                </div>
                <div className="space-y-3">
                  {form.items.map((item, i) => (
                    <div key={i} className="border border-gray-200 rounded-xl p-3 bg-surface-50">
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <input className="input-field text-xs py-2" placeholder="Product name" value={item.product_name} onChange={e => updateItem(i, 'product_name', e.target.value)} />
                        <input className="input-field text-xs py-2" placeholder="Category" value={item.category} onChange={e => updateItem(i, 'category', e.target.value)} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 items-center">
                        <input type="number" min={1} className="input-field text-xs py-2" placeholder="Qty" value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)} />
                        <input className="input-field text-xs py-2" placeholder="Units (pcs)" value={item.units} onChange={e => updateItem(i, 'units', e.target.value)} />
                        {form.items.length > 1 && (
                          <button onClick={() => removeItem(i)} className="p-2 rounded-lg hover:bg-red-50 text-red-400 flex items-center justify-center">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments UI (Simulated) */}
              <div>
                <label className="form-label"><Upload size={10} className="inline mr-1" /> Attachments</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-xl bg-surface-50 hover:bg-gray-50 transition-colors">
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none">
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">PDF, DOCX up to 10MB</p>
                  </div>
                </div>
                {form.attachments.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {form.attachments.map((file, idx) => (
                      <li key={idx} className="flex items-center justify-between py-2 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
                        <span className="truncate flex-1 text-gray-700 font-medium">{file.name}</span>
                        <button onClick={() => removeFile(idx)} className="text-red-400 hover:text-red-600 p-1">
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Invite Vendors */}
              <div>
                <label className="form-label">Invite Vendors</label>
                <div className="max-h-40 overflow-y-auto space-y-1 border border-gray-200 rounded-xl p-2 bg-surface-50">
                  {vendors.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">No vendors available. Add vendors first.</p>
                  ) : vendors.map(v => (
                    <label key={v.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white cursor-pointer">
                      <input type="checkbox" className="rounded text-brand-600 accent-brand-600" checked={form.vendor_ids.includes(v.id)} onChange={() => toggleVendor(v.id)} />
                      <span className="text-sm text-gray-700">{v.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
              <button onClick={() => setShowPanel(false)} className="btn-secondary flex-1 py-2.5">Cancel</button>
              <button onClick={handleCreate} disabled={saving} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Create RFQ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
