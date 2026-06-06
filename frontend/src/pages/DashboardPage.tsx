import { useAuth } from '../contexts/AuthContext'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import {
  LogOut,
  LayoutDashboard,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  Receipt,
  Store,
  Menu,
  X,
  CheckSquare,
  GitMerge,
  BarChart3,
} from 'lucide-react'
import { useState, useEffect } from 'react'
import Logo from '../components/Logo'
import api from '../lib/axios'
import VendorsPage from './VendorsPage'
import RFQsPage from './RFQsPage'
import QuotationsPage from './QuotationsPage'
import PurchaseOrdersPage from './PurchaseOrdersPage'
import InvoicesPage from './InvoicesPage'
import WorkflowsPage from './WorkflowsPage'
import AnalyticsPage from './AnalyticsPage'
import ApprovalsPage from './ApprovalsPage'

interface DashboardPageProps {
  page?: string
}

export default function DashboardPage({ page }: DashboardPageProps) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, roles: ['officer', 'vendor', 'manager', 'admin'] },
    // Admin only
    { name: 'Vendors', path: '/vendors', icon: Store, roles: ['admin'] },
    { name: 'Reports & Analytics', path: '/analytics', icon: BarChart3, roles: ['admin'] },
    // Manager only
    { name: 'Vendors', path: '/vendors', icon: Store, roles: ['manager'] },
    { name: 'Workflows', path: '/workflows', icon: GitMerge, roles: ['manager'] },
    { name: 'Approvals', path: '/approvals', icon: CheckSquare, roles: ['manager'] },
    { name: "RFQ's", path: '/rfqs', icon: FileText, roles: ['manager'] },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, roles: ['manager'] },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, roles: ['manager'] },
    { name: 'Invoices', path: '/invoices', icon: Receipt, roles: ['manager'] },
    // Officer
    { name: 'Vendors', path: '/vendors', icon: Store, roles: ['officer'] },
    { name: "RFQ's", path: '/rfqs', icon: FileText, roles: ['officer'] },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, roles: ['officer'] },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, roles: ['officer'] },
    { name: 'Invoices', path: '/invoices', icon: Receipt, roles: ['officer'] },
    // Vendor
    { name: "RFQ's", path: '/rfqs', icon: FileText, roles: ['vendor'] },
    { name: 'My Quotations', path: '/quotations', icon: FileSpreadsheet, roles: ['vendor'] },
    { name: 'Purchase Orders', path: '/purchase-orders', icon: ShoppingCart, roles: ['vendor'] },
    { name: 'Invoices', path: '/invoices', icon: Receipt, roles: ['vendor'] },
  ]

  const allowedLinks = navLinks.filter(link => user && link.roles.includes(user.role))

  // Render correct page content based on `page` prop
  const renderContent = () => {
    switch (page) {
      case 'vendors':         return <VendorsPage />
      case 'rfqs':            return <RFQsPage />
      case 'quotations':      return <QuotationsPage />
      case 'workflows':       return <WorkflowsPage />
      case 'purchase-orders': return <PurchaseOrdersPage />
      case 'invoices':        return <InvoicesPage />
      case 'analytics':       return <AnalyticsPage />
      case 'approvals':       return <ApprovalsPage />
      default:                return <DashboardHome user={user} handleLogout={handleLogout} />
    }
  }

  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 shadow-sm transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:block
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col p-4">
          {/* Logo */}
          <div className="flex items-center justify-between mb-8 px-2">
            <div className="flex items-center gap-3">
              <Logo className="w-8 h-8" />
              <span className="text-lg font-bold text-gray-900 tracking-tight">VendorBridge</span>
            </div>
            <button
              className="lg:hidden text-gray-500 hover:text-gray-900"
              onClick={() => setMobileMenuOpen(false)}
            >
              <X size={20} />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-0.5">
            {allowedLinks.map((link) => {
              const Icon = link.icon
              const isActive = location.pathname === link.path || (link.path !== '/dashboard' && location.pathname.startsWith(link.path))
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150
                    ${isActive
                      ? 'bg-brand-50 text-brand-700 border border-brand-100 shadow-sm'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                  `}
                >
                  <Icon size={18} className={isActive ? 'text-brand-600' : 'text-gray-400'} />
                  {link.name}
                </Link>
              )
            })}
          </nav>

          {/* User Profile */}
          <div className="mt-auto pt-4 border-t border-gray-100">
            <div className="flex items-center gap-3 px-2 py-3">
              <div className="w-9 h-9 rounded-full bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
                {user?.first_name.charAt(0)}{user?.last_name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user?.first_name} {user?.last_name}</p>
                <p className="text-xs text-brand-600 font-medium capitalize">{user?.role}</p>
              </div>
              <button onClick={handleLogout} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors" title="Sign out">
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile topbar */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 z-10 shadow-sm">
          <button
            className="p-2 -ml-2 text-gray-500 hover:text-gray-900 rounded-xl hover:bg-gray-100 transition-colors"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={22} />
          </button>
          <Logo className="w-8 h-8" />
          <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors rounded-xl hover:bg-red-50">
            <LogOut size={18} />
          </button>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-auto p-4 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  )
}

// ── Dashboard Home (default content) ─────────────────────────────────────────
function DashboardHome({ user }: { user: any; handleLogout?: () => void }) {
  const isVendor = user?.role === 'vendor'
  const [data, setData] = useState({
    rfqs: 0,
    approvals: 0,
    spend: 0,
    vendors: 0,
    activeInvites: 0,
    quotes: 0,
    pos: 0,
    value: 0
  })
  const [recentPos, setRecentPos] = useState<any[]>([])
  const [recentInvoices, setRecentInvoices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [rfqRes, quoteRes, poRes, invRes, vendorRes] = await Promise.all([
          api.get('/api/rfqs'),
          api.get('/api/quotations'),
          api.get('/api/purchase-orders'),
          api.get('/api/invoices'),
          isVendor ? Promise.resolve({ data: [] }) : api.get('/api/vendors')
        ])

        const rfqs = rfqRes.data
        const quotes = quoteRes.data
        const pos = poRes.data
        const invoices = invRes.data

        setRecentPos(pos.slice(0, 5))
        setRecentInvoices(invoices.slice(0, 5))

        if (isVendor) {
          const activeRfqs = rfqs.filter((r: any) => r.status === 'Open').length
          const submitted = quotes.filter((q: any) => q.status === 'Submitted').length
          const approvedPos = pos.filter((p: any) => p.status === 'Approved').length
          
          // Safely calculate total value
          const totalVal = invoices.reduce((sum: number, inv: any) => {
            const grandTotal = Number(inv.grand_total);
            return sum + (isNaN(grandTotal) ? 0 : grandTotal);
          }, 0);

          setData({
            ...data,
            activeInvites: activeRfqs,
            quotes: submitted,
            pos: approvedPos,
            value: totalVal
          })
        } else {
          const activeRfqs = rfqs.filter((r: any) => r.status === 'Open').length
          const pendingApprovals = quotes.filter((q: any) => q.status === 'Submitted').length
          
          // Safely calculate total spend from invoices
          const mtdSpend = invoices.reduce((sum: number, inv: any) => {
            const grandTotal = Number(inv.grand_total);
            return sum + (isNaN(grandTotal) ? 0 : grandTotal);
          }, 0);

          setData({
            ...data,
            rfqs: activeRfqs,
            approvals: pendingApprovals,
            spend: mtdSpend,
            vendors: vendorRes.data.length
          })
        }
      } catch (err) {
        console.error('Failed to load dashboard data', err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardData()
  }, [isVendor])

  const stats = isVendor ? [
    { label: 'Active Invitations', value: loading ? '—' : data.activeInvites, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' },
    { label: 'Submitted Quotes', value: loading ? '—' : data.quotes, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100' },
    { label: 'Approved POs', value: loading ? '—' : data.pos, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100' },
    { label: 'Total Value', value: loading ? '—' : `₹${data.value.toLocaleString()}`, color: 'text-gray-900', bg: 'bg-gray-50', border: 'border-gray-200' },
  ] : [
    { label: 'Active RFQs', value: loading ? '—' : data.rfqs, color: 'text-brand-600', bg: 'bg-brand-50', border: 'border-brand-100' },
    { label: 'Pending Approvals', value: loading ? '—' : data.approvals, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    { label: 'Total Spend', value: loading ? '—' : `₹${data.spend.toLocaleString()}`, color: 'text-gray-900', bg: 'bg-gray-50', border: 'border-gray-200' },
    { label: 'Active Vendors', value: loading ? '—' : data.vendors, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  ]

  const getQuickLinks = () => {
    if (user?.role === 'vendor') {
      return [
        { label: 'View RFQs', path: '/rfqs', color: 'bg-brand-50 text-brand-700 hover:bg-brand-100 border-brand-100' },
        { label: 'My Quotations', path: '/quotations', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100' },
        { label: 'Purchase Orders', path: '/purchase-orders', color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100' },
      ]
    }
    
    const links = [
      { label: 'Manage Vendors', path: '/vendors', color: 'bg-blue-50 text-blue-700 hover:bg-blue-100 border-blue-100' },
    ]
    
    if (['officer', 'admin'].includes(user?.role || '')) {
      links.push({ label: 'Create RFQ', path: '/rfqs', color: 'bg-brand-50 text-brand-700 hover:bg-brand-100 border-brand-100' })
    }
    
    links.push({ label: 'Compare Quotations', path: '/quotations', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100 border-purple-100' })
    links.push({ label: 'Purchase Orders', path: '/purchase-orders', color: 'bg-green-50 text-green-700 hover:bg-green-100 border-green-100' })
    
    return links
  }

  const quickLinks = getQuickLinks()

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-brand-600 to-brand-500 text-white shadow-lg">
        <h1 className="text-2xl font-bold mb-1">Good day, {user?.first_name}! 👋</h1>
        <p className="text-brand-100 text-sm">Welcome to VendorBridge — your procurement command centre.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, i) => (
          <div key={i} className={`p-5 rounded-2xl border ${stat.bg} ${stat.border}`}>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{stat.label}</p>
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Quick Actions */}
        <div className="glass-card p-6 lg:col-span-1">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            {quickLinks.map(l => (
              <Link key={l.path} to={l.path}
                className={`px-4 py-3 rounded-xl text-sm font-medium border transition-colors text-center ${l.color}`}>
                {l.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Recent Lists (Officer View) */}
        {!isVendor && (
          <div className="lg:col-span-2 space-y-6">
            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Recent Purchase Orders</h2>
              {recentPos.length === 0 ? (
                <p className="text-sm text-gray-400">No recent purchase orders.</p>
              ) : (
                <div className="space-y-3">
                  {recentPos.map(po => (
                    <div key={po.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                      <div>
                        <p className="font-semibold text-sm">{po.po_number}</p>
                        <p className="text-xs text-gray-500">{new Date(po.created_at).toLocaleDateString()}</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-gray-100 text-gray-600">{po.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass-card p-6">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Recent Invoices</h2>
              {recentInvoices.length === 0 ? (
                <p className="text-sm text-gray-400">No recent invoices.</p>
              ) : (
                <div className="space-y-3">
                  {recentInvoices.map(inv => (
                    <div key={inv.id} className="flex justify-between items-center p-3 rounded-lg border border-gray-100 hover:bg-gray-50">
                      <div>
                        <p className="font-semibold text-sm">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">₹{Number(inv.grand_total).toLocaleString()}</p>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600">{inv.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
