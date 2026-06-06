import { useState, useEffect, useMemo } from 'react'
import { FileSpreadsheet, Plus, Loader2, CheckCircle2, XCircle, DollarSign, Clock, Package, X, Star, FileText } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useSearchParams, useNavigate } from 'react-router-dom'

interface RFQItem { product_name: string; quantity: number; units: string; category: string }
interface Quotation {
  id: number; rfq_id: number; vendor_id: number; total_price: number
  delivery_days: number; notes: string | null; status: string
  items: { id: number; product_name: string; qty: number; unit_price: number; total: number }[]
}
interface RFQ { id: number; title: string; status: string; items: RFQItem[] }
interface Vendor { id: number; name: string }

const STATUS_COLORS: Record<string, string> = {
  Submitted: 'bg-blue-100 text-blue-700 border-blue-200',
  Approved: 'bg-green-100 text-green-700 border-green-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
}

export default function QuotationsPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const submitRfqId = searchParams.get('rfq_id')

  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [compareRfqId, setCompareRfqId] = useState<number | null>(null)
  const [compareData, setCompareData] = useState<Quotation[]>([])
  const [compareLoading, setCompareLoading] = useState(false)
  
  const [form, setForm] = useState({
    rfq_id: '', delivery_days: '', notes: '', items: [] as any[]
  })

  const isVendor = user?.role === 'vendor'
  const isOfficerOrAdmin = ['officer', 'admin'].includes(user?.role || '')
  const isOfficerOrAbove = ['officer', 'manager', 'admin'].includes(user?.role || '')

  const fetchData = async () => {
    try {
      setLoading(true)
      const [qRes, rfqRes] = await Promise.all([
        api.get('/api/quotations'),
        api.get('/api/rfqs'),
      ])
      let vRes = { data: [] }
      if (isOfficerOrAbove) {
        vRes = await api.get('/api/vendors')
      }
      setQuotations(qRes.data)
      setRfqs(rfqRes.data)
      setVendors(vRes.data)

      if (submitRfqId && isVendor) {
        const rfq = rfqRes.data.find((r: RFQ) => r.id.toString() === submitRfqId)
        if (rfq) {
          setForm({
            rfq_id: rfq.id.toString(),
            delivery_days: '',
            notes: '',
            items: rfq.items.map((i: any) => ({ product_name: i.product_name, qty: i.quantity, unit_price: '', total: 0 }))
          })
          setShowForm(true)
        }
      }
    } catch { toast.error('Failed to load quotations') }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [submitRfqId])

  // Handle RFQ Selection change in modal
  const handleRfqSelect = (rfqIdStr: string) => {
    const rfq = rfqs.find(r => r.id.toString() === rfqIdStr)
    setForm(p => ({
      ...p,
      rfq_id: rfqIdStr,
      items: rfq ? rfq.items.map(i => ({ product_name: i.product_name, qty: i.quantity, unit_price: '', total: 0 })) : []
    }))
  }

  const handleItemPriceChange = (index: number, priceStr: string) => {
    const price = parseFloat(priceStr) || 0
    const newItems = [...form.items]
    newItems[index].unit_price = priceStr
    newItems[index].total = newItems[index].qty * price
    setForm({ ...form, items: newItems })
  }

  const subtotal = useMemo(() => form.items.reduce((sum, item) => sum + (item.total || 0), 0), [form.items])
  const gst = subtotal * 0.18
  const grandTotal = subtotal + gst

  const handleSubmit = async () => {
    if (!form.rfq_id || !form.delivery_days) {
      toast.error('Please fill all required fields')
      return
    }
    if (form.items.some(i => !i.unit_price)) {
      toast.error('Please enter unit price for all items')
      return
    }
    
    // The backend uses the authenticated user's vendor ID automatically,
    // so we can pass 0 here without issue.
    const vendor_id = 0

    setSaving(true)
    try {
      await api.post('/api/quotations', {
        rfq_id: parseInt(form.rfq_id),
        vendor_id: vendor_id,
        total_price: grandTotal,
        delivery_days: parseInt(form.delivery_days),
        notes: form.notes,
        items: form.items.map(i => ({ 
          product_name: i.product_name, 
          qty: parseInt(String(i.qty)), 
          unit_price: parseFloat(String(i.unit_price)), 
          total: parseFloat(String(i.total)) 
        })),
      })
      toast.success('Quotation submitted successfully!')
      setShowForm(false)  // auto-close modal
      navigate('/quotations') // remove query param
      fetchData()
    } catch (e: any) { toast.error(e?.response?.data?.detail || 'Submit failed') }
    finally { setSaving(false) }
  }

  const handleReject = async (id: number) => {
    try {
      await api.post(`/api/quotations/${id}/approve`, { status: 'Rejected' })
      toast.success(`Quotation Rejected`)
      fetchData()
      if (compareRfqId) loadCompare(compareRfqId)
    } catch { toast.error('Action failed') }
  }

  const handleApproveAndGeneratePO = async (q: Quotation) => {
    try {
      await api.post(`/api/quotations/${q.id}/approve`, { status: 'Approved' })
      const poRes = await api.post('/api/purchase-orders', { quotation_id: q.id })
      
      const grand_total = Number(q.total_price)
      const subtotal = grand_total / 1.18
      const gst = grand_total - subtotal
      
      // Auto-generate invoice
      await api.post('/api/invoices', {
        po_id: poRes.data.id,
        subtotal: subtotal,
        gst: gst,
        grand_total: grand_total,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] // 30 days due
      })

      toast.success(`Purchase Order & Invoice Generated!`)
      fetchData()
      if (compareRfqId) loadCompare(compareRfqId)
      navigate('/invoices')
    } catch (e: any) { 
      toast.error(e?.response?.data?.detail || 'Failed to generate PO/Invoice') 
    }
  }

  const loadCompare = async (rfqId: number) => {
    setCompareRfqId(rfqId)
    setCompareLoading(true)
    try {
      const res = await api.get(`/api/quotations/${rfqId}/compare`)
      setCompareData(res.data)
    } catch { toast.error('Failed to load comparison') }
    finally { setCompareLoading(false) }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isVendor ? 'My Quotations' : 'Quotations'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isVendor ? 'Submit and track your pricing for RFQs' : 'Review and compare vendor quotations'}
          </p>
        </div>
        {isVendor && (
          <button onClick={() => { setForm({ rfq_id: '', delivery_days: '', notes: '', items: [] }); setShowForm(true) }} className="flex items-center gap-2 btn-primary w-auto px-5 py-2.5">
            <Plus size={16} /> Submit Quotation
          </button>
        )}
      </div>

      {/* Compare Section (Officer+) */}
      {isOfficerOrAbove && (
        <div className="glass-card p-4 mb-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700">Compare Quotations by RFQ</h3>
            {user?.role === 'manager' && (
              <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-full font-semibold">
                👁️ View Only — Approval by Officer
              </span>
            )}
          </div>
          <div className="flex gap-3 flex-wrap">
            {rfqs.map(r => (
              <button key={r.id} onClick={() => loadCompare(r.id)}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-colors ${compareRfqId === r.id ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-gray-700 border-gray-200 hover:border-brand-300 hover:bg-brand-50'}`}>
                {r.title}
              </button>
            ))}
          </div>

          {compareRfqId && (
            <div className="mt-4">
              {compareLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="animate-spin text-brand-500" size={24} /></div>
              ) : compareData.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No quotations submitted yet for this RFQ.</p>
              ) : (
                <div className="overflow-x-auto pb-4">
                  <div className="flex gap-4">
                    {(() => {
                      const lowestPrice = Math.min(...compareData.map(q => q.total_price))
                      const sortedData = [...compareData].sort((a, b) => a.total_price - b.total_price)

                      return sortedData.map(q => {
                        const vendor = vendors.find(v => v.id === q.vendor_id)
                        const isLowest = q.total_price === lowestPrice
                        const rating = (3.5 + ((q.vendor_id * 7) % 15) / 10).toFixed(1)

                        return (
                          <div key={q.id} className={`flex-shrink-0 w-80 bg-white border ${isLowest ? 'border-green-400 shadow-md ring-2 ring-green-100' : 'border-gray-200'} rounded-2xl overflow-hidden flex flex-col`}>
                            {isLowest && (
                              <div className="bg-green-500 text-white text-xs font-bold uppercase tracking-wider text-center py-1.5 flex items-center justify-center gap-1">
                                <DollarSign size={14} /> Lowest Price
                              </div>
                            )}
                            <div className="p-5 border-b border-gray-100 flex-1">
                              <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-gray-900 text-lg">{vendor?.name || `Vendor #${q.vendor_id}`}</h4>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[q.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                                  {q.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 mb-4">
                                <Star size={14} className="text-amber-400 fill-amber-400" />
                                <span className="text-sm font-medium text-gray-700">{rating}</span>
                                <span className="text-xs text-gray-400 ml-1">/ 5.0</span>
                              </div>

                              <div className="space-y-4 text-sm">
                                <div>
                                  <p className="text-xs text-gray-500 uppercase font-semibold">Total Price (incl. Tax)</p>
                                  <p className={`text-2xl font-bold ${isLowest ? 'text-green-600' : 'text-gray-900'}`}>
                                    ₹{Number(q.total_price).toLocaleString()}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock size={16} className="text-gray-400" />
                                  <span className="text-gray-700 font-medium">{q.delivery_days} days delivery</span>
                                </div>
                                <div className="flex items-start gap-2">
                                  <FileText size={16} className="text-gray-400 shrink-0 mt-0.5" />
                                  <span className="text-gray-600">{q.notes || 'No remarks provided by vendor.'}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Actions - Officer/Admin only */}
                            <div className="p-4 bg-gray-50 border-t border-gray-100">
                              {isOfficerOrAdmin && q.status === 'Submitted' ? (
                                <div className="flex gap-2">
                                  <button onClick={() => handleApproveAndGeneratePO(q)} className="flex-1 py-2 px-3 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2">
                                    <CheckCircle2 size={16} /> Approve & PO
                                  </button>
                                  <button onClick={() => handleReject(q.id)} className="p-2 rounded-xl bg-white border border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors" title="Reject">
                                    <XCircle size={18} />
                                  </button>
                                </div>
                              ) : q.status === 'Submitted' && user?.role === 'manager' ? (
                                <div className="text-center py-2 text-xs text-amber-600 font-medium bg-amber-50 rounded-xl border border-amber-100">
                                  Pending Officer Approval
                                </div>
                              ) : (
                                <div className="text-center py-2 text-sm text-gray-500 font-medium">
                                  {q.status}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* All Quotations */}
      <div className="space-y-3">
        {loading ? (
          <div className="glass-card flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : quotations.length === 0 ? (
          <div className="glass-card text-center py-16">
            <FileSpreadsheet size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No quotations yet</p>
          </div>
        ) : quotations.map(q => {
          const vendor = vendors.find(v => v.id === q.vendor_id)
          const rfq = rfqs.find(r => r.id === q.rfq_id)
          return (
            <div key={q.id} className="glass-card p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">{rfq?.title || `RFQ #${q.rfq_id}`}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {isVendor ? `Submitted on ${new Date().toLocaleDateString()}` : `by ${vendor?.name || `Vendor #${q.vendor_id}`}`}
                  </p>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[q.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                  {q.status}
                </span>
              </div>
              <div className="flex items-center gap-5 mt-3 text-sm text-gray-600">
                <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-brand-500" />₹{Number(q.total_price).toLocaleString()}</span>
                <span className="flex items-center gap-1.5"><Clock size={14} className="text-amber-500" />{q.delivery_days} days</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Submit Quotation Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">Submit Quotation</h2>
              <button onClick={() => { setShowForm(false); navigate('/quotations'); }} className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">RFQ *</label>
                  <select className="input-field" value={form.rfq_id} onChange={e => handleRfqSelect(e.target.value)}>
                    <option value="">Select RFQ…</option>
                    {rfqs.filter(r => r.status === 'Open').map(r => <option key={r.id} value={r.id}>{r.title}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Delivery Days *</label>
                  <input type="number" className="input-field" placeholder="e.g. 14" value={form.delivery_days} onChange={e => setForm(p => ({ ...p, delivery_days: e.target.value }))} />
                </div>
              </div>

              {/* Line Items Pricing */}
              {form.rfq_id && (
                <div>
                  <label className="form-label mb-2"><Package size={14} className="inline mr-1" /> Quotation Line Items</label>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600">
                        <tr>
                          <th className="px-4 py-2">Item</th>
                          <th className="px-4 py-2 w-20">Qty</th>
                          <th className="px-4 py-2 w-32">Unit Price (₹)</th>
                          <th className="px-4 py-2 w-24">Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {form.items.map((item, i) => (
                          <tr key={i} className="bg-white">
                            <td className="px-4 py-2 font-medium text-gray-800">{item.product_name}</td>
                            <td className="px-4 py-2 text-gray-600">{item.qty}</td>
                            <td className="px-4 py-2">
                              <input 
                                type="number" 
                                min={0} 
                                className="input-field py-1 px-2 text-sm" 
                                placeholder="0.00" 
                                value={item.unit_price} 
                                onChange={e => handleItemPriceChange(i, e.target.value)} 
                              />
                            </td>
                            <td className="px-4 py-2 font-medium text-gray-900">
                              {item.total > 0 ? item.total.toLocaleString() : '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Totals Summary */}
                  <div className="mt-4 flex flex-col items-end gap-1 text-sm">
                    <div className="flex justify-between w-48 text-gray-600">
                      <span>Subtotal:</span>
                      <span>₹{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between w-48 text-gray-600">
                      <span>GST (18%):</span>
                      <span>₹{gst.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between w-48 text-lg font-bold text-gray-900 pt-2 border-t border-gray-200 mt-1">
                      <span>Grand Total:</span>
                      <span>₹{grandTotal.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Notes / Remarks</label>
                <textarea rows={2} className="input-field resize-none" placeholder="Terms, warranties, lead time conditions…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3 rounded-b-2xl">
              <button onClick={() => { setShowForm(false); navigate('/quotations'); }} className="btn-secondary flex-1 py-2.5">Cancel</button>
              <button onClick={handleSubmit} disabled={saving || !form.rfq_id} className="btn-primary flex-1 py-2.5 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                Submit Quotation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
