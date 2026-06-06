import { useState, useEffect } from 'react'
import { ShoppingCart, Loader2, Download, Printer, X } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import Logo from '../components/Logo'
// @ts-ignore
import html2pdf from 'html2pdf.js'

interface PO {
  id: number
  po_number: string
  quotation_id: number
  status: string
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  Pending: 'bg-amber-100 text-amber-700 border-amber-200',
  Approved: 'bg-green-100 text-green-700 border-green-200',
  Rejected: 'bg-red-100 text-red-700 border-red-200',
}

export default function PurchaseOrdersPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isVendor = user?.role === 'vendor'
  const isOfficer = ['officer', 'admin'].includes(user?.role || '')

  const [pos, setPos] = useState<PO[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [rfqs, setRfqs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState<number | null>(null)
  const [selectedPO, setSelectedPO] = useState<PO | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [poRes, qRes, rfqRes] = await Promise.all([
        api.get('/api/purchase-orders'),
        api.get('/api/quotations'),
        api.get('/api/rfqs'),
      ])
      let vRes = { data: [] }
      if (!isVendor) vRes = await api.get('/api/vendors')
      setPos(poRes.data)
      setQuotations(qRes.data)
      setRfqs(rfqRes.data)
      setVendors(vRes.data)
    } catch {
      toast.error('Failed to load purchase orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const getDetails = (po: PO) => {
    const quote = quotations.find(q => q.id === po.quotation_id)
    const rfq = quote ? rfqs.find(r => r.id === quote.rfq_id) : null
    let vendor = quote ? vendors.find(v => v.id === quote.vendor_id) : null
    if (isVendor && !vendor && user) {
      vendor = {
        id: 0,
        name: user.company_name || `${user.first_name} ${user.last_name}`,
        email: user.email,
        phone_number: user.phone || '',
        gst_number: ''
      }
    }
    return { quote, rfq, vendor }
  }

  const handlePrint = (po: PO) => {
    setSelectedPO(po)
    setTimeout(() => {
      window.print()
    }, 150)
  }

  const handleDownloadPDF = (po: PO) => {
    setSelectedPO(po)
    setTimeout(() => {
      const element = document.getElementById(`po-content-${po.id}`)
      if (!element) {
        toast.error('Cannot find PO content. Please try again.')
        return
      }
      const opt = {
        margin: 0.5,
        filename: `PurchaseOrder_${po.po_number}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' as const }
      }
      toast.promise(
        html2pdf().set(opt).from(element).save(),
        { loading: 'Generating PDF...', success: 'PDF downloaded!', error: 'Failed to generate PDF' }
      )
    }, 250)
  }

  const handleGenerateInvoice = async (po: PO) => {
    setGenerating(po.id)
    try {
      const qRes = await api.get(`/api/quotations/detail/${po.quotation_id}`)
      const quotation = qRes.data
      const subtotal = quotation.total_price / 1.18
      const gst = quotation.total_price - subtotal
      await api.post('/api/invoices', {
        po_id: po.id,
        subtotal: Number(subtotal.toFixed(2)),
        gst: Number(gst.toFixed(2)),
        grand_total: quotation.total_price,
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      })
      toast.success('Invoice generated successfully!')
      navigate('/invoices')
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || 'Failed to generate invoice')
    } finally {
      setGenerating(null)
    }
  }

  return (
    <div className="animate-fade-in">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .po-print-area, .po-print-area * { visibility: visible; }
          .po-print-area { position: absolute; left: 0; top: 0; width: 100%; background: white; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isVendor ? 'View purchase orders assigned to you' : 'Manage system purchase orders'}
          </p>
        </div>
      </div>

      <div className="space-y-3 no-print">
        {loading ? (
          <div className="glass-card flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : pos.length === 0 ? (
          <div className="glass-card text-center py-16">
            <ShoppingCart size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No purchase orders yet</p>
          </div>
        ) : (
          pos.map(po => {
            const { quote, rfq, vendor } = getDetails(po)
            return (
              <div key={po.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="font-bold text-lg text-gray-900">{po.po_number}</p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {rfq?.title || `For Quotation #${po.quotation_id}`}
                      {vendor && ` · ${vendor.name}`}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">Generated on {new Date(po.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[po.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                    {po.status}
                  </span>
                </div>

                {quote && (
                  <div className="grid grid-cols-3 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Total Value</p>
                      <p className="font-bold text-gray-900">₹{Number(quote.total_price).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Delivery</p>
                      <p className="font-medium text-gray-700">{quote.delivery_days} days</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Items</p>
                      <p className="font-medium text-gray-700">{quote.items?.length || 0} line item{quote.items?.length !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                  <button onClick={() => setSelectedPO(po)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors">
                    View PO
                  </button>
                  <button onClick={() => handlePrint(po)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    <Printer size={14} /> Print
                  </button>
                  <button onClick={() => handleDownloadPDF(po)} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                    <Download size={14} /> Download PDF
                  </button>
                  {isOfficer && po.status === 'Pending' && (
                    <button
                      onClick={() => handleGenerateInvoice(po)}
                      disabled={generating === po.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-brand-50 text-brand-600 border border-brand-100 hover:bg-brand-100 transition-colors ml-auto"
                    >
                      {generating === po.id ? <Loader2 size={14} className="animate-spin" /> : null}
                      Generate Invoice
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* PO Detail Modal */}
      {selectedPO && (() => {
        const { quote, rfq, vendor } = getDetails(selectedPO)
        return (
          <div className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm overflow-y-auto pt-10 pb-20 px-4">
            <div className="absolute inset-0 no-print" onClick={() => setSelectedPO(null)} />
            <div className="relative bg-white w-full max-w-3xl shadow-2xl rounded-2xl">
              {/* Actions bar */}
              <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl no-print">
                <div className="flex gap-2">
                  <button onClick={() => handlePrint(selectedPO)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                    <Printer size={16} /> Print
                  </button>
                  <button onClick={() => handleDownloadPDF(selectedPO)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors shadow-sm">
                    <Download size={16} /> Download PDF
                  </button>
                </div>
                <button onClick={() => setSelectedPO(null)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 transition-colors">
                  <X size={20} />
                </button>
              </div>

              {/* Printable PO Content */}
              <div id={`po-content-${selectedPO.id}`} className="p-10 bg-white po-print-area">
                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <Logo className="w-10 h-10" />
                      <span className="text-2xl font-bold tracking-tight text-gray-900">VendorBridge</span>
                    </div>
                    <h2 className="text-4xl font-black text-gray-200 uppercase tracking-widest mb-1">PURCHASE ORDER</h2>
                    <p className="text-lg font-bold text-gray-900">{selectedPO.po_number}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 mt-2 rounded text-xs font-bold border uppercase tracking-wider ${STATUS_COLORS[selectedPO.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                      {selectedPO.status}
                    </span>
                  </div>
                  <div className="text-right text-sm text-gray-600">
                    <p className="font-semibold text-gray-900 text-base mb-1">TechNova Solutions Ltd.</p>
                    <p>123 Innovation Drive</p>
                    <p>Silicon Valley, CA 94025</p>
                    <p className="mt-4"><strong>PO Date:</strong> {new Date(selectedPO.created_at).toLocaleDateString()}</p>
                    <p><strong>Delivery in:</strong> {quote?.delivery_days || 'N/A'} days</p>
                  </div>
                </div>

                {/* Vendor Info */}
                <div className="grid grid-cols-2 gap-10 mb-10">
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-2">Vendor / Supplier</p>
                    <p className="font-bold text-gray-900 text-lg mb-1">{vendor?.name || 'Authorized Vendor'}</p>
                    <p className="text-sm text-gray-600">{vendor?.email}</p>
                    <p className="text-sm text-gray-600">{vendor?.phone_number}</p>
                    {vendor?.gst_number && <p className="text-sm text-gray-600 mt-2"><strong>GSTIN:</strong> {vendor.gst_number}</p>}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-2">Reference</p>
                    <table className="text-sm text-gray-600 w-full">
                      <tbody>
                        <tr><td className="py-1"><strong>RFQ:</strong></td><td className="text-right font-medium text-gray-900">{rfq?.title || 'N/A'}</td></tr>
                        <tr><td className="py-1"><strong>Quotation Ref:</strong></td><td className="text-right font-medium text-gray-900">QT-{selectedPO.quotation_id}</td></tr>
                        <tr><td className="py-1"><strong>Category:</strong></td><td className="text-right font-medium text-gray-900">{vendor?.category || 'N/A'}</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Items table */}
                <table className="w-full text-left mb-10">
                  <thead>
                    <tr className="border-b-2 border-gray-900">
                      <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest">Item</th>
                      <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest text-right">Qty</th>
                      <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest text-right">Unit Price</th>
                      <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {quote?.items?.map((item: any) => (
                      <tr key={item.id}>
                        <td className="py-3.5 font-medium text-gray-900">{item.product_name}</td>
                        <td className="py-3.5 text-gray-600 text-right">{item.qty}</td>
                        <td className="py-3.5 text-gray-600 text-right">₹{Number(item.unit_price).toLocaleString()}</td>
                        <td className="py-3.5 font-medium text-gray-900 text-right">₹{Number(item.total).toLocaleString()}</td>
                      </tr>
                    ))}
                    {!quote?.items && (
                      <tr><td className="py-3 text-gray-500 italic" colSpan={4}>No line items available.</td></tr>
                    )}
                  </tbody>
                </table>

                {/* Total */}
                <div className="flex justify-end">
                  <div className="w-72">
                    <div className="flex justify-between py-2 text-sm text-gray-600">
                      <span>Subtotal:</span>
                      <span className="font-medium">₹{quote ? (Number(quote.total_price) / 1.18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}</span>
                    </div>
                    <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-200">
                      <span>GST (18%):</span>
                      <span className="font-medium">₹{quote ? (Number(quote.total_price) - Number(quote.total_price) / 1.18).toLocaleString(undefined, { maximumFractionDigits: 2 }) : '0'}</span>
                    </div>
                    <div className="flex justify-between py-4">
                      <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                      <span className="text-2xl font-black text-brand-600">₹{quote ? Number(quote.total_price).toLocaleString() : '0'}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-gray-100 text-sm text-gray-500">
                  <p className="font-bold text-gray-900 mb-1">Terms & Conditions</p>
                  <p>Delivery as per agreed timeline. Payment is due within 30 days of receipt. All items subject to quality inspection.</p>
                  <p className="mt-3 italic">Issued by VendorBridge Procurement System</p>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
