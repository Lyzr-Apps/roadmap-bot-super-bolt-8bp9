'use client'

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  BarChart3,
  ClipboardList,
  Settings,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  Send,
  ChevronDown,
  ChevronRight,
  Search,
  Menu,
  X,
  ArrowLeft,
  FileText,
  ShieldAlert,
  Users,
  CalendarDays,
  Signal,
  Info,
  ChevronUp,
  LayoutGrid,
  MessageSquare,
} from 'lucide-react'

// ============================================================
// TYPES
// ============================================================

interface OverallSummary {
  completion_percentage: number
  status: string
  summary_text: string
}

interface Feature {
  name: string
  status: string
  progress: number
  last_updated: string
  changes: string
  details: string
}

interface TimelineChange {
  feature: string
  original_date: string
  new_date: string
  reason: string
  impact: string
  severity: string
}

interface Dependency {
  from_feature: string
  to_feature: string
  status: string
  is_blocker: boolean
}

interface RiskIndicator {
  title: string
  severity: string
  description: string
  mitigation: string
}

interface ActionItem {
  task: string
  assignee: string
  priority: string
  due_date: string
}

interface RoadmapUpdate {
  update_id: string
  generated_at: string
  project_name: string
  overall_summary: OverallSummary
  features: Feature[]
  timeline_changes: TimelineChange[]
  dependencies: Dependency[]
  risk_indicators: RiskIndicator[]
  action_items: ActionItem[]
  delivery_status?: string
}

interface MessageSent {
  channel: string
  message_type: string
  status: string
  preview: string
}

interface ReminderResponse {
  delivery_status: string
  messages_sent: MessageSent[]
  summary: string
}

interface AppSettings {
  defaultSlackChannel: string
  reminderFrequency: string
  projectName: string
}

// ============================================================
// CONSTANTS
// ============================================================

const ROADMAP_COORDINATOR_ID = '699d43ba84b11a9ffb6a147f'
const STAKEHOLDER_REMINDER_ID = '699d43d7b180522b55d44611'
const STORAGE_KEY_UPDATES = 'productpulse_updates'
const STORAGE_KEY_SETTINGS = 'productpulse_settings'

const GLASS_CARD = 'bg-white/75 backdrop-blur-[16px] border border-white/[0.18] rounded-[0.875rem] shadow-md'

// ============================================================
// SAMPLE DATA
// ============================================================

const SAMPLE_UPDATE: RoadmapUpdate = {
  update_id: 'upd-20260224-001',
  generated_at: '2026-02-24T10:30:00Z',
  project_name: 'ProductPulse Platform',
  overall_summary: {
    completion_percentage: 68,
    status: 'On Track',
    summary_text: 'The project is progressing well with 68% overall completion. The Authentication Module is complete and Dashboard Analytics is in final testing. Two timeline shifts have been identified for the Reporting Engine and Notification System due to API integration complexity.',
  },
  features: [
    { name: 'Authentication Module', status: 'Completed', progress: 100, last_updated: '2026-02-20', changes: 'OAuth2 flow finalized, SSO integration tested', details: 'All authentication flows including MFA, SSO, and password reset are fully implemented and tested.' },
    { name: 'Dashboard Analytics', status: 'In Progress', progress: 85, last_updated: '2026-02-23', changes: 'Added real-time chart updates, performance optimized', details: 'Real-time data visualization with WebSocket connections. Final accessibility audit pending.' },
    { name: 'Reporting Engine', status: 'In Progress', progress: 55, last_updated: '2026-02-22', changes: 'PDF export added, CSV generation refactored', details: 'Core reporting functionality complete. Custom report builder and scheduling features in development.' },
    { name: 'Notification System', status: 'Planning', progress: 20, last_updated: '2026-02-18', changes: 'Architecture design approved, Slack integration started', details: 'Multi-channel notification system supporting email, Slack, and in-app notifications.' },
    { name: 'User Management', status: 'In Progress', progress: 70, last_updated: '2026-02-21', changes: 'Role-based access control implemented', details: 'User CRUD, team management, and RBAC are functional. Invitation flow and audit logging remain.' },
  ],
  timeline_changes: [
    { feature: 'Reporting Engine', original_date: '2026-03-15', new_date: '2026-03-28', reason: 'API integration complexity higher than estimated', impact: 'Delays stakeholder demo by 1 week', severity: 'Medium' },
    { feature: 'Notification System', original_date: '2026-03-20', new_date: '2026-04-05', reason: 'Dependency on Authentication Module completion', impact: 'Push notification testing requires auth tokens', severity: 'Low' },
  ],
  dependencies: [
    { from_feature: 'Authentication Module', to_feature: 'Notification System', status: 'Resolved', is_blocker: false },
    { from_feature: 'Dashboard Analytics', to_feature: 'Reporting Engine', status: 'Active', is_blocker: true },
    { from_feature: 'User Management', to_feature: 'Dashboard Analytics', status: 'Active', is_blocker: false },
  ],
  risk_indicators: [
    { title: 'API Rate Limiting', severity: 'High', description: 'Third-party analytics API has strict rate limits that may affect real-time dashboard performance under load.', mitigation: 'Implement caching layer and request batching. Negotiate higher rate limits with provider.' },
    { title: 'Database Migration Risk', severity: 'Medium', description: 'Schema changes for reporting engine require careful migration strategy to avoid data loss.', mitigation: 'Staged migration with rollback scripts. Run dry-run on staging environment first.' },
    { title: 'Team Capacity', severity: 'Low', description: 'One senior developer on planned leave during final sprint.', mitigation: 'Knowledge transfer session scheduled. Junior developer paired for continuity.' },
  ],
  action_items: [
    { task: 'Review API caching strategy document', assignee: 'Sarah Chen', priority: 'High', due_date: '2026-02-26' },
    { task: 'Approve database migration plan', assignee: 'Mike Johnson', priority: 'High', due_date: '2026-02-27' },
    { task: 'Schedule stakeholder demo for Dashboard Analytics', assignee: 'Lisa Park', priority: 'Medium', due_date: '2026-03-01' },
    { task: 'Update project timeline in Jira', assignee: 'David Kim', priority: 'Medium', due_date: '2026-02-25' },
    { task: 'Complete accessibility audit for Dashboard', assignee: 'Emily Torres', priority: 'Low', due_date: '2026-03-05' },
  ],
}

// ============================================================
// HELPERS
// ============================================================

function renderMarkdown(text: string) {
  if (!text) return null
  return (
    <div className="space-y-2">
      {text.split('\n').map((line, i) => {
        if (line.startsWith('### ')) return <h4 key={i} className="font-semibold text-sm mt-3 mb-1">{line.slice(4)}</h4>
        if (line.startsWith('## ')) return <h3 key={i} className="font-semibold text-base mt-3 mb-1">{line.slice(3)}</h3>
        if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-lg mt-4 mb-2">{line.slice(2)}</h2>
        if (line.startsWith('- ') || line.startsWith('* ')) return <li key={i} className="ml-4 list-disc text-sm">{formatInline(line.slice(2))}</li>
        if (/^\d+\.\s/.test(line)) return <li key={i} className="ml-4 list-decimal text-sm">{formatInline(line.replace(/^\d+\.\s/, ''))}</li>
        if (!line.trim()) return <div key={i} className="h-1" />
        return <p key={i} className="text-sm leading-relaxed">{formatInline(line)}</p>
      })}
    </div>
  )
}

function formatInline(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g)
  if (parts.length === 1) return text
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
  )
}

function getStatusColor(status: string): string {
  const s = (status ?? '').toLowerCase()
  if (s.includes('completed') || s.includes('resolved') || s.includes('done') || s.includes('success')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (s.includes('in progress') || s.includes('active') || s.includes('on track')) return 'bg-blue-100 text-blue-700 border-blue-200'
  if (s.includes('planning') || s.includes('pending')) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (s.includes('blocked') || s.includes('at risk') || s.includes('delayed')) return 'bg-red-100 text-red-700 border-red-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function getSeverityColor(severity: string): string {
  const s = (severity ?? '').toLowerCase()
  if (s === 'high' || s === 'critical') return 'bg-red-100 text-red-700 border-red-200'
  if (s === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (s === 'low') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function getPriorityColor(priority: string): string {
  const p = (priority ?? '').toLowerCase()
  if (p === 'high' || p === 'urgent' || p === 'critical') return 'bg-red-100 text-red-700 border-red-200'
  if (p === 'medium') return 'bg-amber-100 text-amber-700 border-amber-200'
  if (p === 'low') return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '--'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatTimestamp(dateStr: string): string {
  if (!dateStr) return '--'
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
  } catch {
    return dateStr
  }
}

// ============================================================
// PROGRESS MESSAGES
// ============================================================

const PROGRESS_MESSAGES = [
  'Connecting to lovable.dev...',
  'Fetching project changes...',
  'Tracking feature updates...',
  'Analyzing timeline shifts...',
  'Mapping dependencies...',
  'Assessing risk indicators...',
  'Generating summary report...',
  'Compiling action items...',
  'Finalizing roadmap update...',
]

// ============================================================
// ERROR BOUNDARY
// ============================================================

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button onClick={() => this.setState({ hasError: false, error: '' })} className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm">
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ============================================================
// INLINE COMPONENTS
// ============================================================

function LoadingSkeleton({ progressMessage }: { progressMessage: string }) {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3 mb-8">
        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
          <RefreshCw className="h-4 w-4 text-primary animate-spin" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">Generating Roadmap Update</p>
          <p className="text-xs text-muted-foreground">{progressMessage}</p>
        </div>
      </div>
      <div className={cn(GLASS_CARD, 'p-6')}>
        <Skeleton className="h-5 w-48 mb-4" />
        <Skeleton className="h-3 w-full mb-2" />
        <Skeleton className="h-3 w-3/4 mb-6" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
          <Skeleton className="h-20 rounded-lg" />
        </div>
      </div>
      <div className={cn(GLASS_CARD, 'p-6')}>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-3">
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
          <Skeleton className="h-14 rounded-lg" />
        </div>
      </div>
      <div className={cn(GLASS_CARD, 'p-6')}>
        <Skeleton className="h-5 w-32 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}

function StatusBanner({ type, message, onDismiss }: { type: 'success' | 'error' | 'info'; message: string; onDismiss?: () => void }) {
  const colors = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  }
  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-emerald-600 flex-shrink-0" />,
    error: <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />,
    info: <Info className="h-5 w-5 text-blue-600 flex-shrink-0" />,
  }
  return (
    <div className={cn('flex items-start gap-3 p-4 rounded-[0.875rem] border', colors[type])}>
      {icons[type]}
      <p className="text-sm flex-1">{message}</p>
      {onDismiss && (
        <button onClick={onDismiss} className="flex-shrink-0 hover:opacity-70 transition-opacity">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}

function AccordionSection({ title, icon, children, defaultOpen }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen ?? false)
  return (
    <div className={cn(GLASS_CARD, 'overflow-hidden')}>
      <button onClick={() => setIsOpen(!isOpen)} className="w-full flex items-center justify-between p-5 hover:bg-white/40 transition-colors">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary">{icon}</div>
          <span className="font-medium text-sm text-foreground">{title}</span>
        </div>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>
      {isOpen && (
        <div className="px-5 pb-5 border-t border-border/50">
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, icon, accent }: { label: string; value: string | number; icon: React.ReactNode; accent?: string }) {
  return (
    <div className={cn(GLASS_CARD, 'p-4')}>
      <div className="flex items-center gap-3">
        <div className={cn('h-10 w-10 rounded-xl flex items-center justify-center', accent ?? 'bg-primary/5 text-primary')}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-semibold tracking-tight text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ title, description, action, onAction }: { title: string; description: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/5 flex items-center justify-center mb-6">
        <FileText className="h-8 w-8 text-primary/40" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-6 leading-relaxed">{description}</p>
      {action && onAction && (
        <Button onClick={onAction} className="rounded-xl">
          <Zap className="h-4 w-4 mr-2" />
          {action}
        </Button>
      )}
    </div>
  )
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function Page() {
  // --- State ---
  const [currentScreen, setCurrentScreen] = useState<'dashboard' | 'review' | 'history' | 'settings'>('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSampleData, setShowSampleData] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sendingReminder, setSendingReminder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [progressIdx, setProgressIdx] = useState(0)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)

  // Data state
  const [currentUpdate, setCurrentUpdate] = useState<RoadmapUpdate | null>(null)
  const [updates, setUpdates] = useState<RoadmapUpdate[]>([])
  const [settings, setSettings] = useState<AppSettings>({ defaultSlackChannel: '', reminderFrequency: 'daily', projectName: 'My Project' })

  // Slack form state
  const [slackChannel, setSlackChannel] = useState('')
  const [customMessage, setCustomMessage] = useState('')

  // History search
  const [searchQuery, setSearchQuery] = useState('')

  // History expansion
  const [expandedUpdateId, setExpandedUpdateId] = useState<string | null>(null)

  // Action items editability
  const [editableActionItems, setEditableActionItems] = useState<ActionItem[]>([])
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})

  // Refs
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mountedRef = useRef(false)

  // --- Effects ---
  useEffect(() => {
    mountedRef.current = true
    // Load from localStorage
    try {
      const storedUpdates = localStorage.getItem(STORAGE_KEY_UPDATES)
      if (storedUpdates) {
        const parsed = JSON.parse(storedUpdates)
        if (Array.isArray(parsed)) setUpdates(parsed)
      }
      const storedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS)
      if (storedSettings) {
        const parsed = JSON.parse(storedSettings)
        if (parsed && typeof parsed === 'object') {
          setSettings(prev => ({ ...prev, ...parsed }))
          if (parsed.defaultSlackChannel) setSlackChannel(parsed.defaultSlackChannel)
        }
      }
    } catch {
      // ignore parse errors
    }
    return () => { mountedRef.current = false }
  }, [])

  // Save updates to localStorage
  useEffect(() => {
    if (mountedRef.current && updates.length > 0) {
      try {
        localStorage.setItem(STORAGE_KEY_UPDATES, JSON.stringify(updates))
      } catch {
        // ignore
      }
    }
  }, [updates])

  // Save settings to localStorage
  useEffect(() => {
    if (mountedRef.current) {
      try {
        localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings))
      } catch {
        // ignore
      }
    }
  }, [settings])

  // Progress message rotation
  useEffect(() => {
    if (loading) {
      setProgressIdx(0)
      progressIntervalRef.current = setInterval(() => {
        setProgressIdx(prev => (prev + 1) % PROGRESS_MESSAGES.length)
      }, 3000)
    } else {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current)
        progressIntervalRef.current = null
      }
    }
    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current)
    }
  }, [loading])

  // Sync editable action items when current update changes
  useEffect(() => {
    if (currentUpdate && Array.isArray(currentUpdate?.action_items)) {
      setEditableActionItems([...currentUpdate.action_items])
      setCheckedItems({})
    }
  }, [currentUpdate])

  // --- Computed ---
  const displayUpdate = showSampleData && !currentUpdate ? SAMPLE_UPDATE : currentUpdate
  const displayUpdates = showSampleData && updates.length === 0 ? [SAMPLE_UPDATE] : updates

  const filteredUpdates = useMemo(() => {
    if (!searchQuery.trim()) return displayUpdates
    const q = searchQuery.toLowerCase()
    return displayUpdates.filter(u => {
      const name = u?.project_name ?? ''
      const summary = u?.overall_summary?.summary_text ?? ''
      const id = u?.update_id ?? ''
      return name.toLowerCase().includes(q) || summary.toLowerCase().includes(q) || id.toLowerCase().includes(q)
    })
  }, [displayUpdates, searchQuery])

  const dashboardStats = useMemo(() => {
    const latest = displayUpdates.length > 0 ? displayUpdates[0] : null
    const featuresCount = Array.isArray(latest?.features) ? latest.features.length : 0
    const inProgress = Array.isArray(latest?.features) ? latest.features.filter(f => (f?.status ?? '').toLowerCase().includes('in progress')).length : 0
    const risksCount = Array.isArray(latest?.risk_indicators) ? latest.risk_indicators.length : 0
    const overdueItems = Array.isArray(latest?.action_items) ? latest.action_items.filter(a => {
      if (!a?.due_date) return false
      try { return new Date(a.due_date) < new Date() } catch { return false }
    }).length : 0
    const completion = latest?.overall_summary?.completion_percentage ?? 0
    return { featuresCount, inProgress, risksCount, overdueItems, completion, latest }
  }, [displayUpdates])

  // --- Handlers ---
  const handleGenerateUpdate = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuccessMessage(null)
    setActiveAgentId(ROADMAP_COORDINATOR_ID)
    try {
      const message = `Generate a comprehensive roadmap update for the project "${settings.projectName}". Include feature completion status, timeline changes, dependencies, risk indicators, and action items.`
      const result = await callAIAgent(message, ROADMAP_COORDINATOR_ID)
      if (result.success && result?.response?.result) {
        const data = result.response.result as RoadmapUpdate
        const update: RoadmapUpdate = {
          update_id: data?.update_id ?? `upd-${Date.now()}`,
          generated_at: data?.generated_at ?? new Date().toISOString(),
          project_name: data?.project_name ?? settings.projectName,
          overall_summary: {
            completion_percentage: data?.overall_summary?.completion_percentage ?? 0,
            status: data?.overall_summary?.status ?? 'Unknown',
            summary_text: data?.overall_summary?.summary_text ?? '',
          },
          features: Array.isArray(data?.features) ? data.features : [],
          timeline_changes: Array.isArray(data?.timeline_changes) ? data.timeline_changes : [],
          dependencies: Array.isArray(data?.dependencies) ? data.dependencies : [],
          risk_indicators: Array.isArray(data?.risk_indicators) ? data.risk_indicators : [],
          action_items: Array.isArray(data?.action_items) ? data.action_items : [],
        }
        setCurrentUpdate(update)
        setUpdates(prev => [update, ...prev])
        setCurrentScreen('review')
        setSuccessMessage('Roadmap update generated successfully.')
      } else {
        setError(result?.error ?? result?.response?.message ?? 'Failed to generate roadmap update. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setLoading(false)
      setActiveAgentId(null)
    }
  }, [settings.projectName])

  const handleSendReminder = useCallback(async () => {
    if (!slackChannel.trim()) {
      setError('Please enter a Slack channel name.')
      return
    }
    if (!currentUpdate) {
      setError('No roadmap update to send. Please generate one first.')
      return
    }
    setSendingReminder(true)
    setError(null)
    setSuccessMessage(null)
    setActiveAgentId(STAKEHOLDER_REMINDER_ID)
    try {
      let updateJson = ''
      try {
        updateJson = JSON.stringify(currentUpdate)
      } catch {
        updateJson = 'Unable to serialize update data.'
      }
      const messageText = `Send the following roadmap update to Slack channel #${slackChannel.replace('#', '')}. ${customMessage ? customMessage + '. ' : ''}Here is the update: ${updateJson}`
      const result = await callAIAgent(messageText, STAKEHOLDER_REMINDER_ID)
      if (result.success && result?.response?.result) {
        const reminder = result.response.result as ReminderResponse
        const msgCount = Array.isArray(reminder?.messages_sent) ? reminder.messages_sent.length : 0
        const summaryText = reminder?.summary ?? `Roadmap update sent to #${slackChannel}`
        setSuccessMessage(`${summaryText} (${msgCount} message${msgCount !== 1 ? 's' : ''} sent)`)
        // Update the delivery_status on the current update
        const updatedUpdate = { ...currentUpdate, delivery_status: reminder?.delivery_status ?? 'sent' }
        setCurrentUpdate(updatedUpdate)
        setUpdates(prev => prev.map(u => u.update_id === updatedUpdate.update_id ? updatedUpdate : u))
      } else {
        setError(result?.error ?? result?.response?.message ?? 'Failed to send reminders. Please try again.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.')
    } finally {
      setSendingReminder(false)
      setActiveAgentId(null)
    }
  }, [slackChannel, customMessage, currentUpdate])

  const handleViewUpdate = useCallback((update: RoadmapUpdate) => {
    setCurrentUpdate(update)
    setCurrentScreen('review')
    setError(null)
    setSuccessMessage(null)
  }, [])

  const handleSaveDraft = useCallback(() => {
    if (currentUpdate) {
      const updated = { ...currentUpdate, action_items: editableActionItems }
      setCurrentUpdate(updated)
      setUpdates(prev => prev.map(u => u.update_id === updated.update_id ? updated : u))
      setSuccessMessage('Draft saved successfully.')
    }
  }, [currentUpdate, editableActionItems])

  // --- Navigation ---
  const navItems = [
    { key: 'dashboard' as const, label: 'Dashboard', icon: <BarChart3 className="h-5 w-5" /> },
    { key: 'history' as const, label: 'Update History', icon: <ClipboardList className="h-5 w-5" /> },
    { key: 'settings' as const, label: 'Settings', icon: <Settings className="h-5 w-5" /> },
  ]

  // ============================================================
  // RENDER: SIDEBAR
  // ============================================================

  function renderSidebar() {
    return (
      <aside className={cn('fixed left-0 top-0 h-full z-30 transition-all duration-300 ease-in-out', sidebarOpen ? 'w-60' : 'w-0 -translate-x-full md:translate-x-0 md:w-16')}>
        <div className="h-full bg-white/60 backdrop-blur-[16px] border-r border-white/[0.18] flex flex-col">
          {/* Logo */}
          <div className={cn('flex items-center gap-3 p-4 border-b border-border/50', !sidebarOpen && 'justify-center px-2')}>
            <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center flex-shrink-0">
              <LayoutGrid className="h-5 w-5 text-primary-foreground" />
            </div>
            {sidebarOpen && <span className="font-semibold text-sm tracking-tight text-foreground">ProductPulse</span>}
          </div>

          {/* Nav */}
          <nav className="flex-1 p-3 space-y-1">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => { setCurrentScreen(item.key); setError(null); setSuccessMessage(null) }}
                className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200', currentScreen === item.key ? 'bg-primary text-primary-foreground shadow-md' : 'text-muted-foreground hover:bg-accent hover:text-foreground', !sidebarOpen && 'justify-center px-2')}
              >
                {item.icon}
                {sidebarOpen && <span>{item.label}</span>}
              </button>
            ))}
          </nav>

          {/* Agent Status */}
          {sidebarOpen && (
            <div className="p-3 border-t border-border/50">
              <p className="text-xs font-medium text-muted-foreground mb-2 px-2">Agents</p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className={cn('h-2 w-2 rounded-full', activeAgentId === ROADMAP_COORDINATOR_ID ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
                  <span className="text-xs text-muted-foreground truncate">Roadmap Coordinator</span>
                </div>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  <div className={cn('h-2 w-2 rounded-full', activeAgentId === STAKEHOLDER_REMINDER_ID ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300')} />
                  <span className="text-xs text-muted-foreground truncate">Stakeholder Reminder</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </aside>
    )
  }

  // ============================================================
  // RENDER: HEADER
  // ============================================================

  function renderHeader() {
    return (
      <header className="sticky top-0 z-20 bg-white/60 backdrop-blur-[16px] border-b border-white/[0.18]">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="h-9 w-9 rounded-xl flex items-center justify-center hover:bg-accent transition-colors text-muted-foreground">
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-foreground">
                {currentScreen === 'dashboard' && 'Dashboard'}
                {currentScreen === 'review' && 'Update Review'}
                {currentScreen === 'history' && 'Update History'}
                {currentScreen === 'settings' && 'Settings'}
              </h1>
              <p className="text-xs text-muted-foreground">{settings.projectName}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-toggle" className="text-xs text-muted-foreground cursor-pointer">Sample Data</Label>
              <Switch id="sample-toggle" checked={showSampleData} onCheckedChange={setShowSampleData} />
            </div>
          </div>
        </div>
      </header>
    )
  }

  // ============================================================
  // SCREEN: DASHBOARD
  // ============================================================

  function renderDashboard() {
    if (loading) {
      return <LoadingSkeleton progressMessage={PROGRESS_MESSAGES[progressIdx] ?? 'Processing...'} />
    }

    return (
      <div className="p-6 space-y-6">
        {error && <StatusBanner type="error" message={error} onDismiss={() => setError(null)} />}
        {successMessage && <StatusBanner type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

        {/* Top Row: CTA + Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* CTA Card */}
          <div className={cn(GLASS_CARD, 'p-6 lg:col-span-1 flex flex-col justify-between')}>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground mb-2">Generate Update</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-6">Track your lovable.dev project changes, analyze risks, and notify stakeholders in one click.</p>
            </div>
            <Button onClick={handleGenerateUpdate} disabled={loading} className="w-full rounded-xl h-11 text-sm font-medium">
              <Zap className="h-4 w-4 mr-2" />
              Generate Roadmap Update
            </Button>
          </div>

          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard label="Overall Progress" value={`${dashboardStats.completion}%`} icon={<BarChart3 className="h-5 w-5" />} accent="bg-blue-50 text-blue-600" />
            <MetricCard label="Features" value={dashboardStats.featuresCount} icon={<LayoutGrid className="h-5 w-5" />} accent="bg-emerald-50 text-emerald-600" />
            <MetricCard label="Risks" value={dashboardStats.risksCount} icon={<AlertTriangle className="h-5 w-5" />} accent="bg-amber-50 text-amber-600" />
            <MetricCard label="Overdue" value={dashboardStats.overdueItems} icon={<Clock className="h-5 w-5" />} accent="bg-red-50 text-red-600" />
          </div>
        </div>

        {/* Latest Summary */}
        {dashboardStats.latest && (
          <div className={cn(GLASS_CARD, 'p-6')}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Latest Summary</h3>
              <Badge className={cn('text-xs', getStatusColor(dashboardStats.latest?.overall_summary?.status ?? ''))}>
                {dashboardStats.latest?.overall_summary?.status ?? 'Unknown'}
              </Badge>
            </div>
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-muted-foreground">Completion</span>
                <span className="text-xs font-medium">{dashboardStats.latest?.overall_summary?.completion_percentage ?? 0}%</span>
              </div>
              <Progress value={dashboardStats.latest?.overall_summary?.completion_percentage ?? 0} className="h-2" />
            </div>
            <div className="text-sm text-muted-foreground leading-relaxed">
              {renderMarkdown(dashboardStats.latest?.overall_summary?.summary_text ?? '')}
            </div>
          </div>
        )}

        {/* Recent Updates */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">Recent Updates</h3>
            {displayUpdates.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setCurrentScreen('history')} className="text-xs text-muted-foreground hover:text-foreground">
                View all
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            )}
          </div>
          {displayUpdates.length === 0 ? (
            <EmptyState title="No updates yet" description="Generate your first roadmap update to start tracking your project progress and keeping stakeholders informed." action="Generate First Update" onAction={handleGenerateUpdate} />
          ) : (
            <div className="space-y-3">
              {displayUpdates.slice(0, 5).map((update, idx) => (
                <button key={update?.update_id ?? idx} onClick={() => handleViewUpdate(update)} className={cn(GLASS_CARD, 'w-full p-4 text-left hover:bg-white/90 transition-colors cursor-pointer')}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-foreground">{update?.project_name ?? 'Untitled'}</span>
                    <div className="flex items-center gap-2">
                      {update?.delivery_status && (
                        <Badge className={cn('text-xs', getStatusColor(update.delivery_status))}>
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Sent
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{formatTimestamp(update?.generated_at ?? '')}</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{update?.overall_summary?.summary_text ?? 'No summary available'}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================================
  // SCREEN: UPDATE REVIEW
  // ============================================================

  function renderReview() {
    if (loading) {
      return <LoadingSkeleton progressMessage={PROGRESS_MESSAGES[progressIdx] ?? 'Processing...'} />
    }

    if (!displayUpdate) {
      return (
        <div className="p-6">
          <EmptyState title="No update to review" description="Generate a roadmap update first from the Dashboard, then come back here to review and send it." action="Go to Dashboard" onAction={() => setCurrentScreen('dashboard')} />
        </div>
      )
    }

    const features = Array.isArray(displayUpdate?.features) ? displayUpdate.features : []
    const timelineChanges = Array.isArray(displayUpdate?.timeline_changes) ? displayUpdate.timeline_changes : []
    const dependencies = Array.isArray(displayUpdate?.dependencies) ? displayUpdate.dependencies : []
    const risks = Array.isArray(displayUpdate?.risk_indicators) ? displayUpdate.risk_indicators : []
    const actionItems = editableActionItems.length > 0 ? editableActionItems : (Array.isArray(displayUpdate?.action_items) ? displayUpdate.action_items : [])

    return (
      <div className="p-6 space-y-4">
        {/* Top Buttons */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { setCurrentScreen('dashboard'); setError(null); setSuccessMessage(null) }} className="text-sm text-muted-foreground">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSaveDraft} className="rounded-xl text-xs">
              Save Draft
            </Button>
          </div>
        </div>

        {error && <StatusBanner type="error" message={error} onDismiss={() => setError(null)} />}
        {successMessage && <StatusBanner type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />}

        {/* Overview Card */}
        <div className={cn(GLASS_CARD, 'p-6')}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">{displayUpdate?.project_name ?? 'Project Update'}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{formatTimestamp(displayUpdate?.generated_at ?? '')} -- ID: {displayUpdate?.update_id ?? '--'}</p>
            </div>
            <Badge className={cn('text-xs', getStatusColor(displayUpdate?.overall_summary?.status ?? ''))}>
              {displayUpdate?.overall_summary?.status ?? 'Unknown'}
            </Badge>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground">Overall Completion</span>
                <span className="text-sm font-semibold">{displayUpdate?.overall_summary?.completion_percentage ?? 0}%</span>
              </div>
              <Progress value={displayUpdate?.overall_summary?.completion_percentage ?? 0} className="h-2.5" />
            </div>
          </div>
          <div className="text-sm text-muted-foreground leading-relaxed">
            {renderMarkdown(displayUpdate?.overall_summary?.summary_text ?? '')}
          </div>
        </div>

        {/* Accordion Sections */}
        <AccordionSection title={`Features (${features.length})`} icon={<LayoutGrid className="h-4 w-4" />} defaultOpen>
          {features.length === 0 ? (
            <p className="text-sm text-muted-foreground">No features reported in this update.</p>
          ) : (
            <div className="space-y-3">
              {features.map((feature, idx) => (
                <div key={idx} className="bg-white/50 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{feature?.name ?? 'Unnamed Feature'}</span>
                    <Badge className={cn('text-xs', getStatusColor(feature?.status ?? ''))}>{feature?.status ?? '--'}</Badge>
                  </div>
                  <div className="flex items-center gap-4 mb-2">
                    <div className="flex-1">
                      <Progress value={feature?.progress ?? 0} className="h-1.5" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground w-10 text-right">{feature?.progress ?? 0}%</span>
                  </div>
                  {feature?.changes && <p className="text-xs text-muted-foreground mb-1"><span className="font-medium">Changes:</span> {feature.changes}</p>}
                  {feature?.details && <p className="text-xs text-muted-foreground"><span className="font-medium">Details:</span> {feature.details}</p>}
                  {feature?.last_updated && <p className="text-xs text-muted-foreground mt-1">Last updated: {formatDate(feature.last_updated)}</p>}
                </div>
              ))}
            </div>
          )}
        </AccordionSection>

        <AccordionSection title={`Timeline Changes (${timelineChanges.length})`} icon={<Clock className="h-4 w-4" />} defaultOpen={timelineChanges.length > 0}>
          {timelineChanges.length === 0 ? (
            <p className="text-sm text-muted-foreground">No timeline changes detected.</p>
          ) : (
            <div className="space-y-3">
              {timelineChanges.map((tc, idx) => (
                <div key={idx} className="bg-white/50 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-foreground">{tc?.feature ?? 'Unknown Feature'}</span>
                    <Badge className={cn('text-xs', getSeverityColor(tc?.severity ?? ''))}>{tc?.severity ?? '--'}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-2">
                    <div className="bg-red-50/50 rounded-lg p-2.5 border border-red-100">
                      <p className="text-xs text-red-500 font-medium mb-0.5">Original Date</p>
                      <p className="text-sm text-red-700">{formatDate(tc?.original_date ?? '')}</p>
                    </div>
                    <div className="bg-emerald-50/50 rounded-lg p-2.5 border border-emerald-100">
                      <p className="text-xs text-emerald-500 font-medium mb-0.5">New Date</p>
                      <p className="text-sm text-emerald-700">{formatDate(tc?.new_date ?? '')}</p>
                    </div>
                  </div>
                  {tc?.reason && <p className="text-xs text-muted-foreground mb-1"><span className="font-medium">Reason:</span> {tc.reason}</p>}
                  {tc?.impact && <p className="text-xs text-muted-foreground"><span className="font-medium">Impact:</span> {tc.impact}</p>}
                </div>
              ))}
            </div>
          )}
        </AccordionSection>

        <AccordionSection title={`Dependencies (${dependencies.length})`} icon={<RefreshCw className="h-4 w-4" />}>
          {dependencies.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dependencies tracked.</p>
          ) : (
            <div className="space-y-3">
              {dependencies.map((dep, idx) => (
                <div key={idx} className={cn('bg-white/50 rounded-xl p-4 border', dep?.is_blocker ? 'border-red-200 bg-red-50/30' : 'border-border/50')}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-foreground">{dep?.from_feature ?? '--'}</span>
                      <ChevronRight className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">{dep?.to_feature ?? '--'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {dep?.is_blocker && <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Blocker</Badge>}
                      <Badge className={cn('text-xs', getStatusColor(dep?.status ?? ''))}>{dep?.status ?? '--'}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AccordionSection>

        <AccordionSection title={`Risk Indicators (${risks.length})`} icon={<ShieldAlert className="h-4 w-4" />} defaultOpen={risks.length > 0}>
          {risks.length === 0 ? (
            <p className="text-sm text-muted-foreground">No risk indicators identified.</p>
          ) : (
            <div className="space-y-3">
              {risks.map((risk, idx) => (
                <div key={idx} className="bg-white/50 rounded-xl p-4 border border-border/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className={cn('h-4 w-4', (risk?.severity ?? '').toLowerCase() === 'high' ? 'text-red-500' : (risk?.severity ?? '').toLowerCase() === 'medium' ? 'text-amber-500' : 'text-emerald-500')} />
                      <span className="text-sm font-medium text-foreground">{risk?.title ?? 'Untitled Risk'}</span>
                    </div>
                    <Badge className={cn('text-xs', getSeverityColor(risk?.severity ?? ''))}>{risk?.severity ?? '--'}</Badge>
                  </div>
                  {risk?.description && <p className="text-xs text-muted-foreground mb-2">{risk.description}</p>}
                  {risk?.mitigation && (
                    <div className="bg-blue-50/50 rounded-lg p-2.5 border border-blue-100">
                      <p className="text-xs text-blue-600 font-medium mb-0.5">Mitigation</p>
                      <p className="text-xs text-blue-700">{risk.mitigation}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </AccordionSection>

        <AccordionSection title={`Action Items (${actionItems.length})`} icon={<CheckCircle2 className="h-4 w-4" />} defaultOpen>
          {actionItems.length === 0 ? (
            <p className="text-sm text-muted-foreground">No action items in this update.</p>
          ) : (
            <div className="space-y-2">
              {actionItems.map((item, idx) => (
                <div key={idx} className={cn('flex items-start gap-3 bg-white/50 rounded-xl p-3 border border-border/50 transition-opacity', checkedItems[idx] ? 'opacity-60' : '')}>
                  <input type="checkbox" checked={!!checkedItems[idx]} onChange={() => setCheckedItems(prev => ({ ...prev, [idx]: !prev[idx] }))} className="mt-1 h-4 w-4 rounded border-border accent-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-sm text-foreground', checkedItems[idx] ? 'line-through' : '')}>{item?.task ?? 'No task description'}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {item?.assignee && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground bg-accent/50 px-2 py-0.5 rounded-full">
                          <Users className="h-3 w-3" />
                          {item.assignee}
                        </span>
                      )}
                      {item?.due_date && (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {formatDate(item.due_date)}
                        </span>
                      )}
                      {item?.priority && <Badge className={cn('text-xs', getPriorityColor(item.priority))}>{item.priority}</Badge>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </AccordionSection>

        {/* Send Reminders Section */}
        <div className={cn(GLASS_CARD, 'p-6')}>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-8 w-8 rounded-lg bg-primary/5 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Send to Slack</h3>
              <p className="text-xs text-muted-foreground">Notify stakeholders via Slack channel</p>
            </div>
          </div>
          <div className="space-y-3">
            <div>
              <Label htmlFor="slack-channel" className="text-xs text-muted-foreground mb-1 block">Slack Channel *</Label>
              <Input
                id="slack-channel"
                placeholder="#project-updates"
                value={slackChannel}
                onChange={(e) => setSlackChannel(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="custom-message" className="text-xs text-muted-foreground mb-1 block">Custom Message (optional)</Label>
              <Textarea
                id="custom-message"
                placeholder="Add a note for stakeholders..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={handleSendReminder}
              disabled={sendingReminder || !slackChannel.trim()}
              className="w-full rounded-xl h-11 text-sm font-medium"
            >
              {sendingReminder ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Reminders
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // ============================================================
  // SCREEN: HISTORY
  // ============================================================

  function renderHistory() {
    return (
      <div className="p-6 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search updates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 rounded-xl"
          />
        </div>

        {filteredUpdates.length === 0 ? (
          <EmptyState title="No updates found" description={searchQuery ? 'No updates match your search. Try a different query.' : 'Generate your first roadmap update to see it here.'} action={searchQuery ? undefined : 'Generate First Update'} onAction={searchQuery ? undefined : handleGenerateUpdate} />
        ) : (
          <div className="space-y-3">
            {filteredUpdates.map((update, idx) => {
              const isExpanded = expandedUpdateId === (update?.update_id ?? `idx-${idx}`)
              const uFeatures = Array.isArray(update?.features) ? update.features : []
              const uTimelines = Array.isArray(update?.timeline_changes) ? update.timeline_changes : []
              const uRisks = Array.isArray(update?.risk_indicators) ? update.risk_indicators : []
              const uActions = Array.isArray(update?.action_items) ? update.action_items : []
              const uDeps = Array.isArray(update?.dependencies) ? update.dependencies : []

              return (
                <div key={update?.update_id ?? idx} className={cn(GLASS_CARD, 'overflow-hidden')}>
                  <button
                    onClick={() => setExpandedUpdateId(isExpanded ? null : (update?.update_id ?? `idx-${idx}`))}
                    className="w-full p-4 text-left hover:bg-white/90 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{update?.project_name ?? 'Untitled'}</span>
                        <Badge className={cn('text-xs', getStatusColor(update?.overall_summary?.status ?? ''))}>{update?.overall_summary?.status ?? '--'}</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        {update?.delivery_status && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Sent
                          </Badge>
                        )}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">{formatTimestamp(update?.generated_at ?? '')} -- {update?.overall_summary?.completion_percentage ?? 0}% complete</p>
                    {!isExpanded && <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{update?.overall_summary?.summary_text ?? ''}</p>}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-border/50 pt-3 space-y-4">
                      {/* Summary */}
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-1">Summary</p>
                        <div className="text-sm text-foreground leading-relaxed">{renderMarkdown(update?.overall_summary?.summary_text ?? '')}</div>
                      </div>

                      {/* Features mini */}
                      {uFeatures.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Features ({uFeatures.length})</p>
                          <div className="space-y-2">
                            {uFeatures.map((f, fi) => (
                              <div key={fi} className="flex items-center justify-between bg-white/50 rounded-lg p-2 border border-border/50">
                                <span className="text-xs text-foreground">{f?.name ?? '--'}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{f?.progress ?? 0}%</span>
                                  <Badge className={cn('text-xs', getStatusColor(f?.status ?? ''))}>{f?.status ?? '--'}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Timeline changes mini */}
                      {uTimelines.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Timeline Changes ({uTimelines.length})</p>
                          <div className="space-y-1">
                            {uTimelines.map((tc, ti) => (
                              <div key={ti} className="flex items-center justify-between bg-white/50 rounded-lg p-2 border border-border/50">
                                <span className="text-xs text-foreground">{tc?.feature ?? '--'}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-red-500 line-through">{formatDate(tc?.original_date ?? '')}</span>
                                  <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-xs text-emerald-600">{formatDate(tc?.new_date ?? '')}</span>
                                  <Badge className={cn('text-xs', getSeverityColor(tc?.severity ?? ''))}>{tc?.severity ?? '--'}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dependencies mini */}
                      {uDeps.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Dependencies ({uDeps.length})</p>
                          <div className="space-y-1">
                            {uDeps.map((dep, di) => (
                              <div key={di} className="flex items-center justify-between bg-white/50 rounded-lg p-2 border border-border/50">
                                <span className="text-xs text-foreground">{dep?.from_feature ?? '--'} &rarr; {dep?.to_feature ?? '--'}</span>
                                <div className="flex items-center gap-2">
                                  {dep?.is_blocker && <Badge className="text-xs bg-red-100 text-red-700 border-red-200">Blocker</Badge>}
                                  <Badge className={cn('text-xs', getStatusColor(dep?.status ?? ''))}>{dep?.status ?? '--'}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Risks mini */}
                      {uRisks.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Risks ({uRisks.length})</p>
                          <div className="space-y-1">
                            {uRisks.map((r, ri) => (
                              <div key={ri} className="flex items-center justify-between bg-white/50 rounded-lg p-2 border border-border/50">
                                <span className="text-xs text-foreground">{r?.title ?? '--'}</span>
                                <Badge className={cn('text-xs', getSeverityColor(r?.severity ?? ''))}>{r?.severity ?? '--'}</Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Action items mini */}
                      {uActions.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Action Items ({uActions.length})</p>
                          <div className="space-y-1">
                            {uActions.map((a, ai) => (
                              <div key={ai} className="flex items-center justify-between bg-white/50 rounded-lg p-2 border border-border/50">
                                <span className="text-xs text-foreground">{a?.task ?? '--'}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">{a?.assignee ?? '--'}</span>
                                  <Badge className={cn('text-xs', getPriorityColor(a?.priority ?? ''))}>{a?.priority ?? '--'}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewUpdate(update)} className="rounded-xl text-xs">
                          Open Full Review
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ============================================================
  // SCREEN: SETTINGS
  // ============================================================

  function renderSettings() {
    return (
      <div className="p-6 space-y-6 max-w-2xl">
        {/* Project Settings */}
        <div className={cn(GLASS_CARD, 'p-6')}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Project Configuration</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="project-name" className="text-xs text-muted-foreground mb-1 block">Project Name</Label>
              <Input
                id="project-name"
                value={settings.projectName}
                onChange={(e) => setSettings(prev => ({ ...prev, projectName: e.target.value }))}
                placeholder="My Project"
                className="rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* API Connection */}
        <div className={cn(GLASS_CARD, 'p-6')}>
          <h3 className="text-sm font-semibold text-foreground mb-4">lovable.dev Connection</h3>
          <div className="flex items-center gap-3 bg-white/50 rounded-xl p-4 border border-border/50">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Signal className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">API Connection</p>
              <p className="text-xs text-muted-foreground">Connected via Roadmap Coordinator agent</p>
            </div>
            <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200">Active</Badge>
          </div>
        </div>

        {/* Slack Settings */}
        <div className={cn(GLASS_CARD, 'p-6')}>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Slack Integration</h3>
          </div>
          <div className="space-y-4">
            <div>
              <Label htmlFor="default-channel" className="text-xs text-muted-foreground mb-1 block">Default Slack Channel</Label>
              <Input
                id="default-channel"
                value={settings.defaultSlackChannel}
                onChange={(e) => {
                  setSettings(prev => ({ ...prev, defaultSlackChannel: e.target.value }))
                  setSlackChannel(e.target.value)
                }}
                placeholder="#project-updates"
                className="rounded-xl"
              />
              <p className="text-xs text-muted-foreground mt-1">This channel will be pre-filled when sending reminders.</p>
            </div>
          </div>
        </div>

        {/* Reminder Preferences */}
        <div className={cn(GLASS_CARD, 'p-6')}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Reminder Preferences</h3>
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground mb-2 block">Reminder Frequency</Label>
              <div className="grid grid-cols-3 gap-2">
                {['daily', 'weekly', 'bi-weekly'].map(freq => (
                  <button
                    key={freq}
                    onClick={() => setSettings(prev => ({ ...prev, reminderFrequency: freq }))}
                    className={cn('px-4 py-2.5 rounded-xl text-xs font-medium transition-all border', settings.reminderFrequency === freq ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'bg-white/50 text-muted-foreground border-border/50 hover:bg-accent')}
                  >
                    {freq.charAt(0).toUpperCase() + freq.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">Suggested frequency for generating and sending roadmap updates.</p>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className={cn(GLASS_CARD, 'p-6')}>
          <h3 className="text-sm font-semibold text-foreground mb-4">Data Management</h3>
          <div className="flex items-center justify-between bg-white/50 rounded-xl p-4 border border-border/50">
            <div>
              <p className="text-sm font-medium text-foreground">Stored Updates</p>
              <p className="text-xs text-muted-foreground">{updates.length} update{updates.length !== 1 ? 's' : ''} saved locally</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (confirm('Are you sure you want to clear all stored updates?')) {
                  setUpdates([])
                  setCurrentUpdate(null)
                  try { localStorage.removeItem(STORAGE_KEY_UPDATES) } catch {}
                  setSuccessMessage('All stored updates have been cleared.')
                }
              }}
              className="rounded-xl text-xs text-destructive hover:text-destructive"
            >
              Clear All Data
            </Button>
          </div>
        </div>

        {successMessage && <StatusBanner type="success" message={successMessage} onDismiss={() => setSuccessMessage(null)} />}
      </div>
    )
  }

  // ============================================================
  // MAIN RENDER
  // ============================================================

  return (
    <ErrorBoundary>
      <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, hsl(210, 20%, 97%) 0%, hsl(220, 25%, 95%) 35%, hsl(200, 20%, 96%) 70%, hsl(230, 15%, 97%) 100%)' }}>
        {renderSidebar()}

        <div className={cn('min-h-screen transition-all duration-300 ease-in-out', sidebarOpen ? 'ml-60' : 'ml-0 md:ml-16')}>
          {renderHeader()}

          <ScrollArea className="h-[calc(100vh-57px)]">
            <main className="max-w-5xl mx-auto">
              {currentScreen === 'dashboard' && renderDashboard()}
              {currentScreen === 'review' && renderReview()}
              {currentScreen === 'history' && renderHistory()}
              {currentScreen === 'settings' && renderSettings()}
            </main>
          </ScrollArea>
        </div>
      </div>
    </ErrorBoundary>
  )
}
