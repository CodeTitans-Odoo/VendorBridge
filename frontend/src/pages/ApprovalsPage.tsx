import { useState, useEffect } from 'react'
import { CheckCircle2, XCircle, FileText, FileSpreadsheet, Loader2, Calendar, Package, DollarSign, Clock, ArrowRight } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'

interface RFQItem {
  product_name: string
  quantity: number
  units: string
  category: string
}

interface RFQ {
  id: number
  title: string
  description: string | null
  deadline: string
  status: string
  items: RFQItem[]
  vendor_ids: number[]
}

interface QuotationItem {
  id: number
  product_name: string
  qty: number
  unit_price: number
  total: number
}

interface Quotation {
  id: number
  rfq_id: number
  vendor_id: number
  total_price: number
  delivery_days: number
  notes: string | null
  status: string
  items: QuotationItem[]
}

interface Vendor {
  id: number
  name: string
  email: string
}

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<'rfqs' | 'quotations'>('rfqs')
  const [loading, setLoading] = useState(true)
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [actioningId, setActioningId] = useState<number | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [rfqRes, quoteRes, vendorRes] = await Promise.all([
        api.get('/api/rfqs'),
        api.get('/api/quotations'),
        api.get('/api/vendors')
      ])
      setRfqs(rfqRes.data)
      setQuotations(quoteRes.data)
      setVendors(vendorRes.data)
    } catch {
      toast.error('Failed to load approvals data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleApproveRFQ = async (id: number, status: 'Open' | 'Rejected') => {
    setActioningId(id)
    try {
      await api.post(`/api/rfqs/${id}/approve`, { status })
      toast.success(`RFQ successfully ${status === 'Open' ? 'Approved' : 'Rejected'}`)
      fetchData()
    } catch {
      toast.error('Action failed. Please try again.')
    } finally {
      setActioningId(null)
    }
  }

  const pendingRFQs = rfqs.filter(r => r.status === 'Pending Approval')
  const pendingQuotations = quotations.filter(q => q.status === 'Submitted')

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approvals & Workflow Controls</h1>
        <p className="text-sm text-gray-500 mt-0.5">Review pending procurement requests and monitor Quotations</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab('rfqs')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all relative ${
            activeTab === 'rfqs'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileText size={16} />
          RFQ Approvals
          {pendingRFQs.length > 0 && (
            <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs font-bold">
              {pendingRFQs.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('quotations')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-all relative ${
            activeTab === 'quotations'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-gray-500 hover:text-gray-900'
          }`}
        >
          <FileSpreadsheet size={16} />
          Quotations View (Read-Only)
          {pendingQuotations.length > 0 && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">
              {pendingQuotations.length}
            </span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={32} className="animate-spin text-brand-500" />
        </div>
      ) : activeTab === 'rfqs' ? (
        /* RFQ APPROVALS TAB */
        <div className="space-y-4">
          {pendingRFQs.length === 0 ? (
            <div className="glass-card text-center py-16">
              <CheckCircle2 size={40} className="mx-auto text-green-500 mb-3" />
              <p className="text-gray-700 font-bold text-lg">All Caught Up!</p>
              <p className="text-gray-500 text-sm mt-1">No pending RFQs require your approval at this time.</p>
            </div>
          ) : (
            pendingRFQs.map(rfq => (
              <div key={rfq.id} className="glass-card p-5 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{rfq.title}</h3>
                    {rfq.description && <p className="text-sm text-gray-500 mt-1">{rfq.description}</p>}
                    <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                      <Calendar size={12} /> Deadline: {new Date(rfq.deadline).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveRFQ(rfq.id, 'Open')}
                      disabled={actioningId === rfq.id}
                      className="btn-primary flex items-center gap-1.5 py-2 px-4 text-xs font-bold bg-green-600 hover:bg-green-700 border-green-600 hover:border-green-700"
                    >
                      {actioningId === rfq.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={14} />}
                      Approve RFQ
                    </button>
                    <button
                      onClick={() => handleApproveRFQ(rfq.id, 'Rejected')}
                      disabled={actioningId === rfq.id}
                      className="flex items-center gap-1.5 py-2 px-4 text-xs font-bold bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 rounded-xl transition-all"
                    >
                      {actioningId === rfq.id ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={14} />}
                      Reject
                    </button>
                  </div>
                </div>

                {/* Items & Vendors Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Package size={12} /> Line Items ({rfq.items.length})
                    </p>
                    <ul className="space-y-1.5">
                      {rfq.items.map((item, index) => (
                        <li key={index} className="text-sm text-gray-700 flex justify-between bg-surface-50 p-2 rounded-lg border border-gray-100">
                          <span className="font-medium">{item.product_name}</span>
                          <span className="text-gray-500 text-xs">{item.quantity} {item.units}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Invited Vendors ({rfq.vendor_ids.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {rfq.vendor_ids.map(id => {
                        const vendor = vendors.find(v => v.id === id)
                        return (
                          <span key={id} className="text-xs bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg font-medium">
                            {vendor?.name || `Vendor #${id}`}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        /* QUOTATIONS VIEW TAB */
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 text-sm flex items-start gap-3">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="font-bold">Quotation Approvals — Officer Access Only</p>
              <p className="text-xs mt-0.5 text-amber-700">Approval rights for quotations are assigned strictly to the Procurement Officer. Managers can monitor submitted quotations below in read-only mode.</p>
            </div>
          </div>

          {pendingQuotations.length === 0 ? (
            <div className="glass-card text-center py-16">
              <FileSpreadsheet size={40} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No pending quotations</p>
            </div>
          ) : (
            pendingQuotations.map(q => {
              const rfq = rfqs.find(r => r.id === q.rfq_id)
              const vendor = vendors.find(v => v.id === q.vendor_id)
              return (
                <div key={q.id} className="glass-card p-5 relative">
                  <div className="absolute top-5 right-5 text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full">
                    👁️ View Only
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 text-xs text-brand-600 font-semibold uppercase tracking-wider mb-1">
                      <span>RFQ #{q.rfq_id}</span>
                      <ArrowRight size={10} />
                      <span className="text-gray-700 font-medium normal-case">{rfq?.title || 'Unknown RFQ'}</span>
                    </div>
                    <h3 className="font-bold text-lg text-gray-900">{vendor?.name || `Vendor #${q.vendor_id}`}</h3>
                    {q.notes && <p className="text-sm text-gray-500 mt-1 italic">"{q.notes}"</p>}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Total Quote Price</p>
                      <p className="font-bold text-gray-950 text-lg flex items-center gap-0.5">
                        <DollarSign size={16} className="text-green-600" />
                        ₹{Number(q.total_price).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Estimated Delivery</p>
                      <p className="font-bold text-gray-700 text-lg flex items-center gap-1">
                        <Clock size={16} className="text-amber-500" />
                        {q.delivery_days} days
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase">Items Offered</p>
                      <p className="font-bold text-gray-700 text-lg">
                        {q.items?.length || 0} line item{(q.items?.length || 0) !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
