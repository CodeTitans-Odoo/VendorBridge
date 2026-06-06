import { useState, useEffect } from 'react'
import { Receipt, Loader2, Download, Printer, Mail, X, CheckCircle2 } from 'lucide-react'
import api from '../lib/axios'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import Logo from '../components/Logo'
// @ts-ignore
import html2pdf from 'html2pdf.js'

interface Invoice {
  id: number
  po_id: number
  invoice_number: string
  subtotal: number
  gst: number
  grand_total: number
  status: string
  due_date: string | null
  created_at: string
}

const STATUS_COLORS: Record<string, string> = {
  Unpaid: 'bg-amber-100 text-amber-700 border-amber-200',
  Sent: 'bg-blue-100 text-blue-700 border-blue-200',
  Paid: 'bg-green-100 text-green-700 border-green-200',
}

export default function InvoicesPage() {
  const { user } = useAuth()
  const isVendor = user?.role === 'vendor'
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([])
  const [quotations, setQuotations] = useState<any[]>([])
  const [rfqs, setRfqs] = useState<any[]>([])
  const [vendors, setVendors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const [invRes, poRes, qRes, rfqRes] = await Promise.all([
        api.get('/api/invoices'),
        api.get('/api/purchase-orders'),
        api.get('/api/quotations'),
        api.get('/api/rfqs'),
      ])
      let vRes = { data: [] }
      if (!isVendor) {
        vRes = await api.get('/api/vendors')
      }
      setInvoices(invRes.data)
      setPurchaseOrders(poRes.data)
      setQuotations(qRes.data)
      setRfqs(rfqRes.data)
      setVendors(vRes.data)
    } catch {
      toast.error('Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handlePrint = () => {
    window.print()
  }

  const handleDownloadPDF = () => {
    if (!selectedInvoice) return
    const element = document.getElementById('invoice-content')
    if (!element) return
    
    const opt = {
      margin:       0.5,
      filename:     `Invoice_${selectedInvoice.invoice_number}.pdf`,
      image:        { type: 'jpeg' as const, quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' as const }
    }
    toast.promise(
      html2pdf().set(opt).from(element).save(),
      {
        loading: 'Generating PDF...',
        success: 'PDF downloaded successfully!',
        error: 'Failed to generate PDF'
      }
    )
  }

  const handleEmail = (invoiceNumber: string) => {
    toast.success(`Invoice ${invoiceNumber} sent via email successfully!`)
  }

  const handleMarkAsPaid = async (id: number) => {
    try {
      await api.post(`/api/invoices/${id}/send`, { status: 'Paid' })
      toast.success('Invoice marked as paid!')
      fetchData()
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice({ ...selectedInvoice, status: 'Paid' })
      }
    } catch {
      toast.error('Failed to update invoice')
    }
  }

  const getFullDetails = (inv: Invoice) => {
    const po = purchaseOrders.find(p => p.id === inv.po_id)
    const quote = po ? quotations.find(q => q.id === po.quotation_id) : null
    const rfq = quote ? rfqs.find(r => r.id === quote.rfq_id) : null
    const vendor = quote ? vendors.find(v => v.id === quote.vendor_id) : null
    return { po, quote, rfq, vendor }
  }

  return (
    <div className="animate-fade-in">
      {/* Hide the main UI during print if modal is open */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .print-container, .print-container * { visibility: visible; }
          .print-container { 
            position: absolute; 
            left: 0; 
            top: 0; 
            width: 100%; 
            padding: 0;
            margin: 0;
            background: white;
            box-shadow: none;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 no-print">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isVendor ? 'Track your submitted invoices and payments' : 'Review and manage vendor invoices'}
          </p>
        </div>
      </div>

      <div className="space-y-3 no-print">
        {loading ? (
          <div className="glass-card flex items-center justify-center py-16">
            <Loader2 size={28} className="animate-spin text-brand-500" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="glass-card text-center py-16">
            <Receipt size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">No invoices found</p>
          </div>
        ) : (
          invoices.map(inv => {
            const { po, vendor } = getFullDetails(inv)
            return (
              <div key={inv.id} className="glass-card p-5 hover:border-brand-300 transition-colors cursor-pointer" onClick={() => setSelectedInvoice(inv)}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-lg text-gray-900">{inv.invoice_number}</p>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS[inv.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                        {inv.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      For PO <span className="font-medium text-gray-700">{po?.po_number || `#${inv.po_id}`}</span> 
                      {vendor && ` • ${vendor.name}`}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-gray-500 mb-0.5">Grand Total</p>
                    <p className="text-2xl font-bold text-gray-900">₹{Number(inv.grand_total).toLocaleString()}</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-gray-100">
                  <button onClick={(e) => { e.stopPropagation(); setSelectedInvoice(inv); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-900 text-white hover:bg-gray-800 transition-colors">
                    View Full Invoice
                  </button>
                  {inv.status !== 'Paid' && !isVendor && (
                    <button onClick={(e) => { e.stopPropagation(); handleMarkAsPaid(inv.id); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition-colors">
                      <CheckCircle2 size={14} /> Mark as Paid
                    </button>
                  )}
                  {['officer', 'manager', 'admin'].includes(user?.role || '') && (
                    <button onClick={(e) => { e.stopPropagation(); handleEmail(inv.invoice_number); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors ml-auto">
                      <Mail size={14} /> Send via Email
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Full Invoice Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/60 backdrop-blur-sm overflow-y-auto pt-10 pb-20 px-4">
          <div className="absolute inset-0 no-print" onClick={() => setSelectedInvoice(null)}></div>
          <div className="relative bg-white w-full max-w-4xl shadow-2xl rounded-2xl print-container">
            
            {/* Modal Header Actions (Not printed) */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50 rounded-t-2xl no-print">
              <div className="flex gap-2">
                <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors shadow-sm">
                  <Printer size={16} /> Print
                </button>
                <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-brand-600 transition-colors shadow-sm">
                  <Download size={16} /> Save PDF
                </button>
              </div>
              <button onClick={() => setSelectedInvoice(null)} className="p-2 rounded-xl text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Printable Area */}
            <div id="invoice-content" className="p-10 lg:p-16 bg-white">
              {(() => {
                const { po, quote, rfq, vendor } = getFullDetails(selectedInvoice)
                return (
                  <>
                    <div className="flex justify-between items-start mb-12">
                      <div>
                        <div className="flex items-center gap-2 mb-4">
                          <Logo className="w-10 h-10" />
                          <span className="text-2xl font-bold tracking-tight text-gray-900">VendorBridge</span>
                        </div>
                        <h2 className="text-4xl font-black text-gray-200 uppercase tracking-widest mb-1">INVOICE</h2>
                        <p className="text-lg font-bold text-gray-900">{selectedInvoice.invoice_number}</p>
                        <span className={`inline-flex items-center px-2 py-0.5 mt-2 rounded text-xs font-bold border uppercase tracking-wider ${STATUS_COLORS[selectedInvoice.status] || 'bg-gray-100 text-gray-500 border-gray-200'}`}>
                          {selectedInvoice.status}
                        </span>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        <p className="font-semibold text-gray-900 text-base mb-1">TechNova Solutions Ltd.</p>
                        <p>123 Innovation Drive</p>
                        <p>Silicon Valley, CA 94025</p>
                        <p>support@vendorbridge.com</p>
                        <p className="mt-4"><strong>Date:</strong> {new Date(selectedInvoice.created_at || Date.now()).toLocaleDateString()}</p>
                        <p><strong>Due Date:</strong> {selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : 'Upon Receipt'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-10 mb-12">
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-2">Billed To</p>
                        <p className="font-bold text-gray-900 text-lg mb-1">{vendor?.name || 'Authorized Vendor'}</p>
                        <p className="text-sm text-gray-600">{vendor?.email}</p>
                        <p className="text-sm text-gray-600">{vendor?.phone_number}</p>
                        {vendor?.gst_number && <p className="text-sm text-gray-600 mt-2"><strong>GSTIN:</strong> {vendor.gst_number}</p>}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 border-b border-gray-100 pb-2">Reference Details</p>
                        <table className="text-sm text-gray-600 w-full">
                          <tbody>
                            <tr><td className="py-1"><strong>PO Number:</strong></td><td className="text-right font-medium text-gray-900">{po?.po_number || 'N/A'}</td></tr>
                            <tr><td className="py-1"><strong>RFQ Title:</strong></td><td className="text-right font-medium text-gray-900">{rfq?.title || 'N/A'}</td></tr>
                            <tr><td className="py-1"><strong>Delivery terms:</strong></td><td className="text-right font-medium text-gray-900">{quote?.delivery_days ? `${quote.delivery_days} Days` : 'N/A'}</td></tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="mb-12">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b-2 border-gray-900">
                            <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest">Description</th>
                            <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest text-right">Qty</th>
                            <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest text-right">Unit Price</th>
                            <th className="py-3 text-xs font-bold text-gray-900 uppercase tracking-widest text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 text-sm">
                          {quote?.items?.map((item: any) => (
                            <tr key={item.id}>
                              <td className="py-4 font-medium text-gray-900">{item.product_name}</td>
                              <td className="py-4 text-gray-600 text-right">{item.qty}</td>
                              <td className="py-4 text-gray-600 text-right">₹{Number(item.unit_price).toLocaleString()}</td>
                              <td className="py-4 font-medium text-gray-900 text-right">₹{Number(item.total).toLocaleString()}</td>
                            </tr>
                          ))}
                          {!quote?.items && (
                            <tr>
                              <td className="py-4 text-gray-500 italic" colSpan={4}>Itemized details unavailable for legacy invoice.</td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <div className="w-72">
                        <div className="flex justify-between py-2 text-sm text-gray-600">
                          <span>Subtotal:</span>
                          <span className="font-medium text-gray-900">₹{Number(selectedInvoice.subtotal).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-2 text-sm text-gray-600 border-b border-gray-200">
                          <span>GST (18%):</span>
                          <span className="font-medium text-gray-900">₹{Number(selectedInvoice.gst).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between py-4">
                          <span className="text-lg font-bold text-gray-900">Grand Total:</span>
                          <span className="text-2xl font-black text-brand-600">₹{Number(selectedInvoice.grand_total).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-16 pt-8 border-t border-gray-100 text-sm text-gray-500">
                      <p className="font-bold text-gray-900 mb-1">Terms and Conditions</p>
                      <p className="mb-4">Please make payment within the due date to avoid late fees. All prices are inclusive of taxes where applicable as per government regulations.</p>
                      <p className="italic">Thank you for doing business with VendorBridge!</p>
                    </div>
                  </>
                )
              })()}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
