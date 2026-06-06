import { useState, useEffect } from 'react'
import { Loader2, GitMerge, FileText, FileSpreadsheet, ShoppingCart } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'

interface RFQ {
  id: number
  title: string
  status: string
  deadline: string
}

interface Quotation {
  id: number
  rfq_id: number
  total_price: number
  status: string
  vendor_id: number
}

interface PO {
  id: number
  po_number: string
  status: string
  created_at: string
}

export default function WorkflowsPage() {
  const [loading, setLoading] = useState(true)
  const [rfqs, setRfqs] = useState<RFQ[]>([])
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [pos, setPos] = useState<PO[]>([])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [rRes, qRes, pRes] = await Promise.all([
        api.get('/api/rfqs'),
        api.get('/api/quotations'),
        api.get('/api/purchase-orders')
      ])
      setRfqs(rRes.data)
      setQuotations(qRes.data)
      setPos(pRes.data)
    } catch {
      toast.error('Failed to load workflow data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const rfqApprovals = rfqs.filter(r => r.status === 'Pending Approval')
  const activeSourcing = rfqs.filter(r => r.status === 'Open')
  const quotationApprovals = quotations.filter(q => q.status === 'Submitted')
  const activePos = pos.filter(p => p.status === 'Approved' || p.status === 'Pending')

  return (
    <div className="animate-fade-in flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement Workflows</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Monitor and manage the end-to-end procurement pipeline
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 size={32} className="animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="flex-1 overflow-x-auto pb-4">
          <div className="flex gap-6 h-full min-w-max">
            
            {/* Column 1: RFQ Approvals */}
            <div className="w-80 flex flex-col bg-surface-50 rounded-2xl border border-gray-200 overflow-hidden shrink-0 h-full">
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileText size={16} className="text-amber-500" /> 
                  RFQ Approvals
                </h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{rfqApprovals.length}</span>
              </div>
              <div className="p-3 overflow-y-auto flex-1 space-y-3">
                {rfqApprovals.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-4">No pending RFQs</p>
                ) : (
                  rfqApprovals.map(r => (
                    <div key={r.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                      <p className="font-semibold text-sm text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-500 mt-1">Deadline: {new Date(r.deadline).toLocaleDateString()}</p>
                      <div className="mt-2 pt-2 border-t border-gray-50 text-xs font-medium text-amber-600">Waiting for Manager</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 2: Active Sourcing */}
            <div className="w-80 flex flex-col bg-surface-50 rounded-2xl border border-gray-200 overflow-hidden shrink-0 h-full">
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <GitMerge size={16} className="text-blue-500" /> 
                  Active Sourcing
                </h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{activeSourcing.length}</span>
              </div>
              <div className="p-3 overflow-y-auto flex-1 space-y-3">
                {activeSourcing.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-4">No open RFQs</p>
                ) : (
                  activeSourcing.map(r => (
                    <div key={r.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-blue-400">
                      <p className="font-semibold text-sm text-gray-900">{r.title}</p>
                      <p className="text-xs text-gray-500 mt-1">Deadline: {new Date(r.deadline).toLocaleDateString()}</p>
                      <div className="mt-2 pt-2 border-t border-gray-50 text-xs font-medium text-blue-600">Collecting Quotes</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Column 3: Quotation Approvals */}
            <div className="w-80 flex flex-col bg-surface-50 rounded-2xl border border-gray-200 overflow-hidden shrink-0 h-full">
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileSpreadsheet size={16} className="text-purple-500" /> 
                  Quotation Approvals
                </h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{quotationApprovals.length}</span>
              </div>
              <div className="p-3 overflow-y-auto flex-1 space-y-3">
                {quotationApprovals.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-4">No pending quotations</p>
                ) : (
                  quotationApprovals.map(q => {
                    const parentRfq = rfqs.find(r => r.id === q.rfq_id)
                    return (
                      <div key={q.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-purple-400">
                        <p className="font-semibold text-sm text-gray-900">{parentRfq?.title || `RFQ #${q.rfq_id}`}</p>
                        <p className="text-xs text-gray-500 mt-1">Amount: ₹{Number(q.total_price).toLocaleString()}</p>
                        <div className="mt-2 pt-2 border-t border-gray-50 text-xs font-medium text-purple-600">Review Required</div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Column 4: Active POs */}
            <div className="w-80 flex flex-col bg-surface-50 rounded-2xl border border-gray-200 overflow-hidden shrink-0 h-full">
              <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between sticky top-0">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ShoppingCart size={16} className="text-green-500" /> 
                  Active POs
                </h3>
                <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs font-bold">{activePos.length}</span>
              </div>
              <div className="p-3 overflow-y-auto flex-1 space-y-3">
                {activePos.length === 0 ? (
                  <p className="text-xs text-center text-gray-400 py-4">No active purchase orders</p>
                ) : (
                  activePos.map(p => (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm border-l-4 border-l-green-400">
                      <p className="font-semibold text-sm text-gray-900">{p.po_number}</p>
                      <p className="text-xs text-gray-500 mt-1">Generated: {new Date(p.created_at).toLocaleDateString()}</p>
                      <div className="mt-2 pt-2 border-t border-gray-50 text-xs font-medium text-green-600">Waiting for Invoice</div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}
