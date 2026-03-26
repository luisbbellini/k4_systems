import React, { useRef, useState, useEffect } from 'react';
// ...existing imports...
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  setDoc, 
  serverTimestamp,
  orderBy,
  addDoc,
  deleteDoc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { Transaction, Category, Investment, Goal, BankAccount, PaymentMethod, OperationType, FirestoreErrorInfo } from './types';
import { DEFAULT_CATEGORIES, DEFAULT_PAYMENT_METHODS } from './constants';
import { 
  LayoutDashboard, 
  PlusCircle, 
  History, 
  TrendingUp, 
  Target, 
  LogOut, 
  Wallet,
  CreditCard,
  Banknote,
  Sparkles,
  Menu,
  X,
  User as UserIcon,
  RefreshCw,
  Edit3,
  Calendar,
  Sun,
  Moon,
  Utensils,
  ShoppingBag
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  AreaChart,
  Area,
  LineChart,
  Line
} from 'recharts';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { useTheme } from './contexts/ThemeContext';

// Utility for Tailwind classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Hook para obter tamanho de um div
export function useDivSize(ref: React.RefObject<HTMLDivElement>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useEffect(() => {
    if (!ref.current) return;
    const observer = new window.ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

// Error Handler
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'investments' | 'goals' | 'ai' | 'categories' | 'accounts' | 'payment-methods'>('dashboard');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void } | null>(null);
  const { theme, toggleTheme } = useTheme();

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    let unsubscribes: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, async (currentUser) => {
      // Clean up previous listeners
      unsubscribes.forEach(unsub => unsub());
      unsubscribes = [];

      setUser(currentUser);
      setLoading(false);
      
      if (currentUser) {
        // Ensure user profile exists
        const userRef = doc(db, 'users', currentUser.uid);
        await setDoc(userRef, {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName,
          photoURL: currentUser.photoURL,
          createdAt: serverTimestamp()
        }, { merge: true });

        // Initialize default categories if none exist
        const catsQuery = query(collection(db, 'categories'), where('uid', '==', currentUser.uid));
        const unsubCats = onSnapshot(catsQuery, (snapshot) => {
          if (snapshot.empty) {
            DEFAULT_CATEGORIES.forEach(async (cat) => {
              await addDoc(collection(db, 'categories'), {
                uid: currentUser.uid,
                ...cat,
                isDefault: true
              });
            });
          } else {
            setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Category)));
          }
        }, (error) => {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.LIST, 'categories');
          }
        });
        unsubscribes.push(unsubCats);

        // Listen to transactions
        const transQuery = query(
          collection(db, 'transactions'), 
          where('uid', '==', currentUser.uid)
        );
        const unsubTrans = onSnapshot(transQuery, (snapshot) => {
          const transData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Transaction));
          // Sort client-side to avoid index requirement
          transData.sort((a, b) => {
            const dateA = a.date?.toDate ? a.date.toDate().getTime() : 0;
            const dateB = b.date?.toDate ? b.date.toDate().getTime() : 0;
            return dateB - dateA;
          });
          setTransactions(transData);
        }, (error) => {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.LIST, 'transactions');
          }
        });
        unsubscribes.push(unsubTrans);

        // Listen to investments
        const investQuery = query(collection(db, 'investments'), where('uid', '==', currentUser.uid));
        const unsubInvest = onSnapshot(investQuery, (snapshot) => {
          setInvestments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Investment)));
        }, (error) => {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.LIST, 'investments');
          }
        });
        unsubscribes.push(unsubInvest);

        // Listen to goals
        const goalsQuery = query(collection(db, 'goals'), where('uid', '==', currentUser.uid));
        const unsubGoals = onSnapshot(goalsQuery, (snapshot) => {
          setGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Goal)));
        }, (error) => {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.LIST, 'goals');
          }
        });
        unsubscribes.push(unsubGoals);

        // Listen to bank accounts
        const accountsQuery = query(collection(db, 'bankAccounts'), where('uid', '==', currentUser.uid));
        const unsubAccounts = onSnapshot(accountsQuery, (snapshot) => {
          setBankAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BankAccount)));
        }, (error) => {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.LIST, 'bankAccounts');
          }
        });
        unsubscribes.push(unsubAccounts);

        // Listen to payment methods
        const pmQuery = query(collection(db, 'paymentMethods'), where('uid', '==', currentUser.uid));
        const unsubPM = onSnapshot(pmQuery, (snapshot) => {
          if (snapshot.empty) {
            DEFAULT_PAYMENT_METHODS.forEach(async (pm) => {
              await addDoc(collection(db, 'paymentMethods'), {
                uid: currentUser.uid,
                ...pm,
                isDefault: true
              });
            });
          } else {
            setPaymentMethods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PaymentMethod)));
          }
        }, (error) => {
          if (auth.currentUser) {
            handleFirestoreError(error, OperationType.LIST, 'paymentMethods');
          }
        });
        unsubscribes.push(unsubPM);
      } else {
        // Reset state on logout
        setTransactions([]);
        setCategories([]);
        setInvestments([]);
        setGoals([]);
        setBankAccounts([]);
        setPaymentMethods([]);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribes.forEach(unsub => unsub());
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={loginWithGoogle} />;
  }

  return (
    <div className="flex h-screen bg-background text-foreground font-sans overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        user={user}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="h-16 border-b border-border flex items-center justify-between px-6 bg-background/80 backdrop-blur-md sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-foreground/5 rounded-lg transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-xl font-semibold capitalize">
              {activeTab === 'dashboard' && 'Visão Geral'}
              {activeTab === 'transactions' && 'Transações'}
              {activeTab === 'investments' && 'Investimentos'}
              {activeTab === 'goals' && 'Meus Objetivos'}
              {activeTab === 'accounts' && 'Minhas Contas'}
              {activeTab === 'ai' && 'Dicas da IA'}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-foreground/5 rounded-lg transition-colors"
              title={theme === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium">{user.displayName}</span>
              <span className="text-xs opacity-50">{user.email}</span>
            </div>
            {user.photoURL ? (
              <img src={user.photoURL} alt="Profile" className="w-10 h-10 rounded-full border border-border" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <UserIcon className="w-6 h-6" />
              </div>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <DashboardView 
                transactions={transactions} 
                investments={investments} 
                goals={goals} 
                categories={categories}
                bankAccounts={bankAccounts}
                setActiveTab={setActiveTab}
              />
            )}
            {activeTab === 'transactions' && (
              <TransactionsView 
                transactions={transactions} 
                categories={categories} 
                bankAccounts={bankAccounts}
                paymentMethods={paymentMethods}
                user={user}
                showToast={showToast}
                setConfirmDialog={setConfirmDialog}
              />
            )}
            {activeTab === 'investments' && (
              <InvestmentsView 
                investments={investments} 
                user={user}
                showToast={showToast}
                setConfirmDialog={setConfirmDialog}
              />
            )}
            {activeTab === 'goals' && (
              <GoalsView 
                goals={goals} 
                user={user}
                showToast={showToast}
                setConfirmDialog={setConfirmDialog}
              />
            )}
            {activeTab === 'accounts' && (
              <BankAccountsView 
                bankAccounts={bankAccounts} 
                user={user}
                showToast={showToast}
                setConfirmDialog={setConfirmDialog}
              />
            )}
            {activeTab === 'payment-methods' && (
              <PaymentMethodsView 
                paymentMethods={paymentMethods} 
                user={user}
                showToast={showToast}
                setConfirmDialog={setConfirmDialog}
              />
            )}
            {activeTab === 'categories' && (
              <CategoriesView 
                categories={categories} 
                user={user}
                showToast={showToast}
                setConfirmDialog={setConfirmDialog}
              />
            )}
            {activeTab === 'ai' && (
              <AITipsView 
                transactions={transactions} 
                investments={investments} 
                goals={goals}
              />
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Toast Notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border",
              toast.type === 'success' ? "bg-emerald-500 border-emerald-400 text-white" : "bg-red-500 border-red-400 text-white"
            )}
          >
            {toast.type === 'success' ? <RefreshCw className="w-5 h-5 animate-spin-slow" /> : <X className="w-5 h-5" />}
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation Dialog */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-card border border-border p-8 rounded-3xl max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="space-y-2 text-center">
                <h3 className="text-xl font-bold">Confirmar Ação</h3>
                <p className="text-muted-foreground">{confirmDialog.message}</p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 py-3 bg-muted hover:bg-foreground/5 rounded-xl font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 py-3 bg-red-500 text-white hover:bg-red-400 rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Views ---

function LoginView({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="h-screen flex items-center justify-center bg-background p-6 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-card/50 backdrop-blur-xl border border-border p-10 rounded-3xl shadow-2xl relative z-10"
      >
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="w-20 h-20 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Wallet className="w-10 h-10 text-white" />
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight">K-money</h1>
            <p className="text-muted-foreground">Controle financeiro inteligente com o poder da IA.</p>
          </div>
          <button 
            onClick={onLogin}
            className="w-full py-4 bg-foreground text-background font-semibold rounded-xl hover:bg-emerald-400 dark:hover:bg-emerald-400 transition-all flex items-center justify-center gap-3 shadow-lg hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* SVG Google válido e estático */}
            <svg className="w-6 h-6" viewBox="0 0 48 48">
              <g>
                <path fill="#4285F4" d="M43.6 20.5h-1.9V20H24v8h11.3c-1.1 3-4.1 5.2-7.3 5.2-4.4 0-8-3.6-8-8s3.6-8 8-8c1.7 0 3.3.5 4.6 1.5l6.1-6.1C36.2 9.1 30.4 7 24 7 13.5 7 5 15.5 5 26s8.5 19 19 19 19-8.5 19-19c0-1.3-.1-2.5-.4-3.5z"/>
                <path fill="#34A853" d="M24 45c5.4 0 10-1.8 13.3-4.9l-6.1-4.7c-1.7 1.1-3.9 1.8-7.2 1.8-5.5 0-10.1-3.7-11.8-8.7H5.2v5.5C8.5 41.1 15.6 45 24 45z"/>
                <path fill="#FBBC05" d="M12.2 28.2c-.4-1.1-.7-2.3-.7-3.7s.3-2.6.7-3.7v-5.5H5.2C3.8 18.7 3 22.2 3 26s.8 7.3 2.2 10.3l7-5.5z"/>
                <path fill="#EA4335" d="M24 15c3.1 0 5.2 1.3 6.4 2.4l4.8-4.8C32.7 9.1 28.7 7 24 7c-8.4 0-15.5 3.9-18.8 10.3l7 5.5C13.9 18.7 18.5 15 24 15z"/>
              </g>
            </svg>
            Entrar com Google
          </button>
          <p className="text-xs text-muted-foreground">
            Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen, user }: any) {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'transactions', label: 'Transações', icon: History },
    { id: 'accounts', label: 'Contas', icon: Wallet },
    { id: 'payment-methods', label: 'Formas de Pagamento', icon: CreditCard },
    { id: 'investments', label: 'Investimentos', icon: TrendingUp },
    { id: 'goals', label: 'Objetivos', icon: Target },
    { id: 'categories', label: 'Categorias', icon: Menu },
    { id: 'ai', label: 'Dicas IA', icon: Sparkles },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 w-72 bg-card border-r border-border z-50 transition-transform duration-300 lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                <Wallet className="w-6 h-6" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-[#53cb5f]">K-money</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 hover:bg-foreground/5 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all group",
                  activeTab === item.id 
                    ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                )}
              >
                {typeof item.icon === 'function' && (
                  <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", activeTab === item.id ? "text-white" : "text-muted-foreground")} />
                )}
                <span className="font-medium">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="pt-6 border-t border-border">
            <button 
              onClick={logout}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl text-red-400 hover:bg-red-400/10 transition-all group"
            >
              <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              <span className="font-medium">Sair</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

function DashboardView({ transactions, investments, goals, categories, bankAccounts, setActiveTab }: any) {
  // Refs para containers dos gráficos
  const mainChartRef = useRef<HTMLDivElement>(null);
  const pieChartRef = useRef<HTMLDivElement>(null);
  const monthlyRef = useRef<HTMLDivElement>(null);
  const netWorthRef = useRef<HTMLDivElement>(null);

  const mainChartSize = useDivSize(mainChartRef);
  const pieChartSize = useDivSize(pieChartRef);
  const monthlySize = useDivSize(monthlyRef);
  const netWorthSize = useDivSize(netWorthRef);
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  const [chartRange, setChartRange] = useState('7d');
  const [chartType, setChartType] = useState('area');

  const totalBalance = bankAccounts.reduce((acc: any, a: any) => acc + (a.balance || 0), 0);

  const totalInvested = investments.reduce((acc: any, i: any) => acc + (i.currentValuation || i.amount), 0);
  
  const expensesByCategory = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((acc: any, t: any) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});

  const pieData = Object.entries(expensesByCategory).map(([name, value]) => ({ name, value }));
  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

  const getChartData = () => {
    const now = new Date();
    let days = 7;
    let format: 'day' | 'month' = 'day';

    if (chartRange === '30d') days = 30;
    if (chartRange === '6m') { days = 180; format = 'month'; }
    if (chartRange === '1y') { days = 365; format = 'month'; }

    const data = [];
    if (format === 'day') {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const dayTransactions = transactions.filter((t: any) => {
          if (!t.date?.toDate) return false;
          const tDate = t.date.toDate();
          return tDate.getDate() === d.getDate() && tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
        });
        const income = dayTransactions.filter((t: any) => t.type === 'income').reduce((acc: any, t: any) => acc + t.amount, 0);
        const expense = dayTransactions.filter((t: any) => t.type === 'expense').reduce((acc: any, t: any) => acc + t.amount, 0);
        data.push({ name: label, income, expense });
      }
    } else {
      const months = chartRange === '6m' ? 6 : 12;
      for (let i = months - 1; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const label = d.toLocaleDateString('pt-BR', { month: 'short' });
        const monthTransactions = transactions.filter((t: any) => {
          if (!t.date?.toDate) return false;
          const tDate = t.date.toDate();
          return tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
        });
        const income = monthTransactions.filter((t: any) => t.type === 'income').reduce((acc: any, t: any) => acc + t.amount, 0);
        const expense = monthTransactions.filter((t: any) => t.type === 'expense').reduce((acc: any, t: any) => acc + t.amount, 0);
        data.push({ name: label, income, expense });
      }
    }
    return data;
  };

  const chartData = getChartData();

  const monthlyComparisonData = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    const monthTransactions = transactions.filter((t: any) => {
      if (!t.date?.toDate) return false;
      const tDate = t.date.toDate();
      return tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
    });
    const income = monthTransactions.filter((t: any) => t.type === 'income').reduce((acc: any, t: any) => acc + t.amount, 0);
    const expense = monthTransactions.filter((t: any) => t.type === 'expense').reduce((acc: any, t: any) => acc + t.amount, 0);
    return { name: label, income, expense };
  }).reverse();

  const netWorthData = Array.from({ length: 12 }).map((_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (11 - i));
    const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = endOfMonth.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    
    const balanceAtMonth = transactions
      .filter((t: any) => {
        if (!t.date?.toDate) return false;
        return t.date.toDate() <= endOfMonth;
      })
      .reduce((acc: any, t: any) => {
        if (t.type === 'income') return acc + t.amount;
        if (t.type === 'expense') return acc - t.amount;
        return acc;
      }, 0);
      
    const investmentsAtMonth = investments
      .filter((inv: any) => {
        const date = inv.purchaseDate?.toDate ? inv.purchaseDate.toDate() : (inv.date?.toDate ? inv.date.toDate() : null);
        return date && date <= endOfMonth;
      })
      .reduce((acc: any, inv: any) => acc + (inv.amount || 0), 0);
      
    return { name: label, netWorth: balanceAtMonth + investmentsAtMonth };
  });

  // Helper para garantir dimensões válidas
  const isValidSize = (size: { width: number; height: number }) => size && size.width > 0 && size.height > 0;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Saldo Total" 
          value={totalBalance} 
          icon={Wallet} 
          color="emerald" 
          trend="+12%" 
        />
        <StatCard 
          title="Investimentos" 
          value={totalInvested} 
          icon={TrendingUp} 
          color="blue" 
          trend="+5.4%" 
        />
        <StatCard 
          title="Despesas (Mês)" 
          value={transactions.filter((t: any) => {
            const tDate = t.date.toDate();
            const now = new Date();
            return t.type === 'expense' && 
                   tDate.getMonth() === now.getMonth() && 
                   tDate.getFullYear() === now.getFullYear();
          }).reduce((acc: any, t: any) => acc + t.amount, 0)} 
          icon={CreditCard} 
          color="red" 
          trend="-2.1%" 
        />
        <StatCard 
          title="Objetivos" 
          value={goals.reduce((acc: any, g: any) => acc + g.currentAmount, 0)} 
          icon={Target} 
          color="purple" 
          trend="+8%" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-3xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-lg font-semibold">Fluxo de Caixa</h3>
              <div className="flex gap-4 text-xs mt-1">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full" /> Receitas</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full" /> Despesas</div>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex bg-muted p-1 rounded-xl border border-border">
                {[
                  { id: '7d', label: '7D' },
                  { id: '30d', label: '30D' },
                  { id: '6m', label: '6M' },
                  { id: '1y', label: '1A' }
                ].map((range) => (
                  <button
                    key={range.id}
                    onClick={() => setChartRange(range.id)}
                    className={cn(
                      "px-3 py-1.5 text-xs font-medium rounded-lg transition-all",
                      chartRange === range.id ? "bg-emerald-500 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <div className="flex bg-muted p-1 rounded-xl border border-border">
                <button
                  onClick={() => setChartType('area')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    chartType === 'area' ? "bg-emerald-500 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Gráfico de Área"
                >
                  <TrendingUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setChartType('bar')}
                  className={cn(
                    "p-1.5 rounded-lg transition-all",
                    chartType === 'bar' ? "bg-emerald-500 text-white shadow-lg" : "text-muted-foreground hover:text-foreground"
                  )}
                  title="Gráfico de Barras"
                >
                  <LayoutDashboard className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="min-h-[350px] h-[350px] w-full" ref={mainChartRef}>
            {isClient && chartData && chartData.length > 0 && isValidSize(mainChartSize) ? (
                chartType === 'area' ? (
                  <AreaChart width={mainChartSize.width} height={mainChartSize.height} data={chartData}>
                    <defs>
                      <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--foreground)' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#colorIncome)" strokeWidth={3} />
                    <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpense)" strokeWidth={3} />
                  </AreaChart>
                ) : (
                  <BarChart width={mainChartSize.width} height={mainChartSize.height} data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--foreground)' }}
                      itemStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                )
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados para exibir o gráfico.</div>
            )}
          </div>
        </div>

        {/* Bank Accounts Summary */}
        <div className="bg-card border border-border p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold">Minhas Contas</h3>
            <button 
              onClick={() => setActiveTab('accounts')}
              className="text-emerald-500 text-sm font-medium hover:underline"
            >
              Ver todas
            </button>
          </div>
          <div className="space-y-4">
            {bankAccounts.slice(0, 4).map((acc: any) => (
              <div key={acc.id} className="flex items-center justify-between p-4 bg-muted rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${acc.color}20`, color: acc.color }}>
                    {acc.type === 'credit_card' ? <CreditCard className="w-5 h-5" /> : 
                     acc.type === 'meal_voucher' ? <Utensils className="w-5 h-5" /> :
                     acc.type === 'food_voucher' ? <ShoppingBag className="w-5 h-5" /> :
                     <Wallet className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{acc.name}</p>
                    <p className="text-[10px] text-muted-foreground uppercase">{acc.institution || 'Outros'}</p>
                  </div>
                </div>
                <p className={cn(
                  "font-bold text-sm",
                  acc.balance >= 0 ? "text-emerald-500" : "text-red-500"
                )}>
                  R$ {acc.balance.toLocaleString()}
                </p>
              </div>
            ))}
            {bankAccounts.length === 0 && (
              <div className="text-center py-10 text-white/20 text-sm">Nenhuma conta cadastrada.</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie Chart */}
        <div className="bg-card border border-border p-6 rounded-3xl">
          <h3 className="text-lg font-semibold mb-6">Gastos por Categoria</h3>
          <div className="h-[300px] w-full" ref={pieChartRef}>
            {isClient && pieData && pieData.length > 0 && isValidSize(pieChartSize) ? (
                <PieChart width={pieChartSize.width} height={pieChartSize.height}>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--foreground)' }}
                  />
                </PieChart>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados para exibir o gráfico.</div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {pieData.slice(0, 4).map((item: any, i: number) => (
              <div key={item.name + '-' + i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                  <span className="text-muted-foreground">{item.name}</span>
                </div>
                <span className="font-medium">R$ {item.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Monthly Comparison Chart */}
        <div className="lg:col-span-2 bg-card border border-border p-6 rounded-3xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold">Comparativo Mensal (12 meses)</h3>
              <p className="text-xs text-muted-foreground">Receitas vs Despesas</p>
            </div>
            <div className="flex gap-4 text-xs">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-500 rounded-full" /> Receitas</div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-red-500 rounded-full" /> Despesas</div>
            </div>
          </div>
          <div className="h-[350px] w-full" ref={monthlyRef}>
            {isClient && monthlyComparisonData && monthlyComparisonData.length > 0 && isValidSize(monthlySize) ? (
                <BarChart width={monthlySize.width} height={monthlySize.height} data={monthlyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--foreground)' }}
                    itemStyle={{ fontSize: '12px' }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString()}`, '']}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} barSize={20} />
                  <Bar dataKey="expense" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                </BarChart>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados para exibir o gráfico.</div>
            )}
          </div>
        </div>
      </div>

      {/* Net Worth Chart */}
      <div className="bg-card border border-border p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Evolução do Patrimônio Líquido</h3>
            <p className="text-xs text-muted-foreground">Saldo + Investimentos (12 meses)</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-500 font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>Patrimônio em Crescimento</span>
          </div>
        </div>
        <div className="h-[350px] w-full" ref={netWorthRef}>
          {isClient && netWorthData && netWorthData.length > 0 && isValidSize(netWorthSize) ? (
              <LineChart width={netWorthSize.width} height={netWorthSize.height} data={netWorthData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--foreground)' }}
                  itemStyle={{ fontSize: '12px' }}
                  formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Patrimônio Líquido']}
                />
                <Line 
                  type="monotone" 
                  dataKey="netWorth" 
                  stroke="#3b82f6" 
                  strokeWidth={4} 
                  dot={{ r: 6, fill: '#3b82f6', strokeWidth: 2, stroke: 'var(--card)' }}
                  activeDot={{ r: 8, strokeWidth: 0 }}
                />
              </LineChart>
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">Sem dados para exibir o gráfico.</div>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-card border border-border p-6 rounded-3xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold">Transações Recentes</h3>
          <button className="text-emerald-500 text-sm font-medium hover:underline">Ver todas</button>
        </div>
        <div className="space-y-4">
          {transactions.slice(0, 5).map((t: any, i: number) => (
            <div key={t.id + '-' + i} className="flex items-center justify-between p-4 bg-muted rounded-2xl hover:bg-foreground/5 transition-colors">
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center",
                  t.type === 'income' ? "bg-emerald-500/20 text-emerald-500" : 
                  t.type === 'expense' ? "bg-red-500/20 text-red-500" : "bg-blue-500/20 text-blue-500"
                )}>
                  {(() => {
                    const acc = bankAccounts.find((a: any) => a.id === t.accountId);
                    if (acc?.type === 'credit_card') return <CreditCard className="w-6 h-6" />;
                    if (acc?.type === 'meal_voucher') return <Utensils className="w-6 h-6" />;
                    if (acc?.type === 'food_voucher') return <ShoppingBag className="w-6 h-6" />;
                    if (acc?.type === 'cash') return <Banknote className="w-6 h-6" />;
                    return <Wallet className="w-6 h-6" />;
                  })()}
                </div>
                <div>
                  <p className="font-medium">{t.description || t.category}</p>
                  <p className="text-xs text-white/40">
                    {t.date.toDate().toLocaleDateString('pt-BR')} • {t.subcategory} • {bankAccounts.find((a: any) => a.id === t.accountId)?.name || t.accountType}
                  </p>
                </div>
              </div>
              <div className={cn(
                "font-bold",
                t.type === 'income' ? "text-emerald-500" : "text-red-500"
              )}>
                {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString()}
              </div>
            </div>
          ))}
          {transactions.length === 0 && (
            <div className="text-center py-10 text-white/20">Nenhuma transação encontrada.</div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function StatCard({ title, value, icon: Icon, color, trend }: any) {
  const colors: any = {
    emerald: "bg-emerald-500/20 text-emerald-500 border-emerald-500/20",
    blue: "bg-blue-500/20 text-blue-500 border-blue-500/20",
    red: "bg-red-500/20 text-red-500 border-red-500/20",
    purple: "bg-purple-500/20 text-purple-500 border-purple-500/20",
  };

  return (
    <div className="bg-card border border-border p-6 rounded-3xl space-y-4">
      <div className="flex items-center justify-between">
        <div className={cn("p-3 rounded-2xl", colors[color])}>
          <Icon className="w-6 h-6" />
        </div>
        <span className={cn("text-xs font-medium px-2 py-1 rounded-full", trend.startsWith('+') ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500")}>
          {trend}
        </span>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">R$ {value.toLocaleString()}</p>
      </div>
    </div>
  );
}

function TransactionsView({ transactions, categories, bankAccounts, paymentMethods, user, showToast, setConfirmDialog }: any) {
  const [showForm, setShowForm] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [isInfinite, setIsInfinite] = useState(false);
  const [recurringType, setRecurringType] = useState<'fixed' | 'installment'>('fixed');
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [frequency, setFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');

  const [formData, setFormData] = useState<Partial<Transaction>>({
    type: 'expense',
    amount: 0,
    category: '',
    subcategory: '',
    accountId: '',
    toAccount: '',
    accountType: 'debit',
    paymentMethodId: '',
    description: '',
    date: Timestamp.now() as any
  });

  const handleEdit = (t: Transaction) => {
    setEditingTransactionId(t.id || null);
    setFormData({
      ...t,
      date: t.date
    });
    setIsRecurring(false); // Can't edit a series as recurring yet
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.accountId) {
      showToast('Por favor, selecione uma conta.', 'error');
      return;
    }

    if (formData.type === 'transfer' && !formData.toAccount) {
      showToast('Por favor, selecione a conta de destino.', 'error');
      return;
    }

    if (formData.type === 'transfer' && formData.accountId === formData.toAccount) {
      showToast('A conta de origem e destino não podem ser a mesma.', 'error');
      return;
    }

    try {
      const oldT = editingTransactionId ? transactions.find((t: any) => t.id === editingTransactionId) : null;

      // Helper to get impact on balance
      const getImpact = (t: any) => {
        if (t.type === 'income') return t.amount;
        if (t.type === 'expense') return -t.amount;
        return 0; // Transfers handled separately
      };

      // 1. Revert old balance impact if editing
      if (oldT) {
        if (oldT.type === 'transfer') {
          const sourceAcc = bankAccounts.find((a: any) => a.id === oldT.accountId);
          const destAcc = bankAccounts.find((a: any) => a.id === oldT.toAccount);
          if (sourceAcc) await updateDoc(doc(db, 'bankAccounts', sourceAcc.id), { balance: sourceAcc.balance + oldT.amount });
          if (destAcc) await updateDoc(doc(db, 'bankAccounts', destAcc.id), { balance: destAcc.balance - oldT.amount });
        } else {
          const acc = bankAccounts.find((a: any) => a.id === oldT.accountId);
          if (acc) {
            await updateDoc(doc(db, 'bankAccounts', acc.id), { balance: acc.balance - getImpact(oldT) });
          }
        }
      }

      // Prepare data
      const baseData = {
        ...formData,
        uid: user.uid,
        date: formData.date || serverTimestamp(),
        category: formData.type === 'transfer' ? 'Transferência' : formData.category,
        subcategory: formData.type === 'transfer' ? 'Transferência entre contas' : formData.subcategory,
      };

      if (editingTransactionId) {
        await updateDoc(doc(db, 'transactions', editingTransactionId), baseData);
        await applyBalanceImpact(baseData, true);
      } else if (isRecurring) {
        const parentId = crypto.randomUUID();
        const count = isInfinite ? 24 : installmentsCount; // Generate 2 years if infinite
        
        let localBalances: Record<string, number> = {};
        bankAccounts.forEach((acc: any) => { localBalances[acc.id] = acc.balance; });

        const now = new Date();

        for (let i = 0; i < count; i++) {
          const installmentDate = new Date(formData.date?.toDate ? formData.date.toDate() : new Date());
          if (frequency === 'daily') installmentDate.setDate(installmentDate.getDate() + i);
          if (frequency === 'weekly') installmentDate.setDate(installmentDate.getDate() + i * 7);
          if (frequency === 'monthly') installmentDate.setMonth(installmentDate.getMonth() + i);
          if (frequency === 'yearly') installmentDate.setFullYear(installmentDate.getFullYear() + i);

          const installmentData = {
            ...baseData,
            date: Timestamp.fromDate(installmentDate),
            isRecurring: true,
            isInfinite,
            recurringType,
            installmentsCount: isInfinite ? 0 : count,
            installmentNumber: i + 1,
            parentId,
            description: recurringType === 'installment' 
              ? `${formData.description} (${i + 1}/${isInfinite ? '∞' : count})` 
              : formData.description
          };

          await addDoc(collection(db, 'transactions'), installmentData);
          
          // Only update balance if the transaction date is in the past or current month
          const isPastOrCurrentMonth = installmentDate.getFullYear() < now.getFullYear() || 
                                       (installmentDate.getFullYear() === now.getFullYear() && installmentDate.getMonth() <= now.getMonth());

          if (isPastOrCurrentMonth) {
            if (installmentData.type === 'transfer') {
              const sId = installmentData.accountId;
              const dId = installmentData.toAccount;
              if (localBalances[sId] !== undefined) localBalances[sId] -= installmentData.amount;
              if (localBalances[dId] !== undefined) localBalances[dId] += installmentData.amount;
            } else {
              const aId = installmentData.accountId;
              if (localBalances[aId] !== undefined) {
                localBalances[aId] += getImpact(installmentData);
              }
            }
          }
        }

        // Batch update balances at the end
        for (const [id, balance] of Object.entries(localBalances)) {
          const original = bankAccounts.find((a: any) => a.id === id);
          if (original && original.balance !== balance) {
            await updateDoc(doc(db, 'bankAccounts', id), { balance });
          }
        }
      } else {
        await addDoc(collection(db, 'transactions'), baseData);
        // Only impact balance if date is not in the future (beyond current month)
        const transDate = baseData.date instanceof Timestamp ? baseData.date.toDate() : new Date();
        const now = new Date();
        const isPastOrCurrentMonth = transDate.getFullYear() < now.getFullYear() || 
                                     (transDate.getFullYear() === now.getFullYear() && transDate.getMonth() <= now.getMonth());
        
        if (isPastOrCurrentMonth) {
          await applyBalanceImpact(baseData);
        }
      }

      async function applyBalanceImpact(data: any, isEdit = false) {
        // If it's an edit, the bankAccounts state might be stale because of the revert above.
        // But since we are doing sequential awaits, the next fetch or the state might still be old.
        // Actually, in React, state updates are asynchronous.
        // To be safe, we should calculate the new balance based on the state AND the revert we just did.
        
        if (data.type === 'transfer') {
          const sourceAcc = bankAccounts.find((a: any) => a.id === data.accountId);
          const destAcc = bankAccounts.find((a: any) => a.id === data.toAccount);
          
          if (sourceAcc) {
            let currentBalance = sourceAcc.balance;
            if (isEdit && oldT && oldT.accountId === data.accountId) {
              currentBalance += (oldT.type === 'transfer' ? oldT.amount : -getImpact(oldT));
            }
            await updateDoc(doc(db, 'bankAccounts', sourceAcc.id), { balance: currentBalance - data.amount });
          }
          if (destAcc) {
            let currentBalance = destAcc.balance;
            if (isEdit && oldT && oldT.toAccount === data.toAccount) {
              currentBalance += oldT.amount;
            } else if (isEdit && oldT && oldT.accountId === data.toAccount) {
              currentBalance -= getImpact(oldT);
            }
            await updateDoc(doc(db, 'bankAccounts', destAcc.id), { balance: currentBalance + data.amount });
          }
        } else {
          const acc = bankAccounts.find((a: any) => a.id === data.accountId);
          if (acc) {
            let currentBalance = acc.balance;
            if (isEdit && oldT) {
              if (oldT.accountId === data.accountId) {
                currentBalance -= getImpact(oldT);
              } else if (oldT.type === 'transfer' && oldT.toAccount === data.accountId) {
                currentBalance += oldT.amount;
              }
            }
            await updateDoc(doc(db, 'bankAccounts', acc.id), { balance: currentBalance + getImpact(data) });
          }
        }
      }

      setShowForm(false);
      setEditingTransactionId(null);
      setFormData({
        type: 'expense',
        amount: 0,
        category: '',
        subcategory: '',
        accountId: '',
        toAccount: '',
        accountType: 'debit',
        paymentMethodId: '',
        description: '',
        date: Timestamp.now() as any
      });
      setIsRecurring(false);
    } catch (error) {
      handleFirestoreError(error, editingTransactionId ? OperationType.UPDATE : OperationType.CREATE, 'transactions');
    }
  };

  const deleteTransaction = async (id: string) => {
    setConfirmDialog({
      message: 'Deseja realmente excluir esta transação?',
      onConfirm: async () => {
        try {
          const t = transactions.find((trans: any) => trans.id === id);
          if (t) {
            if (t.type === 'transfer') {
              const sourceAcc = bankAccounts.find((a: any) => a.id === t.accountId);
              const destAcc = bankAccounts.find((a: any) => a.id === t.toAccount);
              if (sourceAcc) await updateDoc(doc(db, 'bankAccounts', sourceAcc.id), { balance: sourceAcc.balance + t.amount });
              if (destAcc) await updateDoc(doc(db, 'bankAccounts', destAcc.id), { balance: destAcc.balance - t.amount });
            } else {
              const acc = bankAccounts.find((a: any) => a.id === t.accountId);
              if (acc) {
                const impact = t.type === 'income' ? t.amount : -t.amount;
                await updateDoc(doc(db, 'bankAccounts', acc.id), { balance: acc.balance - impact });
              }
            }
          }
          await deleteDoc(doc(db, 'transactions', id));
          showToast('Transação excluída com sucesso!');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'transactions');
        }
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Histórico de Transações</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-5 h-5" />
          Nova Transação
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border p-8 rounded-3xl max-w-lg w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">{editingTransactionId ? 'Editar Transação' : 'Adicionar Transação'}</h3>
              <button onClick={() => { setShowForm(false); setEditingTransactionId(null); }} className="p-2 hover:bg-foreground/5 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
              <div className="grid grid-cols-3 gap-4">
                {['expense', 'income', 'transfer'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData({ ...formData, type: type as any })}
                    className={cn(
                      "py-3 rounded-xl text-sm font-medium border transition-all capitalize",
                      formData.type === type 
                        ? "bg-emerald-500 border-emerald-500 text-white" 
                        : "bg-muted border-border text-muted-foreground hover:border-foreground/20"
                    )}
                  >
                    {type === 'expense' ? 'Despesa' : type === 'income' ? 'Receita' : 'Transf.'}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Valor</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <input 
                    type="number" 
                    required
                    step="0.01"
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    className="w-full bg-muted border border-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-emerald-500 text-xl font-bold"
                    placeholder="0,00"
                  />
                </div>
              </div>

              {formData.type !== 'transfer' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Categoria</label>
                      <select 
                        required
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value, subcategory: '' })}
                        className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="" disabled>Selecionar</option>
                        {categories.map((cat: any) => (
                          <option key={cat.id} value={cat.name}>{cat.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Subcategoria</label>
                      <select 
                        required
                        value={formData.subcategory}
                        onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                        className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="" disabled>Selecionar</option>
                        {categories.find((c: any) => c.name === formData.category)?.subcategories.map((sub: string) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Conta</label>
                      <select 
                        required
                        value={formData.accountId}
                        onChange={(e) => {
                          const acc = bankAccounts.find((a: any) => a.id === e.target.value);
                          setFormData({ 
                            ...formData, 
                            accountId: e.target.value,
                            accountType: (acc?.type === 'credit_card' ? 'credit' : 
                                          acc?.type === 'meal_voucher' || acc?.type === 'food_voucher' ? 'voucher' : 'debit')
                          });
                        }}
                        className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="" disabled>Selecionar Conta</option>
                        {bankAccounts.map((acc: any) => (
                          <option key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toLocaleString()})</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm text-muted-foreground">Forma de Pagamento</label>
                      <select 
                        required
                        value={formData.paymentMethodId}
                        onChange={(e) => setFormData({ ...formData, paymentMethodId: e.target.value })}
                        className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                      >
                        <option value="" disabled>Selecionar Forma</option>
                        {paymentMethods.map((pm: any) => (
                          <option key={pm.id} value={pm.id}>{pm.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Conta de Origem</label>
                    <select 
                      required
                      value={formData.accountId}
                      onChange={(e) => {
                        const acc = bankAccounts.find((a: any) => a.id === e.target.value);
                        setFormData({ 
                          ...formData, 
                          accountId: e.target.value,
                          accountType: (acc?.type === 'credit_card' ? 'credit' : 
                                        acc?.type === 'meal_voucher' || acc?.type === 'food_voucher' ? 'voucher' : 'debit')
                        });
                      }}
                      className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="" disabled>Selecionar Origem</option>
                      {bankAccounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm text-muted-foreground">Conta de Destino</label>
                    <select 
                      required
                      value={formData.toAccount}
                      onChange={(e) => setFormData({ ...formData, toAccount: e.target.value })}
                      className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="" disabled>Selecionar Destino</option>
                      {bankAccounts.map((acc: any) => (
                        <option key={acc.id} value={acc.id}>{acc.name} (R$ {acc.balance.toLocaleString()})</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Data</label>
                <input 
                  type="date"
                  required
                  value={formData.date ? new Date(formData.date.seconds * 1000).toISOString().split('T')[0] : ''}
                  onChange={(e) => setFormData({ ...formData, date: Timestamp.fromDate(new Date(e.target.value)) as any })}
                  className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {!editingTransactionId && (
                <div className="space-y-4 p-4 bg-muted rounded-2xl border border-border">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">Repetir transação?</label>
                    <button
                      type="button"
                      onClick={() => setIsRecurring(!isRecurring)}
                      className={cn(
                        "w-12 h-6 rounded-full transition-colors relative",
                        isRecurring ? "bg-emerald-500" : "bg-border"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                        isRecurring ? "left-7" : "left-1"
                      )} />
                    </button>
                  </div>

                  {isRecurring && (
                    <motion.div 
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-4 pt-4 border-t border-border"
                    >
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Tipo</label>
                          <select 
                            value={recurringType}
                            onChange={(e) => setRecurringType(e.target.value as any)}
                            className="w-full bg-background border border-border rounded-lg py-2 px-3 text-sm"
                          >
                            <option value="fixed">Fixo (Mensalidade)</option>
                            <option value="installment">Parcelado (Cartão/Boleto)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">Frequência</label>
                          <select 
                            value={frequency}
                            onChange={(e) => setFrequency(e.target.value as any)}
                            className="w-full bg-background border border-border rounded-lg py-2 px-3 text-sm"
                          >
                            <option value="daily">Diário</option>
                            <option value="weekly">Semanal</option>
                            <option value="monthly">Mensal</option>
                            <option value="yearly">Anual</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between py-2">
                        <label className="text-xs font-medium">Sem limite de parcelas?</label>
                        <button
                          type="button"
                          onClick={() => setIsInfinite(!isInfinite)}
                          className={cn(
                            "w-10 h-5 rounded-full transition-colors relative",
                            isInfinite ? "bg-emerald-500" : "bg-border"
                          )}
                        >
                          <div className={cn(
                            "absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all",
                            isInfinite ? "left-5.5" : "left-0.5"
                          )} />
                        </button>
                      </div>

                      {!isInfinite && (
                        <div className="space-y-2">
                          <label className="text-xs text-muted-foreground">
                            {recurringType === 'installment' ? 'Número de Parcelas' : 'Quantidade de Repetições'}
                          </label>
                          <input 
                            type="number"
                            min="2"
                            max="48"
                            value={installmentsCount}
                            onChange={(e) => setInstallmentsCount(parseInt(e.target.value))}
                            className="w-full bg-background border border-border rounded-lg py-2 px-3 text-sm"
                          />
                        </div>
                      )}
                      
                      {isRecurring && formData.amount && !isInfinite && installmentsCount > 1 && (
                        <div className="col-span-2 text-[10px] text-emerald-500 font-medium bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/20">
                          Total da operação: R$ {(formData.amount * installmentsCount).toLocaleString()}
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Descrição (Opcional)</label>
                <input 
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Almoço no shopping"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                {editingTransactionId ? 'Salvar Alterações' : 'Salvar Transação'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-card border border-border rounded-3xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-muted-foreground text-sm">
                <th className="px-6 py-4 font-medium">Data</th>
                <th className="px-6 py-4 font-medium">Descrição</th>
                <th className="px-6 py-4 font-medium">Categoria</th>
                <th className="px-6 py-4 font-medium">Conta</th>
                <th className="px-6 py-4 font-medium text-right">Valor</th>
                <th className="px-6 py-4 font-medium text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(() => {
                const now = new Date();
                const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
                
                const filteredTransactions = transactions.filter((t: any) => {
                  const tDate = t.date.toDate();
                  return tDate <= currentMonthEnd;
                });

                let lastMonthYear = "";

                return filteredTransactions.map((t: any) => {
                  const tDate = t.date.toDate();
                  const monthYear = tDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
                  const showSeparator = monthYear !== lastMonthYear;
                  lastMonthYear = monthYear;

                  return (
                    <React.Fragment key={t.id}>
                      {showSeparator && (
                        <tr className="bg-muted/30 border-y border-border/50">
                          <td colSpan={6} className="px-6 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-foreground/5">
                            {monthYear}
                          </td>
                        </tr>
                      )}
                      <tr className="hover:bg-foreground/5 transition-colors group">
                        <td className="px-6 py-4 text-sm text-muted-foreground">
                          {tDate.toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-medium flex items-center gap-2">
                            {t.description || '-'}
                            {t.isRecurring && (
                              <span className="p-1 bg-emerald-500/10 text-emerald-500 rounded-md" title={`Recorrente: ${t.installmentNumber}/${t.isInfinite ? '∞' : t.installmentsCount}`}>
                                <RefreshCw className="w-3 h-3" />
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{t.subcategory}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-muted rounded-full text-xs border border-border">
                            {t.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {t.type === 'transfer' ? (
                            <div className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-foreground">
                                {bankAccounts.find((a: any) => a.id === t.accountId)?.name}
                              </span>
                              <RefreshCw className="w-3 h-3 text-blue-500" />
                              <span className="font-medium text-foreground">
                                {bankAccounts.find((a: any) => a.id === t.toAccount)?.name}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span className="font-medium text-foreground">
                                {bankAccounts.find((a: any) => a.id === t.accountId)?.name || t.accountType}
                              </span>
                              <span className="text-xs opacity-50">
                                ({paymentMethods.find((pm: any) => pm.id === t.paymentMethodId)?.name || '-'})
                              </span>
                            </div>
                          )}
                        </td>
                        <td className={cn(
                          "px-6 py-4 text-right font-bold",
                          t.type === 'income' ? "text-emerald-500" : 
                          t.type === 'expense' ? "text-red-500" : "text-blue-500"
                        )}>
                          {t.type === 'income' ? '+' : t.type === 'expense' ? '-' : ''} R$ {t.amount.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleEdit(t)}
                              className="p-2 text-foreground/20 hover:text-emerald-500 transition-colors"
                              title="Editar"
                            >
                              <Edit3 className="w-5 h-5" />
                            </button>
                            <button 
                              onClick={() => deleteTransaction(t.id)}
                              className="p-2 text-foreground/20 hover:text-red-400 transition-colors"
                              title="Excluir"
                            >
                              <X className="w-5 h-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    </React.Fragment>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
        {transactions.length === 0 && (
          <div className="text-center py-20 text-white/20">
            <History className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <p>Nenhuma transação registrada ainda.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function InvestmentsView({ investments, user, showToast, setConfirmDialog }: any) {
  const [showForm, setShowForm] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState<string | null>(null);
  const [newValuation, setNewValuation] = useState<number>(0);
  const [isFetching, setIsFetching] = useState(false);
  const [formData, setFormData] = useState<Partial<Investment>>({
    name: '',
    type: 'Ações',
    amount: 0,
    currentValuation: 0,
    ticker: '',
    purchasePrice: 0,
    purchaseDate: Timestamp.now()
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'investments'), {
        ...formData,
        uid: user.uid,
        date: serverTimestamp(),
        purchaseDate: Timestamp.fromDate(new Date((formData.purchaseDate as any)))
      });
      setShowForm(false);
      setFormData({ 
        name: '', 
        type: 'Ações', 
        amount: 0, 
        currentValuation: 0,
        ticker: '',
        purchasePrice: 0,
        purchaseDate: Timestamp.now()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'investments');
    }
  };

  const handleUpdateValuation = async (id: string) => {
    try {
      await updateDoc(doc(db, 'investments', id), {
        currentValuation: newValuation,
        lastUpdate: serverTimestamp()
      });
      setShowValuationModal(null);
      showToast('Valor atualizado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'investments');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      message: 'Deseja realmente excluir este investimento?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'investments', id));
          showToast('Investimento excluído com sucesso!');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'investments');
        }
      }
    });
  };

  const fetchRealTimePrice = async (inv: any) => {
    setIsFetching(true);
    // Simulação de integração com API financeira
    // Em um cenário real, aqui faríamos um fetch para Alpha Vantage, CoinGecko, etc.
    setTimeout(() => {
      const variation = (Math.random() * 0.1) - 0.05; // -5% a +5%
      const simulatedPrice = inv.currentValuation * (1 + variation);
      setNewValuation(Number(simulatedPrice.toFixed(2)));
      setIsFetching(false);
    }, 1500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Meus Investimentos</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
        >
          <PlusCircle className="w-5 h-5" />
          Novo Investimento
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border p-8 rounded-3xl max-w-lg w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">Adicionar Investimento</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-foreground/5 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Nome do Ativo</label>
                  <input 
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-blue-500"
                    placeholder="Ex: Petrobras"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Ticker / Símbolo</label>
                  <input 
                    type="text"
                    value={formData.ticker}
                    onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-blue-500"
                    placeholder="Ex: PETR4"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Tipo</label>
                  <select 
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-blue-500"
                  >
                    <option value="Ações">Ações</option>
                    <option value="FIIs">FIIs</option>
                    <option value="Renda Fixa">Renda Fixa</option>
                    <option value="Cripto">Cripto</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Data da Compra</label>
                  <input 
                    type="date"
                    required
                    onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value as any })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Preço de Compra (Unit.)</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={formData.purchasePrice || ''}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: parseFloat(e.target.value) })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-blue-500"
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Valor Total Aplicado</label>
                  <input 
                    type="number"
                    required
                    value={formData.amount || ''}
                    onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value), currentValuation: parseFloat(e.target.value) })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-blue-500"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
              >
                Salvar Investimento
              </button>
            </form>
          </motion.div>
        </div>
      )}

      {showValuationModal && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border p-8 rounded-3xl max-w-md w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Atualizar Valor</h3>
              <button onClick={() => setShowValuationModal(null)} className="p-2 hover:bg-foreground/5 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nova Cotação Atual</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                  <input 
                    type="number"
                    value={newValuation}
                    onChange={(e) => setNewValuation(parseFloat(e.target.value))}
                    className="w-full bg-muted border border-border rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500 text-xl font-bold"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => fetchRealTimePrice(investments.find((i: any) => i.id === showValuationModal))}
                  disabled={isFetching}
                  className="flex-1 py-3 bg-muted border border-border rounded-xl hover:bg-foreground/5 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw className={cn("w-4 h-4", isFetching && "animate-spin")} />
                  {isFetching ? 'Buscando...' : 'Buscar Real-time'}
                </button>
                <button 
                  onClick={() => handleUpdateValuation(showValuationModal)}
                  className="flex-[2] py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-400 transition-all shadow-lg shadow-blue-500/20"
                >
                  Confirmar
                </button>
              </div>
              <p className="text-[10px] text-muted-foreground/50 text-center uppercase tracking-widest">
                Integração com API financeira disponível em versões Pro
              </p>
            </div>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {investments.map((inv: any) => {
          const profit = (inv.currentValuation || inv.amount) - inv.amount;
          const profitPercent = (profit / inv.amount) * 100;
          
          return (
            <div key={inv.id} className="bg-card border border-border p-6 rounded-3xl space-y-4 hover:border-blue-500/50 transition-all group relative">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-blue-500/20 text-blue-500 rounded-2xl">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setShowValuationModal(inv.id);
                      setNewValuation(inv.currentValuation || inv.amount);
                    }}
                    className="p-2 bg-muted hover:bg-blue-500/20 hover:text-blue-500 rounded-lg transition-all"
                    title="Atualizar Valor"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => handleDelete(inv.id)}
                    className="p-2 bg-muted hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all"
                    title="Excluir"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  <span className={cn(
                    "text-xs font-medium px-2 py-1 rounded-full",
                    profit >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {profit >= 0 ? '+' : ''}{profitPercent.toFixed(2)}%
                  </span>
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg">{inv.name}</h3>
                  {inv.ticker && (
                    <span className="text-[10px] font-bold bg-foreground/10 px-2 py-0.5 rounded text-muted-foreground">
                      {inv.ticker}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>{inv.type}</span>
                  {inv.purchaseDate && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {inv.purchaseDate.toDate().toLocaleDateString('pt-BR')}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Valor Atual</p>
                  <p className="text-xl font-bold text-blue-400">R$ {(inv.currentValuation || inv.amount).toLocaleString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Preço Médio</p>
                  <p className="text-sm font-medium text-muted-foreground">
                    R$ {(inv.purchasePrice || 0).toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="flex justify-between items-center pt-2">
                <p className="text-xs text-muted-foreground/50 uppercase tracking-widest">Total Aplicado</p>
                <p className="text-sm font-semibold text-muted-foreground">R$ {inv.amount.toLocaleString()}</p>
              </div>
            </div>
          );
        })}
        {investments.length === 0 && (
          <div className="col-span-full text-center py-20 bg-muted border border-border border-dashed rounded-3xl text-muted-foreground/50">
            Nenhum investimento cadastrado.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function GoalsView({ goals, user, showToast, setConfirmDialog }: any) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Goal>>({
    name: '',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: Timestamp.now() as any
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'goals'), {
        ...formData,
        uid: user.uid,
        createdAt: serverTimestamp(),
        targetDate: Timestamp.fromDate(new Date((formData.targetDate as any)))
      });
      setShowForm(false);
      setFormData({ name: '', targetAmount: 0, currentAmount: 0, targetDate: Timestamp.now() as any });
      showToast('Objetivo adicionado com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'goals');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      message: 'Deseja realmente excluir este objetivo?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'goals', id));
          showToast('Objetivo excluído com sucesso!');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'goals');
        }
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Meus Objetivos</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-purple-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20"
        >
          <PlusCircle className="w-5 h-5" />
          Novo Objetivo
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border p-8 rounded-3xl max-w-lg w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">Adicionar Objetivo</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-foreground/5 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Qual o seu objetivo?</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-purple-500"
                  placeholder="Ex: Viagem para Europa, Carro Novo, Casa Própria"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Valor Meta</label>
                  <input 
                    type="number"
                    required
                    value={formData.targetAmount || ''}
                    onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-purple-500"
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Já guardado</label>
                  <input 
                    type="number"
                    required
                    value={formData.currentAmount || ''}
                    onChange={(e) => setFormData({ ...formData, currentAmount: parseFloat(e.target.value) })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-purple-500"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Data Alvo</label>
                <input 
                  type="date"
                  required
                  onChange={(e) => setFormData({ ...formData, targetDate: e.target.value as any })}
                  className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-purple-500"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-purple-500 text-white font-bold rounded-xl hover:bg-purple-400 transition-all shadow-lg shadow-purple-500/20"
              >
                Salvar Objetivo
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal: any) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100;
          const remaining = goal.targetAmount - goal.currentAmount;
          const targetDate = goal.targetDate.toDate();
          const today = new Date();
          const diffTime = Math.abs(targetDate.getTime() - today.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const monthsLeft = Math.ceil(diffDays / 30);

          return (
            <div key={goal.id} className="bg-card border border-border p-8 rounded-3xl space-y-6 relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <Target className="w-24 h-24 text-purple-500" />
              </div>

              <div className="flex items-center justify-between relative z-10">
                <div>
                  <h3 className="text-2xl font-bold">{goal.name}</h3>
                  <p className="text-sm text-muted-foreground">Meta: R$ {goal.targetAmount.toLocaleString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-3xl font-bold text-purple-400">{progress.toFixed(0)}%</span>
                  </div>
                  <button 
                    onClick={() => handleDelete(goal.id)}
                    className="p-2 bg-muted hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    title="Excluir"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 relative z-10">
                <div className="h-3 w-full bg-muted rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>R$ {goal.currentAmount.toLocaleString()}</span>
                  <span>Faltam R$ {remaining.toLocaleString()}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-500/10 text-purple-500 rounded-lg">
                    <History className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tempo Restante</p>
                    <p className="text-sm font-semibold">{monthsLeft} meses</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Economia Mensal</p>
                    <p className="text-sm font-semibold">R$ {Math.ceil(remaining / monthsLeft).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        {goals.length === 0 && (
          <div className="col-span-full text-center py-20 bg-muted border border-border border-dashed rounded-3xl text-muted-foreground/50">
            Qual o seu próximo grande objetivo? Comece a planejar agora!
          </div>
        )}
      </div>
    </motion.div>
  );
}

function BankAccountsView({ bankAccounts, user, showToast, setConfirmDialog }: { bankAccounts: BankAccount[], user: any, showToast: any, setConfirmDialog: any }) {
  const [showForm, setShowForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [formData, setFormData] = useState<Partial<BankAccount>>({
    name: '',
    type: 'checking',
    balance: 0,
    institution: '',
    color: '#10b981'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await updateDoc(doc(db, 'bankAccounts', editingAccount.id!), {
          ...formData,
        });
      } else {
        await addDoc(collection(db, 'bankAccounts'), {
          ...formData,
          uid: user.uid,
          createdAt: serverTimestamp()
        });
      }
      setShowForm(false);
      setEditingAccount(null);
      setFormData({ name: '', type: 'checking', balance: 0, institution: '', color: '#10b981' });
    } catch (error) {
      handleFirestoreError(error, editingAccount ? OperationType.UPDATE : OperationType.CREATE, 'bankAccounts');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      message: 'Deseja realmente excluir esta conta? Isso não afetará as transações já registradas, mas a conta não estará mais disponível para novos lançamentos.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'bankAccounts', id));
          showToast('Conta excluída com sucesso!');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'bankAccounts');
        }
      }
    });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Minhas Contas</h2>
        <button 
          onClick={() => {
            setEditingAccount(null);
            setFormData({ name: '', type: 'checking', balance: 0, institution: '', color: '#10b981' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-5 h-5" />
          Nova Conta
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border p-8 rounded-3xl max-w-lg w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">{editingAccount ? 'Editar Conta' : 'Adicionar Conta'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-foreground/5 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nome da Conta</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Conta Corrente, Nubank, Carteira"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Tipo</label>
                  <select 
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="checking">Conta Corrente</option>
                    <option value="savings">Poupança</option>
                    <option value="investment">Investimento</option>
                    <option value="credit_card">Cartão de Crédito</option>
                    <option value="meal_voucher">Vale Refeição</option>
                    <option value="food_voucher">Vale Alimentação</option>
                    <option value="cash">Dinheiro</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Saldo Inicial</label>
                  <input 
                    type="number"
                    step="0.01"
                    required
                    value={formData.balance || ''}
                    onChange={(e) => setFormData({ ...formData, balance: parseFloat(e.target.value) })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                    placeholder="0,00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Instituição (Opcional)</label>
                  <input 
                    type="text"
                    value={formData.institution}
                    onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                    className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                    placeholder="Ex: Itaú, Bradesco"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-muted-foreground">Cor de Identificação</label>
                  <input 
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-full h-[58px] bg-muted border border-border rounded-xl p-2 focus:outline-none focus:border-emerald-500 cursor-pointer"
                  />
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                {editingAccount ? 'Atualizar Conta' : 'Salvar Conta'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bankAccounts.map((account) => (
          <div key={account.id} className="bg-card border border-border p-6 rounded-3xl space-y-4 relative group overflow-hidden">
            <div 
              className="absolute top-0 left-0 w-1 h-full" 
              style={{ backgroundColor: account.color }}
            />
            
            <div className="flex items-center justify-between">
              <div className="p-3 bg-muted rounded-2xl">
                {account.type === 'credit_card' ? <CreditCard className="w-6 h-6" /> : 
                 account.type === 'meal_voucher' ? <Utensils className="w-6 h-6" /> :
                 account.type === 'food_voucher' ? <ShoppingBag className="w-6 h-6" /> :
                 <Wallet className="w-6 h-6" />}
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => {
                    setEditingAccount(account);
                    setFormData({ ...account });
                    setShowForm(true);
                  }}
                  className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground hover:text-foreground"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDelete(account.id!)}
                  className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <h3 className="font-bold text-lg">{account.name}</h3>
              <p className="text-sm text-muted-foreground">{account.institution || 'Outros'}</p>
            </div>

            <div className="pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Saldo</p>
              <p className={cn(
                "text-2xl font-bold",
                account.balance >= 0 ? "text-emerald-500" : "text-red-500"
              )}>
                R$ {account.balance.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-foreground/5 px-2 py-1 rounded-full text-muted-foreground uppercase font-bold">
                {account.type === 'checking' && 'Conta Corrente'}
                {account.type === 'savings' && 'Poupança'}
                {account.type === 'investment' && 'Investimento'}
                {account.type === 'credit_card' && 'Cartão de Crédito'}
                {account.type === 'cash' && 'Dinheiro'}
              </span>
            </div>
          </div>
        ))}
        {bankAccounts.length === 0 && (
          <div className="col-span-full text-center py-20 bg-muted border border-border border-dashed rounded-3xl text-muted-foreground/50">
            Nenhuma conta bancária cadastrada.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function CategoriesView({ categories, user, showToast, setConfirmDialog }: any) {
  const [showForm, setShowForm] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', subcategories: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'categories'), {
        uid: user.uid,
        name: newCat.name,
        subcategories: newCat.subcategories.split(',').map(s => s.trim()).filter(s => s),
        isDefault: false
      });
      setShowForm(false);
      setNewCat({ name: '', subcategories: '' });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'categories');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Gerenciar Categorias</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-5 h-5" />
          Nova Categoria
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border p-8 rounded-3xl max-w-lg w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">Adicionar Categoria</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-foreground/5 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nome da Categoria</label>
                <input 
                  type="text"
                  required
                  value={newCat.name}
                  onChange={(e) => setNewCat({ ...newCat, name: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Pets, Assinaturas, etc."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Subcategorias (separadas por vírgula)</label>
                <textarea 
                  required
                  value={newCat.subcategories}
                  onChange={(e) => setNewCat({ ...newCat, subcategories: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500 min-h-[100px]"
                  placeholder="Ex: Ração, Veterinário, Banho"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                Salvar Categoria
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((cat: any) => (
          <div key={cat.id} className="bg-card border border-border p-6 rounded-3xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-lg">{cat.name}</h3>
              {cat.isDefault && <span className="text-[10px] bg-foreground/10 px-2 py-1 rounded-full text-muted-foreground/50 uppercase">Padrão</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {cat.subcategories.map((sub: string) => (
                <span key={sub} className="px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground border border-border">
                  {sub}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

function AITipsView({ transactions, investments, goals }: any) {
  const [tips, setTips] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateTips = async () => {
    setLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey || apiKey === "SUA_CHAVE_GEMINI_AQUI") {
        setTips('Para usar a IA, substitua "SUA_CHAVE_GEMINI_AQUI" por sua API Key real no arquivo `.env.local`.');
        setLoading(false);
        return;
      }
      
      const genAI = new GoogleGenAI({ apiKey });
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analise os seguintes dados financeiros e forneça 5 dicas personalizadas e práticas para melhorar o orçamento.
        Transações: ${JSON.stringify(transactions.slice(0, 20).map((t: any) => ({ type: t.type, amount: t.amount, category: t.category, subcategory: t.subcategory })))}
        Investimentos: ${JSON.stringify(investments.map((i: any) => ({ name: i.name, amount: i.amount })))}
        Objetivos: ${JSON.stringify(goals.map((g: any) => ({ name: g.name, target: g.targetAmount, current: g.currentAmount })))}
        
        Responda em Português do Brasil, usando Markdown. Seja motivador e específico.`,
      });
      
      setTips(response.text || 'Não foi possível gerar dicas no momento.');
    } catch (error) {
      console.error('Gemini Error:', error);
      setTips('Erro ao conectar com a IA. Verifique sua chave de API e se há créditos na conta.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (transactions.length > 0 && !tips) {
      generateTips();
    }
  }, [transactions]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="max-w-4xl mx-auto space-y-6"
    >
      <div className="bg-gradient-to-br from-emerald-500 to-indigo-600 p-8 rounded-3xl shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-20">
          <Sparkles className="w-32 h-32 text-white" />
        </div>
        <div className="relative z-10 space-y-4">
          <h2 className="text-3xl font-bold">Inteligência Financeira</h2>
          <p className="text-white/80 max-w-xl">
            Nossa IA analisa seus hábitos de consumo e investimentos para oferecer as melhores estratégias personalizadas para você alcançar seus objetivos mais rápido.
          </p>
          <button 
            onClick={generateTips}
            disabled={loading}
            className="bg-white text-black px-8 py-3 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Analisando...' : 'Atualizar Dicas'}
            <Sparkles className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border p-8 rounded-3xl min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
            <motion.div 
              animate={{ scale: [1, 1.2, 1], rotate: [0, 10, -10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Sparkles className="w-12 h-12 text-emerald-500" />
            </motion.div>
            <p className="text-muted-foreground/50 animate-pulse">A IA está analisando seus dados...</p>
          </div>
        ) : (
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{tips}</ReactMarkdown>
          </div>
        )}
        {!loading && !tips && (
          <div className="text-center py-20 text-muted-foreground/20">
            Clique no botão acima para gerar suas dicas personalizadas.
          </div>
        )}
      </div>
    </motion.div>
  );
}

function PaymentMethodsView({ paymentMethods, user, showToast, setConfirmDialog }: { paymentMethods: PaymentMethod[], user: any, showToast: any, setConfirmDialog: any }) {
  const [showForm, setShowForm] = useState(false);
  const [editingPM, setEditingPM] = useState<PaymentMethod | null>(null);
  const [formData, setFormData] = useState<Partial<PaymentMethod>>({
    name: '',
    icon: 'CreditCard'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPM) {
        await updateDoc(doc(db, 'paymentMethods', editingPM.id!), {
          ...formData,
        });
      } else {
        await addDoc(collection(db, 'paymentMethods'), {
          ...formData,
          uid: user.uid,
          isDefault: false
        });
      }
      setShowForm(false);
      setEditingPM(null);
      setFormData({ name: '', icon: 'CreditCard' });
    } catch (error) {
      handleFirestoreError(error, editingPM ? OperationType.UPDATE : OperationType.CREATE, 'paymentMethods');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDialog({
      message: 'Deseja realmente excluir esta forma de pagamento?',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'paymentMethods', id));
          showToast('Forma de pagamento excluída com sucesso!');
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, 'paymentMethods');
        }
      }
    });
  };

  const icons = [
    { id: 'CreditCard', icon: CreditCard },
    { id: 'Wallet', icon: Wallet },
    { id: 'Banknote', icon: Banknote },
    { id: 'RefreshCw', icon: RefreshCw },
    { id: 'History', icon: History },
    { id: 'Sparkles', icon: Sparkles }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Formas de Pagamento</h2>
        <button 
          onClick={() => {
            setEditingPM(null);
            setFormData({ name: '', icon: 'CreditCard' });
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-emerald-500 text-white px-6 py-3 rounded-xl font-semibold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
        >
          <PlusCircle className="w-5 h-5" />
          Nova Forma
        </button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-card border border-border p-8 rounded-3xl max-w-lg w-full shadow-2xl"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">{editingPM ? 'Editar Forma' : 'Adicionar Forma'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-foreground/5 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Nome da Forma de Pagamento</label>
                <input 
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-muted border border-border rounded-xl py-4 px-4 focus:outline-none focus:border-emerald-500"
                  placeholder="Ex: Pix, Vale Refeição, etc."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Ícone</label>
                <div className="grid grid-cols-6 gap-2">
                  {icons.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: item.id })}
                      className={cn(
                        "p-3 rounded-xl border transition-all flex items-center justify-center",
                        formData.icon === item.id 
                          ? "bg-emerald-500 border-emerald-500 text-white" 
                          : "bg-muted border-border text-muted-foreground hover:border-foreground/20"
                      )}
                    >
                      <item.icon className="w-6 h-6" />
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-emerald-500 text-white font-bold rounded-xl hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
              >
                {editingPM ? 'Atualizar Forma' : 'Salvar Forma'}
              </button>
            </form>
          </motion.div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paymentMethods.map((pm) => {
          const IconComponent = icons.find(i => i.id === pm.icon)?.icon || CreditCard;
          return (
            <div key={pm.id} className="bg-card border border-border p-6 rounded-3xl space-y-4 relative group overflow-hidden">
              <div className="flex items-center justify-between">
                <div className="p-3 bg-muted rounded-2xl">
                  <IconComponent className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {!pm.isDefault && (
                    <>
                      <button 
                        onClick={() => {
                          setEditingPM(pm);
                          setFormData({ ...pm });
                          setShowForm(true);
                        }}
                        className="p-2 hover:bg-foreground/5 rounded-lg text-muted-foreground hover:text-foreground"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(pm.id!)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-muted-foreground hover:text-red-500"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div>
                <h3 className="font-bold text-lg">{pm.name}</h3>
                {pm.isDefault && <span className="text-[10px] bg-foreground/10 px-2 py-1 rounded-full text-muted-foreground/50 uppercase">Padrão</span>}
              </div>
            </div>
          );
        })}
        {paymentMethods.length === 0 && (
          <div className="col-span-full text-center py-20 bg-muted border border-border border-dashed rounded-3xl text-muted-foreground/50">
            Nenhuma forma de pagamento cadastrada.
          </div>
        )}
      </div>
    </motion.div>
  );
}
