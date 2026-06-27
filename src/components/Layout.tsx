import { useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { UserRole } from '../lib/supabase';
import {
  Croissant, LayoutDashboard, Package, Wheat, Factory, ShoppingCart,
  BarChart3, Users, LogOut, Menu, X, ChevronRight,
} from 'lucide-react';

export type PageId = 'dashboard' | 'products' | 'supplies' | 'production' | 'sales' | 'reports' | 'employees';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'empleado'] },
  { id: 'products', label: 'Productos', icon: Package, roles: ['admin', 'empleado'] },
  { id: 'supplies', label: 'Insumos', icon: Wheat, roles: ['admin', 'empleado'] },
  { id: 'production', label: 'Producción', icon: Factory, roles: ['admin', 'empleado'] },
  { id: 'sales', label: 'Ventas', icon: ShoppingCart, roles: ['admin', 'empleado'] },
  { id: 'reports', label: 'Reportes', icon: BarChart3, roles: ['admin'] },
  { id: 'employees', label: 'Empleados', icon: Users, roles: ['admin'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  empleado: 'Empleado',
};

const ROLE_COLORS: Record<UserRole, string> = {
  admin: 'bg-amber-100 text-amber-700',
  empleado: 'bg-blue-100 text-blue-700',
};

export default function Layout({
  currentPage, onNavigate, children,
}: {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
  children: ReactNode;
}) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const visibleItems = NAV_ITEMS.filter(item => profile && item.roles.includes(profile.role));
  const currentItem = NAV_ITEMS.find(item => item.id === currentPage);

  return (
    <div className="min-h-screen bg-stone-50 flex">
      {/* Sidebar - Desktop */}
      <aside className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-white border-r border-stone-200 flex flex-col transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex items-center gap-3 px-6 py-5 border-b border-stone-200">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-md shadow-amber-500/20">
            <Croissant className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-stone-800 leading-tight">PanControl</h1>
            <p className="text-xs text-stone-400">Gestión de Panadería</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {visibleItems.map(item => {
            const Icon = item.icon;
            const active = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                  active
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md shadow-amber-500/20'
                    : 'text-stone-600 hover:bg-stone-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${active ? 'text-white' : 'text-stone-400 group-hover:text-stone-600'}`} />
                {item.label}
                {active && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-stone-200">
          <div className="flex items-center gap-3 px-3 py-2 mb-2">
            <div className="flex items-center justify-center w-9 h-9 bg-stone-200 rounded-full text-stone-600 font-semibold text-sm">
              {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-stone-800 truncate">{profile?.full_name}</p>
              <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${profile ? ROLE_COLORS[profile.role] : ''}`}>
                {profile ? ROLE_LABELS[profile.role] : ''}
              </span>
            </div>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all"
          >
            <LogOut className="w-5 h-5" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-stone-200 px-4 lg:px-8 py-4 flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-stone-600 hover:bg-stone-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-stone-800">{currentItem?.label}</h2>
            <p className="text-sm text-stone-400 hidden sm:block">
              {new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-8 overflow-x-hidden">
          {children}
        </main>
      </div>

      {/* Mobile close button overlay */}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 right-4 z-50 lg:hidden p-2 bg-white rounded-lg shadow-lg"
        >
          <X className="w-5 h-5 text-stone-600" />
        </button>
      )}
    </div>
  );
}
