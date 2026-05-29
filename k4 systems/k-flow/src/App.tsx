import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import ReactMarkdown from 'react-markdown';
import {
  LayoutDashboard, Kanban, ListTodo, GitBranch, BarChart3,
  Sparkles, Settings, FolderKanban, Plus, Search, Bell, ChevronDown,
  X, ArrowRight, Zap, AlertCircle, CheckCircle2, Clock, Users,
  Filter, MoreHorizontal, MessageSquare, Paperclip, Link2,
  Play, Pause, Trash2, Edit3, ChevronRight, Star, TrendingUp,
  TrendingDown, Activity, Target, Flame, Shield, Bug, BookOpen,
  Layers, Send, Bot, User as UserIcon, RefreshCw, ExternalLink,
  Circle, CheckSquare, XCircle, AlertTriangle, Info, Cpu,
  ArrowUpRight, ArrowDownRight, Minus, Hash, Tag, Calendar,
  Timer, RotateCcw, Maximize2, ChevronLeft, PanelLeft
} from 'lucide-react';
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell
} from 'recharts';

// ─── TYPES ───────────────────────────────────────────────────────────────────
type View = 'dashboard' | 'kanban' | 'backlog' | 'workflows' | 'reports' | 'ai' | 'projects' | 'settings';
type Priority = 'critical' | 'high' | 'medium' | 'low';
type IssueStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';
type IssueType = 'bug' | 'feature' | 'task' | 'epic' | 'story';

interface TeamMember { id: string; name: string; initials: string; color: string; role: string; }
interface Comment { id: string; author: TeamMember; text: string; time: string; }
interface Issue {
  id: string; key: string; title: string; description: string;
  type: IssueType; status: IssueStatus; priority: Priority;
  assignee?: TeamMember; labels: string[]; sprint?: string;
  storyPoints?: number; dueDate?: string; createdAt: string;
  comments: Comment[]; projectId: string; estimate?: string;
}
interface Project {
  id: string; key: string; name: string; description: string;
  color: string; issueCount: number; progress: number; members: number;
}
interface Workflow {
  id: string; name: string; description: string; trigger: string;
  actionsCount: number; isActive: boolean; lastRun?: string; executions: number;
}
interface ChatMsg { role: 'user' | 'assistant'; content: string; ts: Date; }

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
const TEAM: TeamMember[] = [
  { id:'1', name:'Fernando Bellini', initials:'FB', color:'#6366f1', role:'Admin' },
  { id:'2', name:'Ana Silva',        initials:'AS', color:'#06b6d4', role:'Dev' },
  { id:'3', name:'Carlos Mendes',    initials:'CM', color:'#f59e0b', role:'Designer' },
  { id:'4', name:'Julia Santos',     initials:'JS', color:'#10b981', role:'QA' },
  { id:'5', name:'Rafael Costa',     initials:'RC', color:'#ef4444', role:'Dev' },
];

const PROJECTS: Project[] = [
  { id:'p1', key:'KF', name:'K4 Platform', description:'Plataforma principal de gestão', color:'#6366f1', issueCount:24, progress:62, members:5 },
  { id:'p2', key:'INF', name:'Infraestrutura', description:'DevOps e infra cloud', color:'#06b6d4', issueCount:11, progress:45, members:3 },
  { id:'p3', key:'MOB', name:'App Mobile', description:'Aplicativo iOS e Android', color:'#f59e0b', issueCount:18, progress:28, members:4 },
];

const INITIAL_ISSUES: Issue[] = [
  {
    id:'i1', key:'KF-7', title:'Redesign do dashboard do usuário', description:'Redesenhar completamente o dashboard com foco em UX e performance. Incluir widgets customizáveis e modo escuro.',
    type:'feature', status:'in_progress', priority:'critical', assignee:TEAM[2],
    labels:['UX','Frontend'], sprint:'Sprint 12', storyPoints:8, dueDate:'2026-06-05',
    createdAt:'2026-05-20', comments:[
      { id:'c1', author:TEAM[0], text:'Aprovei o wireframe. Pode seguir com o desenvolvimento.', time:'há 2 dias' },
      { id:'c2', author:TEAM[2], text:'Implementando os componentes base. Previsão de PR até amanhã.', time:'há 1 dia' },
    ], projectId:'p1', estimate:'3 dias'
  },
  {
    id:'i2', key:'KF-6', title:'Migração do banco de dados para v2', description:'Migrar schema do banco de dados para nova versão com suporte a multi-tenant. Criar scripts de rollback.',
    type:'task', status:'in_progress', priority:'high', assignee:TEAM[4],
    labels:['Backend','Database'], sprint:'Sprint 12', storyPoints:13, dueDate:'2026-06-03',
    createdAt:'2026-05-18', comments:[], projectId:'p1', estimate:'5 dias'
  },
  {
    id:'i3', key:'KF-5', title:'Patch de segurança no módulo de autenticação', description:'Vulnerabilidade CVE-2026-1234 identificada. Atualizar dependências e corrigir fluxo de token refresh.',
    type:'bug', status:'in_progress', priority:'critical', assignee:TEAM[1],
    labels:['Segurança','Backend'], sprint:'Sprint 12', storyPoints:5, dueDate:'2026-05-31',
    createdAt:'2026-05-27', comments:[
      { id:'c3', author:TEAM[0], text:'URGENTE: CVE crítico. Prioridade máxima.', time:'há 4 horas' },
    ], projectId:'p1', estimate:'1 dia'
  },
  {
    id:'i4', key:'KF-4', title:'Otimização de performance da API', description:'Reduzir tempo de resposta médio de 850ms para menos de 200ms. Implementar cache Redis e otimizar queries N+1.',
    type:'task', status:'review', priority:'medium', assignee:TEAM[3],
    labels:['Backend','Performance'], sprint:'Sprint 12', storyPoints:8, dueDate:'2026-06-07',
    createdAt:'2026-05-15', comments:[], projectId:'p1', estimate:'PR #45 aberto'
  },
  {
    id:'i5', key:'KF-3', title:'Documentação da API v2', description:'Criar documentação completa no Swagger/OpenAPI 3.0 para todos os endpoints da v2.',
    type:'task', status:'review', priority:'low', assignee:TEAM[0],
    labels:['Docs'], sprint:'Sprint 12', storyPoints:3, dueDate:'2026-06-10',
    createdAt:'2026-05-14', comments:[], projectId:'p1'
  },
  {
    id:'i6', key:'KF-9', title:'Refatoração do gateway de pagamento', description:'Substituir integração legada com novo provedor. Suporte a PIX, boleto e cartão.',
    type:'feature', status:'todo', priority:'high', assignee:TEAM[2],
    labels:['Frontend','Pagamentos'], sprint:'Sprint 12', storyPoints:13, dueDate:'2026-06-15',
    createdAt:'2026-05-22', comments:[], projectId:'p1'
  },
  {
    id:'i7', key:'KF-8', title:'Templates de notificação por e-mail', description:'Criar 12 templates responsivos para fluxos de notificação (onboarding, alertas, relatórios).',
    type:'task', status:'todo', priority:'medium', assignee:TEAM[1],
    labels:['Email','Design'], sprint:'Sprint 12', storyPoints:5, dueDate:'2026-06-12',
    createdAt:'2026-05-21', comments:[], projectId:'p1'
  },
  {
    id:'i8', key:'KF-12', title:'Integração com SSO corporativo', description:'Suporte a SAML 2.0 e OIDC para autenticação empresarial com AD/LDAP.',
    type:'feature', status:'backlog', priority:'medium', labels:['Backend','Auth'],
    storyPoints:21, createdAt:'2026-05-10', comments:[], projectId:'p1'
  },
  {
    id:'i9', key:'KF-11', title:'Modo escuro no mobile', description:'Implementar dark mode nativo para iOS e Android seguindo as guidelines de cada plataforma.',
    type:'feature', status:'backlog', priority:'low', labels:['Mobile','UX'],
    storyPoints:8, createdAt:'2026-05-08', comments:[], projectId:'p1'
  },
  {
    id:'i10', key:'KF-10', title:'Rate limiting na API pública', description:'Implementar throttling por IP e por API key com limites configuráveis por plano.',
    type:'task', status:'backlog', priority:'high', labels:['Backend','Segurança'],
    storyPoints:8, createdAt:'2026-05-07', comments:[], projectId:'p1'
  },
  {
    id:'i11', key:'KF-2', title:'Redesign da página de login', description:'',
    type:'feature', status:'done', priority:'medium', assignee:TEAM[2],
    labels:['Frontend','UX'], sprint:'Sprint 11', storyPoints:5,
    createdAt:'2026-05-01', comments:[], projectId:'p1'
  },
  {
    id:'i12', key:'KF-1', title:'Setup inicial do projeto', description:'',
    type:'task', status:'done', priority:'low', assignee:TEAM[0],
    labels:['Setup'], sprint:'Sprint 11', storyPoints:2,
    createdAt:'2026-04-25', comments:[], projectId:'p1'
  },
  {
    id:'i13', key:'KF-13', title:'Bug: crash no iOS 17.4 ao abrir notificações', description:'App crasha ao receber push notification no iOS 17.4. Erro: NSInvalidArgumentException.',
    type:'bug', status:'blocked', priority:'critical', assignee:TEAM[4],
    labels:['Mobile','Bug'], sprint:'Sprint 12', storyPoints:3, dueDate:'2026-06-01',
    createdAt:'2026-05-26', comments:[
      { id:'c4', author:TEAM[4], text:'Bloqueado aguardando acesso ao device log do cliente.', time:'há 6 horas' },
    ], projectId:'p1'
  },
];

const WORKFLOWS: Workflow[] = [
  { id:'w1', name:'Bug Crítico — Resposta Automática', description:'Detecta bugs críticos e ativa protocolo de resposta imediata com notificações em cascata',
    trigger:'Issue criada (prioridade=crítica)', actionsCount:5, isActive:true, lastRun:'há 2 horas', executions:47 },
  { id:'w2', name:'Sprint Planning Automático', description:'Ao iniciar sprint, distribui issues por capacidade do time e envia agenda para cada membro',
    trigger:'Sprint iniciada', actionsCount:4, isActive:true, lastRun:'há 3 dias', executions:12 },
  { id:'w3', name:'SLA Monitor — Escalação', description:'Monitora SLAs e escala automaticamente quando dentro de 80% do prazo sem resposta',
    trigger:'A cada hora (cron)', actionsCount:3, isActive:true, lastRun:'há 1 hora', executions:312 },
  { id:'w4', name:'Deploy → Notificação Slack', description:'Notifica canal #deploys com changelog automático quando PR é mergeado na main',
    trigger:'PR mergeado na main', actionsCount:2, isActive:true, lastRun:'há 5 horas', executions:89 },
  { id:'w5', name:'Onboarding de Cliente', description:'Cria conjunto de tarefas padrão para novos clientes com responsáveis e datas automáticos',
    trigger:'Novo cliente cadastrado (CRM)', actionsCount:8, isActive:false, executions:0 },
];

const VELOCITY_DATA = [
  { sprint:'S8', planejado:32, entregue:28 }, { sprint:'S9', planejado:35, entregue:33 },
  { sprint:'S10', planejado:40, entregue:38 }, { sprint:'S11', planejado:38, entregue:41 },
  { sprint:'S12', planejado:42, entregue:18 },
];
const BURNDOWN_DATA = [
  { day:'1', ideal:42, real:42 }, { day:'3', ideal:35, real:37 }, { day:'5', ideal:28, real:30 },
  { day:'7', ideal:21, real:24 }, { day:'9', ideal:14, real:20 }, { day:'11', ideal:7, real:16 },
  { day:'13', ideal:0, real:12 },
];
const STATUS_DIST = [
  { name:'Backlog', value:3, color:'#94a3b8' }, { name:'A Fazer', value:2, color:'#60a5fa' },
  { name:'Em Progresso', value:3, color:'#818cf8' }, { name:'Revisão', value:2, color:'#c084fc' },
  { name:'Bloqueado', value:1, color:'#f87171' }, { name:'Concluído', value:2, color:'#4ade80' },
];
const ACTIVITY_FEED = [
  { user:TEAM[1], action:'moveu', target:'KF-5', to:'Em Progresso', time:'há 2 min', color:'#06b6d4' },
  { user:TEAM[2], action:'comentou em', target:'KF-7', to:'', time:'há 15 min', color:'#f59e0b' },
  { user:TEAM[4], action:'criou', target:'KF-13', to:'', time:'há 1 hora', color:'#ef4444' },
  { user:TEAM[3], action:'fechou', target:'KF-4', to:'Revisão', time:'há 2 horas', color:'#10b981' },
  { user:TEAM[0], action:'aprovou PR em', target:'KF-7', to:'', time:'há 3 horas', color:'#6366f1' },
  { user:TEAM[1], action:'estimou', target:'KF-8', to:'5 pts', time:'há 4 horas', color:'#06b6d4' },
];

// ─── UTILS ────────────────────────────────────────────────────────────────────
const priorityLabel: Record<Priority, string> = { critical:'Crítico', high:'Alto', medium:'Médio', low:'Baixo' };
const statusLabel: Record<IssueStatus, string> = {
  backlog:'Backlog', todo:'A Fazer', in_progress:'Em Progresso',
  review:'Revisão', done:'Concluído', blocked:'Bloqueado'
};
const typeIcon: Record<IssueType, React.ReactElement> = {
  bug: <Bug size={12} className="text-red-500" />,
  feature: <Star size={12} className="text-indigo-500" />,
  task: <CheckSquare size={12} className="text-blue-500" />,
  epic: <Zap size={12} className="text-purple-500" />,
  story: <BookOpen size={12} className="text-green-500" />,
};

function Avatar({ member, size=8 }: { member: TeamMember; size?: number }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0`}
      style={{ backgroundColor: member.color, fontSize: size <= 7 ? 10 : 12 }}
      title={member.name}
    >
      {member.initials}
    </div>
  );
}

function PriorityBadge({ priority }: { priority: Priority }) {
  const cls: Record<Priority, string> = {
    critical: 'bg-red-100 text-red-700 border border-red-200',
    high:     'bg-orange-100 text-orange-700 border border-orange-200',
    medium:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
    low:      'bg-green-100 text-green-700 border border-green-200',
  };
  const dot: Record<Priority, string> = { critical:'bg-red-500', high:'bg-orange-500', medium:'bg-yellow-500', low:'bg-green-500' };
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${cls[priority]}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dot[priority]}`} />
      {priorityLabel[priority]}
    </span>
  );
}

function StatusBadge({ status }: { status: IssueStatus }) {
  const cls: Record<IssueStatus, string> = {
    backlog:     'bg-slate-100 text-slate-600',
    todo:        'bg-blue-100 text-blue-700',
    in_progress: 'bg-indigo-100 text-indigo-700',
    review:      'bg-purple-100 text-purple-700',
    done:        'bg-green-100 text-green-700',
    blocked:     'bg-red-100 text-red-700',
  };
  const icons: Record<IssueStatus, React.ReactElement> = {
    backlog:     <Circle size={10} />,
    todo:        <Circle size={10} className="fill-current" />,
    in_progress: <RotateCcw size={10} />,
    review:      <Timer size={10} />,
    done:        <CheckCircle2 size={10} />,
    blocked:     <XCircle size={10} />,
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls[status]}`}>
      {icons[status]} {statusLabel[status]}
    </span>
  );
}

// ─── LOGIN VIEW ───────────────────────────────────────────────────────────────
function LoginView({ onLogin }: { onLogin: () => void }) {
  const [loading, setLoading] = useState(false);
  const handleLogin = () => { setLoading(true); setTimeout(onLogin, 1200); };
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)' }}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-10"
            style={{
              width: `${200 + i * 80}px`, height: `${200 + i * 80}px`,
              background: 'radial-gradient(circle, #6366f1, transparent)',
              top: `${10 + i * 15}%`, left: `${5 + i * 18}%`,
              animation: `pulse-soft ${3 + i * 0.5}s infinite`,
              animationDelay: `${i * 0.3}s`
            }}
          />
        ))}
      </div>
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Zap size={24} className="text-white" fill="white" />
            </div>
            <div className="text-left">
              <div className="text-white text-2xl font-bold">K-Flow</div>
              <div className="text-indigo-300 text-xs">by K4 Systems</div>
            </div>
          </div>
          <h1 className="text-white text-3xl font-bold mb-2">Gestão inteligente,<br />sem a complexidade</h1>
          <p className="text-slate-400 text-sm">O poder do Jira. A simplicidade que faltava.</p>
        </div>
        <div className="glass rounded-2xl p-8 shadow-2xl">
          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-slate-700 text-sm font-medium mb-1.5">E-mail</label>
              <input type="email" defaultValue="fernandobbellini@gmail.com"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
            <div>
              <label className="block text-slate-700 text-sm font-medium mb-1.5">Senha</label>
              <input type="password" defaultValue="••••••••"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 text-sm focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
            </div>
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-semibold text-sm shadow-lg shadow-indigo-500/30 hover:opacity-90 transition-all disabled:opacity-70 flex items-center justify-center gap-2">
            {loading ? <><RefreshCw size={16} className="animate-spin" /> Entrando...</> : <>Entrar no K-Flow <ArrowRight size={16} /></>}
          </button>
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-xs">ou</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>
          <button onClick={handleLogin} disabled={loading}
            className="w-full py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-medium text-sm hover:bg-slate-50 transition flex items-center justify-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Continuar com Google
          </button>
        </div>
        <div className="mt-6 grid grid-cols-3 gap-4 text-center">
          {[['10x','Mais Rápido que Jira'],['99.9%','Uptime SLA'],['IA','Nativa em Tudo']].map(([val, label]) => (
            <div key={val} className="glass rounded-xl p-3">
              <div className="text-white font-bold text-lg">{val}</div>
              <div className="text-slate-400 text-xs">{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function Sidebar({ view, setView, collapsed, setCollapsed, currentProject, setCurrentProject }:
  { view: View; setView: (v: View) => void; collapsed: boolean; setCollapsed: (c: boolean) => void; currentProject: Project; setCurrentProject: (p: Project) => void; }) {
  const navItems: { icon: React.ReactElement; label: string; view: View; badge?: number }[] = [
    { icon: <LayoutDashboard size={18} />, label: 'Dashboard', view: 'dashboard' },
    { icon: <Kanban size={18} />, label: 'Board Kanban', view: 'kanban' },
    { icon: <ListTodo size={18} />, label: 'Backlog', view: 'backlog' },
    { icon: <GitBranch size={18} />, label: 'Workflows', view: 'workflows' },
    { icon: <BarChart3 size={18} />, label: 'Relatórios', view: 'reports' },
    { icon: <Sparkles size={18} />, label: 'IA Copilot', view: 'ai', badge: 3 },
  ];
  return (
    <div className={`flex flex-col h-full bg-slate-900 transition-all duration-300 ${collapsed ? 'w-16' : 'w-60'}`}>
      <div className="flex items-center justify-between px-4 py-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <Zap size={16} className="text-white" fill="white" />
            </div>
            <span className="text-white font-bold text-base">K-Flow</span>
          </div>
        )}
        {collapsed && <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mx-auto"><Zap size={16} className="text-white" fill="white" /></div>}
        {!collapsed && <button onClick={() => setCollapsed(true)} className="text-slate-500 hover:text-slate-300 transition"><PanelLeft size={16} /></button>}
      </div>
      {!collapsed && (
        <div className="px-3 py-3 border-b border-slate-800">
          <button className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition group">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded" style={{ background: currentProject.color }} />
              <span className="text-slate-200 text-sm font-medium truncate">{currentProject.name}</span>
            </div>
            <ChevronDown size={14} className="text-slate-500 group-hover:text-slate-300 transition" />
          </button>
          <div className="mt-2 space-y-0.5">
            {PROJECTS.map(p => p.id !== currentProject.id && (
              <button key={p.id} onClick={() => setCurrentProject(p)}
                className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-800 transition text-left">
                <div className="w-3 h-3 rounded-sm" style={{ background: p.color }} />
                <span className="text-slate-400 text-xs">{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <nav className="flex-1 px-2 py-3 space-y-0.5">
        {navItems.map(item => (
          <button key={item.view} onClick={() => setView(item.view)}
            className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition text-sm font-medium relative
              ${view === item.view ? 'active text-indigo-400 bg-indigo-500/10' : 'text-slate-400 hover:text-slate-200'}`}>
            <span className={view === item.view ? 'text-indigo-400' : ''}>{item.icon}</span>
            {!collapsed && <span>{item.label}</span>}
            {!collapsed && item.badge && (
              <span className="ml-auto bg-indigo-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{item.badge}</span>
            )}
          </button>
        ))}
      </nav>
      <div className="px-2 py-3 border-t border-slate-800 space-y-0.5">
        <button onClick={() => setView('projects')}
          className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
            ${view === 'projects' ? 'active text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>
          <FolderKanban size={18} />
          {!collapsed && 'Projetos'}
        </button>
        <button onClick={() => setView('settings')}
          className={`sidebar-item w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition
            ${view === 'settings' ? 'active text-indigo-400' : 'text-slate-400 hover:text-slate-200'}`}>
          <Settings size={18} />
          {!collapsed && 'Configurações'}
        </button>
        {!collapsed && (
          <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
            <Avatar member={TEAM[0]} size={8} />
            <div className="flex-1 min-w-0">
              <div className="text-slate-200 text-xs font-medium truncate">{TEAM[0].name}</div>
              <div className="text-slate-500 text-xs">{TEAM[0].role}</div>
            </div>
          </div>
        )}
      </div>
      {collapsed && (
        <div className="px-2 pb-3">
          <button onClick={() => setCollapsed(false)} className="w-full flex items-center justify-center py-2 text-slate-500 hover:text-slate-300 transition">
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({ view, onCreateIssue }: { view: View; onCreateIssue: () => void }) {
  const titles: Record<View, string> = {
    dashboard:'Dashboard', kanban:'Board Kanban', backlog:'Backlog',
    workflows:'Workflows & Automação', reports:'Relatórios & Analytics',
    ai:'IA Copilot', projects:'Projetos', settings:'Configurações'
  };
  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 flex-shrink-0">
      <h1 className="font-semibold text-slate-800 text-base">{titles[view]}</h1>
      <div className="flex items-center gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input placeholder="Buscar issues, projetos..." className="w-56 pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-600 focus:outline-none focus:border-indigo-300" />
        </div>
        <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition">
          <Bell size={18} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
        </button>
        <button onClick={onCreateIssue}
          className="flex items-center gap-2 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg text-sm font-medium transition shadow-sm shadow-indigo-200">
          <Plus size={16} /> Nova Issue
        </button>
      </div>
    </div>
  );
}

// ─── DASHBOARD VIEW ───────────────────────────────────────────────────────────
function DashboardView({ issues, onSelectIssue }: { issues: Issue[]; onSelectIssue: (i: Issue) => void }) {
  const critical = issues.filter(i => i.priority === 'critical' && i.status !== 'done').length;
  const inProgress = issues.filter(i => i.status === 'in_progress').length;
  const blocked = issues.filter(i => i.status === 'blocked').length;
  const done = issues.filter(i => i.status === 'done').length;
  return (
    <div className="p-6 space-y-6 fade-in overflow-auto h-full">
      {/* AI Greeting */}
      <div className="rounded-2xl p-5 text-white relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6366f1 100%)' }}>
        <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, white, transparent)', transform: 'translate(30%, -30%)' }} />
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="opacity-80" />
              <span className="text-indigo-200 text-xs font-medium uppercase tracking-wide">IA Insights</span>
            </div>
            <h2 className="text-xl font-bold mb-1">Bom dia, Fernando!</h2>
            <p className="text-indigo-100 text-sm max-w-xl leading-relaxed">
              Você tem <strong>{critical} issues críticos</strong> abertos e <strong>{blocked} bloqueados</strong> hoje.
              O sprint está a <strong>43% do progresso</strong> com 4 dias restantes.
              A IA identificou que <strong>KF-5</strong> (patch de segurança) precisa de atenção urgente — vulnerabilidade CVE não corrigida há 2 dias.
            </p>
          </div>
          <div className="flex-shrink-0 ml-4">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Bot size={24} className="text-white" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-4">
          <button className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm text-white transition backdrop-blur">
            Ver issues críticos
          </button>
          <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-sm text-white transition">
            Gerar relatório do sprint
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label:'Em Progresso', value:inProgress, icon:<Activity size={20}/>, color:'text-indigo-600', bg:'bg-indigo-50', trend:'+2' },
          { label:'Críticos Abertos', value:critical, icon:<Flame size={20}/>, color:'text-red-600', bg:'bg-red-50', trend:'+1' },
          { label:'Bloqueados', value:blocked, icon:<XCircle size={20}/>, color:'text-orange-600', bg:'bg-orange-50', trend:'0' },
          { label:'Concluídos (Sprint)', value:done, icon:<CheckCircle2 size={20}/>, color:'text-green-600', bg:'bg-green-50', trend:'+3' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-10 h-10 ${kpi.bg} rounded-xl flex items-center justify-center ${kpi.color}`}>
                {kpi.icon}
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                kpi.trend.startsWith('+') ? 'bg-green-100 text-green-700' :
                kpi.trend === '0' ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-700'
              }`}>{kpi.trend} hoje</span>
            </div>
            <div className="text-3xl font-bold text-slate-800">{kpi.value}</div>
            <div className="text-slate-500 text-sm mt-0.5">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts + Activity */}
      <div className="grid grid-cols-3 gap-4">
        {/* Velocity */}
        <div className="col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800">Velocidade do Time</h3>
              <p className="text-slate-400 text-xs mt-0.5">Story points planejados vs entregues</p>
            </div>
            <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">Últimos 5 sprints</span>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={VELOCITY_DATA} barSize={16} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="sprint" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="planejado" fill="#e0e7ff" radius={[4,4,0,0]} name="Planejado" />
              <Bar dataKey="entregue" fill="#6366f1" radius={[4,4,0,0]} name="Entregue" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4">Distribuição de Status</h3>
          <ResponsiveContainer width="100%" height={120}>
            <PieChart>
              <Pie data={STATUS_DIST} cx="50%" cy="50%" innerRadius={35} outerRadius={55}
                dataKey="value" stroke="none">
                {STATUS_DIST.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-1.5 mt-2">
            {STATUS_DIST.map(s => (
              <div key={s.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                  <span className="text-slate-600">{s.name}</span>
                </div>
                <span className="font-medium text-slate-700">{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Activity + Critical Issues */}
      <div className="grid grid-cols-2 gap-4">
        {/* Activity Feed */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Activity size={16} className="text-indigo-500" /> Atividade Recente
          </h3>
          <div className="space-y-3">
            {ACTIVITY_FEED.map((act, i) => (
              <div key={i} className="flex items-start gap-3">
                <Avatar member={act.user} size={7} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">
                    <span className="font-medium">{act.user.name.split(' ')[0]}</span>
                    {' '}{act.action}{' '}
                    <button className="font-medium text-indigo-600 hover:underline">{act.target}</button>
                    {act.to && <> → <span className="font-medium text-slate-600">{act.to}</span></>}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">{act.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Critical Issues */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" /> Requer Atenção
          </h3>
          <div className="space-y-2">
            {issues.filter(i => (i.priority === 'critical' || i.status === 'blocked') && i.status !== 'done').map(issue => (
              <button key={issue.id} onClick={() => onSelectIssue(issue)}
                className="w-full flex items-start gap-3 p-3 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition text-left group">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                  issue.status === 'blocked' ? 'bg-red-500' : 'bg-orange-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-slate-400 font-mono">{issue.key}</span>
                    <PriorityBadge priority={issue.priority} />
                    {issue.status === 'blocked' && <StatusBadge status="blocked" />}
                  </div>
                  <p className="text-sm text-slate-700 font-medium truncate group-hover:text-indigo-700">{issue.title}</p>
                  {issue.assignee && (
                    <div className="flex items-center gap-1 mt-1">
                      <Avatar member={issue.assignee} size={5} />
                      <span className="text-xs text-slate-400">{issue.assignee.name}</span>
                    </div>
                  )}
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-indigo-400 transition mt-0.5 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── ISSUE CARD ───────────────────────────────────────────────────────────────
function IssueCard({ issue, onClick }: { issue: Issue; onClick: () => void }) {
  return (
    <div onClick={onClick} className="card-drag bg-white rounded-xl border border-slate-100 p-3 shadow-sm cursor-pointer group">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          {typeIcon[issue.type]}
          <span className="text-xs text-slate-400 font-mono">{issue.key}</span>
        </div>
        <button className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-slate-600 transition">
          <MoreHorizontal size={14} />
        </button>
      </div>
      <p className="text-sm font-medium text-slate-800 leading-snug mb-2 group-hover:text-indigo-700 transition line-clamp-2">{issue.title}</p>
      <div className="flex flex-wrap gap-1 mb-2">
        <PriorityBadge priority={issue.priority} />
        {issue.labels.slice(0,2).map(l => (
          <span key={l} className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-xs">{l}</span>
        ))}
      </div>
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center gap-2">
          {issue.assignee ? <Avatar member={issue.assignee} size={6} /> : <div className="w-6 h-6 rounded-full bg-slate-100 border border-dashed border-slate-300" />}
          {issue.comments.length > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <MessageSquare size={10} /> {issue.comments.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {issue.storyPoints && (
            <span className="text-xs text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{issue.storyPoints}pt</span>
          )}
          {issue.dueDate && (
            <span className="flex items-center gap-0.5 text-xs text-slate-400">
              <Calendar size={10} /> {issue.dueDate.slice(5)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── KANBAN VIEW ──────────────────────────────────────────────────────────────
const COLUMNS: { status: IssueStatus; label: string; color: string }[] = [
  { status:'backlog',     label:'Backlog',       color:'#94a3b8' },
  { status:'todo',        label:'A Fazer',        color:'#60a5fa' },
  { status:'in_progress', label:'Em Progresso',   color:'#818cf8' },
  { status:'review',      label:'Revisão',        color:'#c084fc' },
  { status:'blocked',     label:'Bloqueado',      color:'#f87171' },
  { status:'done',        label:'Concluído',      color:'#4ade80' },
];

function KanbanView({ issues, setIssues, onSelectIssue, onCreateIssue }:
  { issues: Issue[]; setIssues: (fn: (prev: Issue[]) => Issue[]) => void; onSelectIssue: (i: Issue) => void; onCreateIssue: () => void }) {
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<IssueStatus | null>(null);

  const handleDrop = (status: IssueStatus) => {
    if (!dragging) return;
    setIssues(prev => prev.map(i => i.id === dragging ? { ...i, status } : i));
    setDragging(null); setDragOver(null);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-3 bg-white border-b border-slate-100 flex-shrink-0">
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
          <Filter size={14} /> Filtrar
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
          <Users size={14} /> Time
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">
          <Tag size={14} /> Labels
        </button>
        <div className="h-4 w-px bg-slate-200 mx-1" />
        <div className="flex -space-x-1.5">
          {TEAM.map(m => <Avatar key={m.id} member={m} size={7} />)}
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
          <Sparkles size={12} className="text-indigo-400" />
          <span className="text-indigo-500 font-medium">IA: Sprint termina em 4 dias — 57% do trabalho pendente</span>
        </div>
      </div>
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {COLUMNS.map(col => {
            const colIssues = issues.filter(i => i.status === col.status);
            return (
              <div key={col.status}
                className={`kanban-col flex flex-col w-72 rounded-2xl transition ${dragOver === col.status ? 'bg-indigo-50 ring-2 ring-indigo-300 ring-offset-2' : 'bg-slate-50'}`}
                onDragOver={e => { e.preventDefault(); setDragOver(col.status); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(col.status)}>
                <div className="flex items-center justify-between px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: col.color }} />
                    <span className="text-sm font-semibold text-slate-700">{col.label}</span>
                    <span className="text-xs text-slate-400 bg-white px-1.5 py-0.5 rounded-full border border-slate-200">{colIssues.length}</span>
                  </div>
                  <button onClick={onCreateIssue} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded-lg transition">
                    <Plus size={14} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">
                  {colIssues.map(issue => (
                    <div key={issue.id} draggable
                      onDragStart={() => setDragging(issue.id)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}>
                      <IssueCard issue={issue} onClick={() => onSelectIssue(issue)} />
                    </div>
                  ))}
                  {colIssues.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-slate-300">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center mb-2">
                        <Plus size={18} />
                      </div>
                      <span className="text-xs">Arraste aqui ou crie</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ISSUE MODAL ──────────────────────────────────────────────────────────────
function IssueModal({ issue, onClose, onUpdate }:
  { issue: Issue; onClose: () => void; onUpdate: (updated: Issue) => void }) {
  const [newComment, setNewComment] = useState('');
  const [aiSuggest, setAiSuggest] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState('');
  const [localIssue, setLocalIssue] = useState(issue);

  const addComment = () => {
    if (!newComment.trim()) return;
    const updated = { ...localIssue, comments: [...localIssue.comments, { id: `c${Date.now()}`, author: TEAM[0], text: newComment, time: 'agora' }] };
    setLocalIssue(updated); onUpdate(updated); setNewComment('');
  };

  const askAI = async () => {
    setAiLoading(true); setAiSuggest(true); setAiText('');
    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setTimeout(() => { setAiText(`**Análise de IA para ${issue.key}:**\n\nEsta issue tem prioridade **${priorityLabel[issue.priority]}** e está em **${statusLabel[issue.status]}**.\n\n**Sugestões:**\n- Verificar se há dependências bloqueando o progresso\n- Estimar impacto no sprint atual (${issue.storyPoints} pts comprometidos)\n- Sugerir pair programming com ${TEAM[1].name}\n\n**Risco:** Alto — ${issue.dueDate ? `prazo em ${issue.dueDate}` : 'sem prazo definido'}.`); setAiLoading(false); }, 1200);
      return;
    }
    try {
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash',
        contents: `Analise esta issue de gestão de projetos e dê sugestões objetivas em português:\nTítulo: ${issue.title}\nStatus: ${statusLabel[issue.status]}\nPrioridade: ${priorityLabel[issue.priority]}\nDescrição: ${issue.description || 'Sem descrição'}\n\nForneça: 1) Análise do estado atual 2) Riscos identificados 3) Próximos passos recomendados (máximo 3 bullets cada seção, seja conciso)`
      });
      let text = '';
      for await (const chunk of res) { text += (chunk as any).text ?? ''; setAiText(text); }
    } catch { setAiText('Erro ao conectar com a IA. Verifique sua VITE_GEMINI_API_KEY.'); }
    setAiLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex overflow-hidden">
        {/* Left — Main content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center gap-2 mb-3">
            {typeIcon[localIssue.type]}
            <span className="text-xs text-slate-400 font-mono">{localIssue.key}</span>
            <StatusBadge status={localIssue.status} />
            <PriorityBadge priority={localIssue.priority} />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-3">{localIssue.title}</h2>
          <div className="prose prose-sm max-w-none text-slate-600 mb-4 leading-relaxed bg-slate-50 rounded-xl p-4 min-h-16">
            {localIssue.description || <span className="text-slate-400 italic">Sem descrição</span>}
          </div>

          {/* AI Analysis Panel */}
          {aiSuggest && (
            <div className="mb-4 border border-indigo-100 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                <Bot size={14} className="text-indigo-500" />
                <span className="text-sm font-medium text-indigo-700">Análise da IA</span>
                {aiLoading && <RefreshCw size={12} className="text-indigo-400 animate-spin ml-auto" />}
              </div>
              <div className="p-4 text-sm text-slate-700">
                {aiLoading && !aiText && <div className="text-slate-400 pulse-soft">Analisando issue...</div>}
                <ReactMarkdown>{aiText}</ReactMarkdown>
              </div>
            </div>
          )}

          <button onClick={askAI} className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl text-sm font-medium transition mb-6">
            <Sparkles size={14} /> {aiSuggest ? 'Reanalisar com IA' : 'Analisar com IA'}
          </button>

          {/* Comments */}
          <div>
            <h3 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <MessageSquare size={14} className="text-slate-400" /> Comentários ({localIssue.comments.length})
            </h3>
            <div className="space-y-3 mb-4">
              {localIssue.comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <Avatar member={c.author} size={7} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-700">{c.author.name}</span>
                      <span className="text-xs text-slate-400">{c.time}</span>
                    </div>
                    <div className="text-sm text-slate-600 bg-slate-50 rounded-xl px-3 py-2">{c.text}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Avatar member={TEAM[0]} size={7} />
              <div className="flex-1 flex gap-2">
                <input value={newComment} onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addComment()}
                  placeholder="Adicionar comentário..."
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300" />
                <button onClick={addComment} className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition">
                  <Send size={14} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right — Metadata */}
        <div className="w-72 bg-slate-50 border-l border-slate-100 p-5 overflow-y-auto flex-shrink-0">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-slate-700 text-sm">Detalhes</h3>
            <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition">
              <X size={16} />
            </button>
          </div>
          {[
            { label:'Status', content:<StatusBadge status={localIssue.status} /> },
            { label:'Prioridade', content:<PriorityBadge priority={localIssue.priority} /> },
            { label:'Responsável', content: localIssue.assignee ? (
              <div className="flex items-center gap-2">
                <Avatar member={localIssue.assignee} size={6} />
                <span className="text-sm text-slate-700">{localIssue.assignee.name}</span>
              </div>
            ) : <span className="text-sm text-slate-400">Não atribuído</span> },
            { label:'Sprint', content: <span className="text-sm text-slate-700">{localIssue.sprint || '—'}</span> },
            { label:'Story Points', content: <span className="text-sm text-slate-700">{localIssue.storyPoints || '—'} pts</span> },
            { label:'Prazo', content: <span className="text-sm text-slate-700">{localIssue.dueDate || '—'}</span> },
            { label:'Criado em', content: <span className="text-sm text-slate-700">{localIssue.createdAt}</span> },
          ].map(f => (
            <div key={f.label} className="mb-4">
              <div className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">{f.label}</div>
              {f.content}
            </div>
          ))}
          {localIssue.labels.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-slate-400 mb-1 font-medium uppercase tracking-wide">Labels</div>
              <div className="flex flex-wrap gap-1">
                {localIssue.labels.map(l => (
                  <span key={l} className="px-2 py-0.5 bg-white border border-slate-200 text-slate-600 rounded text-xs">{l}</span>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-slate-200 pt-4 mt-2 space-y-2">
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition">
              <Edit3 size={14} className="text-slate-400" /> Editar issue
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-white hover:shadow-sm rounded-xl transition">
              <Link2 size={14} className="text-slate-400" /> Vincular issue
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition">
              <Trash2 size={14} /> Excluir issue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CREATE ISSUE MODAL ───────────────────────────────────────────────────────
function CreateIssueModal({ onClose, onCreate }:
  { onClose: () => void; onCreate: (issue: Issue) => void }) {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<IssueType>('task');
  const [priority, setPriority] = useState<Priority>('medium');
  const [assignee, setAssignee] = useState<TeamMember | undefined>();
  const [aiEnhancing, setAiEnhancing] = useState(false);
  const [aiDesc, setAiDesc] = useState('');

  const enhanceWithAI = async () => {
    if (!title.trim()) return;
    setAiEnhancing(true);
    await new Promise(r => setTimeout(r, 1200));
    setAiDesc(`**Objetivo:** ${title}\n\n**Critérios de aceite:**\n- [ ] Implementação completa conforme especificação\n- [ ] Testes unitários com cobertura > 80%\n- [ ] Code review aprovado por 2 membros\n- [ ] Documentação atualizada\n\n**Contexto técnico:**\nIdentificado como ${priorityLabel[priority]} prioridade. Estima-se ${type === 'bug' ? '3-5' : '5-8'} horas de trabalho.\n\n*Gerado pela IA com base no título.*`);
    setAiEnhancing(false);
  };

  const handleCreate = () => {
    if (!title.trim()) return;
    const issue: Issue = {
      id: `i${Date.now()}`, key: `KF-${14 + Math.floor(Math.random()*10)}`,
      title, description: aiDesc, type, status: 'backlog', priority,
      assignee, labels: [], createdAt: new Date().toISOString().split('T')[0],
      comments: [], projectId: 'p1'
    };
    onCreate(issue); onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-800">Nova Issue</h2>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition"><X size={16} /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Tipo</label>
              <select value={type} onChange={e => setType(e.target.value as IssueType)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300">
                {(['bug','feature','task','story','epic'] as IssueType[]).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 block mb-1">Prioridade</label>
              <select value={priority} onChange={e => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300">
                {(['critical','high','medium','low'] as Priority[]).map(p => <option key={p} value={p}>{priorityLabel[p]}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Título *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Descreva brevemente a issue..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-medium text-slate-500">Descrição</label>
              <button onClick={enhanceWithAI} disabled={!title.trim() || aiEnhancing}
                className="flex items-center gap-1 px-2 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium hover:bg-indigo-100 transition disabled:opacity-50">
                {aiEnhancing ? <><RefreshCw size={10} className="animate-spin" /> Gerando...</> : <><Sparkles size={10} /> Completar com IA</>}
              </button>
            </div>
            <textarea value={aiDesc} onChange={e => setAiDesc(e.target.value)} rows={5}
              placeholder="Descrição detalhada, ou deixe a IA completar baseado no título..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300 resize-none font-mono text-xs leading-relaxed" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 block mb-1">Responsável</label>
            <div className="flex gap-2">
              {TEAM.map(m => (
                <button key={m.id} onClick={() => setAssignee(assignee?.id === m.id ? undefined : m)}
                  className={`transition ${assignee?.id === m.id ? 'ring-2 ring-indigo-400 ring-offset-1' : 'opacity-60 hover:opacity-100'} rounded-full`}>
                  <Avatar member={m} size={8} />
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-xl transition">Cancelar</button>
          <button onClick={handleCreate} disabled={!title.trim()}
            className="px-5 py-2 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 transition disabled:opacity-50">
            Criar Issue
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── BACKLOG VIEW ─────────────────────────────────────────────────────────────
function BacklogView({ issues, onSelectIssue }: { issues: Issue[]; onSelectIssue: (i: Issue) => void }) {
  const [filter, setFilter] = useState<IssueStatus | 'all'>('all');
  const filtered = filter === 'all' ? issues : issues.filter(i => i.status === filter);
  return (
    <div className="p-6 fade-in overflow-auto h-full">
      <div className="flex items-center gap-3 mb-4">
        {(['all', 'backlog', 'todo', 'in_progress', 'review', 'blocked', 'done'] as (IssueStatus | 'all')[]).map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${filter === s ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}>
            {s === 'all' ? 'Todos' : statusLabel[s as IssueStatus]}
            <span className="ml-1.5 text-xs opacity-60">
              {s === 'all' ? issues.length : issues.filter(i => i.status === s).length}
            </span>
          </button>
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100 text-xs text-slate-400 uppercase tracking-wide">
              <th className="text-left px-4 py-3">Issue</th>
              <th className="text-left px-4 py-3">Tipo</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Prioridade</th>
              <th className="text-left px-4 py-3">Responsável</th>
              <th className="text-left px-4 py-3">Sprint</th>
              <th className="text-left px-4 py-3">Pts</th>
              <th className="text-left px-4 py-3">Prazo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map(issue => (
              <tr key={issue.id} onClick={() => onSelectIssue(issue)}
                className="hover:bg-slate-50 cursor-pointer group transition">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 font-mono w-14">{issue.key}</span>
                    <span className="text-sm text-slate-700 font-medium group-hover:text-indigo-600 transition truncate max-w-64">{issue.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3"><div className="flex items-center gap-1">{typeIcon[issue.type]}<span className="text-xs text-slate-500 capitalize">{issue.type}</span></div></td>
                <td className="px-4 py-3"><StatusBadge status={issue.status} /></td>
                <td className="px-4 py-3"><PriorityBadge priority={issue.priority} /></td>
                <td className="px-4 py-3">{issue.assignee ? <div className="flex items-center gap-2"><Avatar member={issue.assignee} size={6} /><span className="text-xs text-slate-600">{issue.assignee.name.split(' ')[0]}</span></div> : <span className="text-xs text-slate-400">—</span>}</td>
                <td className="px-4 py-3"><span className="text-xs text-slate-500">{issue.sprint || '—'}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-slate-700 font-medium">{issue.storyPoints || '—'}</span></td>
                <td className="px-4 py-3"><span className="text-xs text-slate-500">{issue.dueDate?.slice(5) || '—'}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── WORKFLOW BUILDER VIEW ────────────────────────────────────────────────────
const WF_TEMPLATES = [
  { name:'Bug Crítico → Alerta', desc:'Detecta bugs críticos e notifica automaticamente o time', icon:<AlertCircle size={20} className="text-red-500" />, color:'bg-red-50 border-red-200' },
  { name:'PR Mergeado → Deploy', desc:'Pipeline automático de CI/CD ao mergear na main', icon:<GitBranch size={20} className="text-blue-500" />, color:'bg-blue-50 border-blue-200' },
  { name:'SLA Monitor', desc:'Monitora prazos e escala quando necessário', icon:<Timer size={20} className="text-orange-500" />, color:'bg-orange-50 border-orange-200' },
  { name:'Onboarding Automático', desc:'Cria tarefas padrão para novos membros do time', icon:<Users size={20} className="text-green-500" />, color:'bg-green-50 border-green-200' },
];

function WorkflowsView() {
  const [activeWf, setActiveWf] = useState<Workflow | null>(null);
  const [wfList, setWfList] = useState<Workflow[]>(WORKFLOWS);

  const toggleActive = (id: string) =>
    setWfList(prev => prev.map(w => w.id === id ? { ...w, isActive: !w.isActive } : w));

  return (
    <div className="p-6 space-y-6 fade-in overflow-auto h-full">
      {/* Header strip */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-slate-500 text-sm">Automatize processos sem código. Configure triggers, ações e condições visualmente.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition">
          <Plus size={16} /> Novo Workflow
        </button>
      </div>

      {/* AI Suggestion */}
      <div className="bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
          <Sparkles size={20} className="text-indigo-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-700">IA identificou uma oportunidade</p>
          <p className="text-sm text-slate-500">Você tem 3 bugs críticos sem owner. Quer criar um workflow de auto-atribuição baseado em expertise?</p>
        </div>
        <button className="px-4 py-2 bg-indigo-500 text-white text-sm font-medium rounded-xl hover:bg-indigo-600 transition flex-shrink-0">
          Criar Workflow
        </button>
      </div>

      {/* Templates */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Templates Prontos</h3>
        <div className="grid grid-cols-4 gap-3">
          {WF_TEMPLATES.map(t => (
            <button key={t.name} className={`text-left p-4 rounded-2xl border ${t.color} hover:shadow-md transition group`}>
              <div className="mb-2">{t.icon}</div>
              <div className="font-medium text-slate-700 text-sm mb-1">{t.name}</div>
              <div className="text-xs text-slate-500 leading-relaxed">{t.desc}</div>
              <div className="mt-3 text-xs text-indigo-600 font-medium opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                Usar template <ChevronRight size={10} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Active Workflows */}
      <div>
        <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3">Workflows Ativos</h3>
        <div className="space-y-3">
          {wfList.map(wf => (
            <div key={wf.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="flex items-center gap-4 p-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${wf.isActive ? 'bg-green-100' : 'bg-slate-100'}`}>
                  <Zap size={18} className={wf.isActive ? 'text-green-600' : 'text-slate-400'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-slate-800 text-sm">{wf.name}</h4>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${wf.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {wf.isActive ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{wf.description}</p>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0">
                  <div className="text-center">
                    <div className="text-sm font-bold text-slate-700">{wf.executions}</div>
                    <div className="text-xs text-slate-400">execuções</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500">{wf.actionsCount} ações</div>
                    <div className="text-xs text-slate-400">{wf.lastRun || 'Nunca executou'}</div>
                  </div>
                  <button onClick={() => toggleActive(wf.id)}
                    className={`p-2 rounded-xl transition ${wf.isActive ? 'bg-green-100 text-green-600 hover:bg-red-100 hover:text-red-600' : 'bg-slate-100 text-slate-500 hover:bg-green-100 hover:text-green-600'}`}>
                    {wf.isActive ? <Pause size={16} /> : <Play size={16} />}
                  </button>
                  <button onClick={() => setActiveWf(activeWf?.id === wf.id ? null : wf)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition">
                    <Edit3 size={16} />
                  </button>
                </div>
              </div>

              {/* Expanded workflow diagram */}
              {activeWf?.id === wf.id && (
                <div className="border-t border-slate-100 bg-slate-50 p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles size={12} className="text-indigo-400" />
                    <span className="text-xs text-indigo-600 font-medium">Fluxo visual (editável)</span>
                  </div>
                  <div className="flex items-center gap-3 overflow-x-auto pb-2">
                    {/* Trigger */}
                    <div className="workflow-node flex-shrink-0 bg-blue-50 border-2 border-blue-200 rounded-xl px-4 py-3 text-center min-w-32">
                      <Zap size={16} className="text-blue-500 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-blue-700">TRIGGER</div>
                      <div className="text-xs text-blue-600 mt-0.5">{wf.trigger}</div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />
                    {/* Condition */}
                    <div className="workflow-node flex-shrink-0 bg-amber-50 border-2 border-amber-200 rounded-xl px-4 py-3 text-center min-w-32">
                      <AlertCircle size={16} className="text-amber-500 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-amber-700">CONDIÇÃO</div>
                      <div className="text-xs text-amber-600 mt-0.5">Prioridade = Crítica</div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />
                    {/* Action 1 */}
                    <div className="workflow-node flex-shrink-0 bg-green-50 border-2 border-green-200 rounded-xl px-4 py-3 text-center min-w-32">
                      <Bell size={16} className="text-green-500 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-green-700">AÇÃO</div>
                      <div className="text-xs text-green-600 mt-0.5">Notificar Slack #bugs</div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />
                    {/* Action 2 */}
                    <div className="workflow-node flex-shrink-0 bg-purple-50 border-2 border-purple-200 rounded-xl px-4 py-3 text-center min-w-32">
                      <Users size={16} className="text-purple-500 mx-auto mb-1" />
                      <div className="text-xs font-semibold text-purple-700">AÇÃO</div>
                      <div className="text-xs text-purple-600 mt-0.5">Atribuir ao on-call</div>
                    </div>
                    <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />
                    {/* Add node */}
                    <div className="workflow-node flex-shrink-0 bg-white border-2 border-dashed border-slate-300 rounded-xl px-4 py-3 text-center min-w-24 cursor-pointer hover:border-indigo-300 hover:bg-indigo-50 transition">
                      <Plus size={16} className="text-slate-400 mx-auto mb-1" />
                      <div className="text-xs text-slate-400">Adicionar</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── REPORTS VIEW ─────────────────────────────────────────────────────────────
function ReportsView() {
  const [tab, setTab] = useState<'overview'|'velocity'|'burndown'|'team'>('overview');
  const teamPerf = TEAM.map(m => ({
    ...m,
    completed: Math.floor(Math.random() * 10) + 2,
    inProgress: Math.floor(Math.random() * 4) + 1,
    points: Math.floor(Math.random() * 30) + 15,
  }));
  return (
    <div className="p-6 space-y-5 fade-in overflow-auto h-full">
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {(['overview','velocity','burndown','team'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition capitalize ${tab === t ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
            {t === 'overview' ? 'Visão Geral' : t === 'velocity' ? 'Velocidade' : t === 'burndown' ? 'Burndown' : 'Time'}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[
              { label:'Issues Concluídas', value:'41', sub:'neste sprint', change:'+12%', up:true },
              { label:'Velocity Média', value:'36 pts', sub:'últimos 5 sprints', change:'+8%', up:true },
              { label:'Tempo Médio', value:'3.2 dias', sub:'para fechar issue', change:'-15%', up:true },
            ].map(s => (
              <div key={s.label} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-slate-500">{s.label}</span>
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${s.up ? 'text-green-600' : 'text-red-600'}`}>
                    {s.up ? <TrendingUp size={12} /> : <TrendingDown size={12} />} {s.change}
                  </span>
                </div>
                <div className="text-3xl font-bold text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4">Distribuição de Issues por Tipo</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={[
                { name:'Bug', value:8, color:'#ef4444' },{ name:'Feature', value:12, color:'#6366f1' },
                { name:'Task', value:15, color:'#06b6d4' },{ name:'Story', value:6, color:'#10b981' },
              ]} barSize={40}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" radius={[6,6,0,0]}>
                  {[{ color:'#ef4444' },{ color:'#6366f1' },{ color:'#06b6d4' },{ color:'#10b981' }].map((e, i) => (
                    <Cell key={i} fill={e.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {tab === 'velocity' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-1">Velocidade do Time — Últimos 5 Sprints</h3>
          <p className="text-xs text-slate-400 mb-4">Comparativo entre story points planejados e efetivamente entregues</p>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={VELOCITY_DATA} barSize={24} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="sprint" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="planejado" fill="#e0e7ff" radius={[4,4,0,0]} name="Planejado" />
              <Bar dataKey="entregue" fill="#6366f1" radius={[4,4,0,0]} name="Entregue" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'burndown' && (
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-1">Burndown — Sprint 12</h3>
          <p className="text-xs text-slate-400 mb-4">A linha real está acima do ideal — equipe está atrasada no sprint atual</p>
          <div className="flex items-center gap-4 mb-4 text-xs">
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-slate-300 rounded border-dashed" /><span className="text-slate-500">Ideal</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-0.5 bg-indigo-500 rounded" /><span className="text-slate-500">Real</span></div>
            <span className="ml-auto text-orange-500 font-medium">⚠ 12 pontos acima do ideal no dia 13</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={BURNDOWN_DATA}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value:'Dia', position:'insideBottomRight', offset:-5, fill:'#94a3b8', fontSize:11 }} />
              <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} label={{ value:'Pts restantes', angle:-90, position:'insideLeft', fill:'#94a3b8', fontSize:11 }} />
              <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }} />
              <Line type="monotone" dataKey="ideal" stroke="#cbd5e1" strokeDasharray="5 5" strokeWidth={2} dot={false} name="Ideal" />
              <Line type="monotone" dataKey="real" stroke="#6366f1" strokeWidth={2.5} dot={{ fill: '#6366f1', r: 4 }} name="Real" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {tab === 'team' && (
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            {teamPerf.map(m => (
              <div key={m.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                <Avatar member={m} size={12} />
                <div className="mt-3 font-semibold text-slate-700 text-sm">{m.name.split(' ')[0]}</div>
                <div className="text-xs text-slate-400 mb-3">{m.role}</div>
                <div className="space-y-1.5 text-left">
                  <div className="flex justify-between text-xs"><span className="text-slate-500">Concluídas</span><span className="font-medium text-green-600">{m.completed}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-500">Em progresso</span><span className="font-medium text-indigo-600">{m.inProgress}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-slate-500">Points</span><span className="font-medium text-slate-700">{m.points}</span></div>
                </div>
                <div className="mt-2">
                  <div className="text-xs text-slate-400 mb-1">{Math.round(m.completed / (m.completed + m.inProgress) * 100)}% concluído</div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${m.completed / (m.completed + m.inProgress) * 100}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── AI COPILOT VIEW ──────────────────────────────────────────────────────────
const SUGGESTIONS = [
  'Quais issues estão bloqueando o sprint?',
  'Crie uma issue para corrigir o bug de autenticação',
  'Analise a velocidade do time nos últimos 3 sprints',
  'Quem está sobrecarregado no time agora?',
  'Sugira um workflow para aprovação de PRs críticos',
  'Gere um relatório resumido do sprint atual',
];

function AICopilotView() {
  const [msgs, setMsgs] = useState<ChatMsg[]>([
    { role:'assistant', content:'Olá! Sou o **K-Flow AI Copilot**. Posso ajudar você a:\n\n- **Criar e gerenciar issues** com linguagem natural\n- **Analisar o estado do sprint** e identificar riscos\n- **Sugerir workflows** de automação personalizados\n- **Gerar relatórios** e insights de produtividade\n\nComo posso ajudar hoje?', ts: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [msgs]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput('');
    setMsgs(prev => [...prev, { role:'user', content:msg, ts:new Date() }]);
    setLoading(true);

    const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY;
    const context = `Você é o K-Flow AI Copilot, assistente de gestão de projetos integrado ao sistema K-Flow (alternativa ao Jira).
Contexto atual do projeto "K4 Platform":
- 13 issues no projeto atual
- 3 issues críticas abertas (KF-5: patch de segurança CVE, KF-7: redesign dashboard, KF-13: crash iOS)
- Sprint 12 com 4 dias restantes, 43% concluído
- Time: Fernando (Admin), Ana (Dev), Carlos (Designer), Julia (QA), Rafael (Dev)
- 1 issue bloqueada (KF-13 aguardando device log)
- Velocidade média: 36 story points/sprint

Responda de forma concisa, objetiva e em português. Use markdown quando útil. Seja proativo em identificar riscos e sugerir melhorias.

Pergunta: ${msg}`;

    if (!apiKey) {
      await new Promise(r => setTimeout(r, 1500));
      const fallbacks: Record<string, string> = {
        'block': `**Issues Bloqueadas:**\n\n🔴 **KF-13** — Crash no iOS 17.4 ao abrir notificações\n- Responsável: Rafael Costa\n- Bloqueio: aguardando device logs do cliente\n- **Recomendação:** Contactar cliente via CS para obter logs urgentemente. Rafael pode reproduzir localmente no simulador enquanto isso.\n\n⚠️ **KF-5** (risco de bloqueio) — Patch de segurança precisa de deploy urgente. Sem prazo definido para janela de manutenção.`,
        'velocidade': `**Análise de Velocidade — Últimos 5 Sprints:**\n\n| Sprint | Planejado | Entregue | Taxa |\n|--------|-----------|----------|------|\n| S8     | 32 pts    | 28 pts   | 87%  |\n| S9     | 35 pts    | 33 pts   | 94%  |\n| S10    | 40 pts    | 38 pts   | 95%  |\n| S11    | 38 pts    | 41 pts   | 108% |\n| S12    | 42 pts    | 18 pts   | 43%  |\n\n**Insight:** S11 foi excepcional. S12 está abaixo do esperado — o sprint atual com issues críticas está impactando a velocidade.\n\n**Recomendação:** Reduzir escopo do sprint ou alocar mais recursos para as issues críticas.`,
        'default': `Entendi! Com base no estado atual do **K4 Platform**, aqui está minha análise:\n\n**Sprint 12 Status:**\n- 4 dias restantes\n- 43% concluído — **abaixo do esperado** (deveríamos estar em ~65%)\n\n**Principais riscos:**\n1. 🔴 KF-5 (CVE crítico) — 2 dias sem correção\n2. 🟡 KF-7 (redesign) — maior issue do sprint, ainda em progresso\n3. 🔴 KF-13 (iOS crash) — bloqueada há 6h\n\n**Recomendação:** Priorize KF-5 hoje. É segurança e não pode esperar. Desbloqueie KF-13 contactando o cliente.\n\nPosso criar um plano de ação detalhado se precisar.`
      };
      const key = msg.toLowerCase().includes('block') ? 'block' : msg.toLowerCase().includes('velocidade') || msg.toLowerCase().includes('sprint') ? 'velocidade' : 'default';
      setMsgs(prev => [...prev, { role:'assistant', content:fallbacks[key], ts:new Date() }]);
      setLoading(false);
      return;
    }

    try {
      const ai = new GoogleGenAI({ apiKey });
      const res = await ai.models.generateContentStream({ model:'gemini-2.0-flash', contents:context });
      let text = '';
      setMsgs(prev => [...prev, { role:'assistant', content:'', ts:new Date() }]);
      for await (const chunk of res) {
        text += (chunk as any).text ?? '';
        setMsgs(prev => { const copy = [...prev]; copy[copy.length-1] = { ...copy[copy.length-1], content:text }; return copy; });
      }
    } catch { setMsgs(prev => [...prev, { role:'assistant', content:'Erro ao conectar com a IA. Verifique sua `VITE_GEMINI_API_KEY`.', ts:new Date() }]); }
    setLoading(false);
  }, [input, loading]);

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {msgs.map((msg, i) => (
          <div key={i} className={`ai-bubble flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            {msg.role === 'assistant' ? (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
              </div>
            ) : <Avatar member={TEAM[0]} size={8} />}
            <div className={`max-w-2xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              msg.role === 'user' ? 'bg-indigo-500 text-white rounded-tr-sm' : 'bg-white border border-slate-100 shadow-sm text-slate-700 rounded-tl-sm'}`}>
              {msg.role === 'assistant' ? <ReactMarkdown>{msg.content || '...'}</ReactMarkdown> : msg.content}
              {loading && i === msgs.length - 1 && msg.role === 'assistant' && !msg.content && (
                <div className="flex gap-1 items-center h-4">
                  {[0,1,2].map(j => <div key={j} className="w-1.5 h-1.5 bg-slate-300 rounded-full pulse-soft" style={{ animationDelay: `${j*0.15}s` }} />)}
                </div>
              )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="px-6 pb-2">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => sendMessage(s)} disabled={loading}
              className="flex-shrink-0 px-3 py-1.5 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-xl text-xs font-medium transition">
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-6 pb-6 pt-2">
        <div className="flex gap-3 bg-white border border-slate-200 rounded-2xl p-3 shadow-sm focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100 transition">
          <Bot size={18} className="text-indigo-400 mt-0.5 flex-shrink-0" />
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Pergunte qualquer coisa sobre seus projetos, crie issues, analise dados..."
            className="flex-1 text-sm text-slate-700 outline-none bg-transparent placeholder:text-slate-400" />
          <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
            className="p-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0">
            {loading ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
        <p className="text-center text-xs text-slate-400 mt-2">K-Flow AI · Powered by Gemini · Dados do projeto em tempo real</p>
      </div>
    </div>
  );
}

// ─── PROJECTS VIEW ────────────────────────────────────────────────────────────
function ProjectsView({ setCurrentProject, setView }:
  { setCurrentProject: (p: Project) => void; setView: (v: View) => void }) {
  return (
    <div className="p-6 fade-in overflow-auto h-full">
      <div className="flex items-center justify-between mb-6">
        <p className="text-slate-500 text-sm">Gerencie todos os projetos da organização</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl text-sm font-medium hover:bg-indigo-600 transition">
          <Plus size={16} /> Novo Projeto
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {PROJECTS.map(p => (
          <button key={p.id} onClick={() => { setCurrentProject(p); setView('kanban'); }}
            className="text-left bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-indigo-200 transition group p-5">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg"
                style={{ background: p.color }}>{p.key[0]}</div>
              <span className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">{p.key}</span>
            </div>
            <h3 className="font-bold text-slate-800 mb-1 group-hover:text-indigo-700 transition">{p.name}</h3>
            <p className="text-sm text-slate-500 mb-4">{p.description}</p>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{p.progress}% concluído</span>
                <span>{p.issueCount} issues</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all" style={{ width:`${p.progress}%`, background:p.color }} />
              </div>
              <div className="flex items-center gap-2">
                <Users size={12} className="text-slate-400" />
                <span className="text-xs text-slate-400">{p.members} membros</span>
              </div>
            </div>
          </button>
        ))}
        <button className="text-left bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 transition group p-5 flex flex-col items-center justify-center min-h-48">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 group-hover:bg-indigo-100 flex items-center justify-center mb-3 transition">
            <Plus size={24} className="text-slate-400 group-hover:text-indigo-500 transition" />
          </div>
          <span className="font-medium text-slate-500 group-hover:text-indigo-600 transition">Novo Projeto</span>
          <span className="text-xs text-slate-400 mt-1">ou deixe a IA criar baseado na sua necessidade</span>
        </button>
      </div>
    </div>
  );
}

// ─── SETTINGS VIEW ────────────────────────────────────────────────────────────
function SettingsView() {
  return (
    <div className="p-6 fade-in overflow-auto h-full">
      <div className="max-w-2xl space-y-6">
        {[
          { title:'Perfil', items:[
            { label:'Nome completo', value:'Fernando Bellini', type:'text' },
            { label:'E-mail', value:'fernandobbellini@gmail.com', type:'email' },
            { label:'Função', value:'Admin', type:'text' },
          ]},
          { title:'Integrações', items:[
            { label:'Gemini API Key', value:'', type:'password', placeholder:'VITE_GEMINI_API_KEY' },
            { label:'Slack Webhook URL', value:'', type:'text', placeholder:'https://hooks.slack.com/...' },
            { label:'GitHub Token', value:'', type:'password', placeholder:'ghp_...' },
          ]},
          { title:'Notificações', items:[] },
        ].map(section => (
          <div key={section.title} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="font-semibold text-slate-800 mb-4">{section.title}</h3>
            {section.title === 'Notificações' ? (
              <div className="space-y-3">
                {['Issues atribuídas a mim','Comentários nas minhas issues','Mudanças de status','Relatórios semanais'].map(n => (
                  <div key={n} className="flex items-center justify-between py-2">
                    <span className="text-sm text-slate-700">{n}</span>
                    <button className="w-10 h-5 bg-indigo-500 rounded-full relative transition">
                      <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5 shadow-sm" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {section.items.map(f => (
                  <div key={f.label}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                    <input type={f.type} defaultValue={f.value} placeholder={(f as any).placeholder}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-300" />
                  </div>
                ))}
              </div>
            )}
            <button className="mt-4 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition">
              Salvar {section.title}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [issues, setIssues] = useState<Issue[]>(INITIAL_ISSUES);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [currentProject, setCurrentProject] = useState<Project>(PROJECTS[0]);

  const handleCreateIssue = (issue: Issue) => setIssues(prev => [issue, ...prev]);
  const handleUpdateIssue = (updated: Issue) => setIssues(prev => prev.map(i => i.id === updated.id ? updated : i));

  if (!loggedIn) return <LoginView onLogin={() => setLoggedIn(true)} />;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar view={view} setView={setView} collapsed={collapsed} setCollapsed={setCollapsed}
        currentProject={currentProject} setCurrentProject={setCurrentProject} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header view={view} onCreateIssue={() => setShowCreate(true)} />
        <div className="flex-1 overflow-hidden">
          {view === 'dashboard' && <DashboardView issues={issues} onSelectIssue={setSelectedIssue} />}
          {view === 'kanban' && <KanbanView issues={issues.filter(i => i.projectId === currentProject.id)}
            setIssues={fn => setIssues(prev => { const updated = fn(prev.filter(i => i.projectId === currentProject.id)); return [...prev.filter(i => i.projectId !== currentProject.id), ...updated]; })}
            onSelectIssue={setSelectedIssue} onCreateIssue={() => setShowCreate(true)} />}
          {view === 'backlog' && <BacklogView issues={issues} onSelectIssue={setSelectedIssue} />}
          {view === 'workflows' && <WorkflowsView />}
          {view === 'reports' && <ReportsView />}
          {view === 'ai' && <AICopilotView />}
          {view === 'projects' && <ProjectsView setCurrentProject={setCurrentProject} setView={setView} />}
          {view === 'settings' && <SettingsView />}
        </div>
      </div>

      {selectedIssue && (
        <IssueModal issue={selectedIssue} onClose={() => setSelectedIssue(null)}
          onUpdate={updated => { handleUpdateIssue(updated); setSelectedIssue(updated); }} />
      )}
      {showCreate && (
        <CreateIssueModal onClose={() => setShowCreate(false)} onCreate={handleCreateIssue} />
      )}
    </div>
  );
}
