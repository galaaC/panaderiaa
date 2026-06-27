import { useState, type ReactNode } from 'react';
import { useAuth } from '../lib/auth';
import type { UserRole } from '../lib/supabase';
import {
  Croissant, Home, Package, Wheat, Factory, ShoppingCart,
  BarChart3, Users, LogOut, Menu, X, Settings, Archive,
  ShoppingBag, ChevronDown, Calendar,
} from 'lucide-react';

export type PageId = 'dashboard' | 'products' | 'supplies' | 'production' | 'sales' | 'reports' | 'employees';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof Home;
  roles: UserRole[];
  onlyFirstActive?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',  label: 'Inicio',      icon: Home,         roles: ['admin', 'empleado'] },
  { id: 'products',   label: 'Productos',   icon: Package,      roles: ['admin', 'empleado'] },
  { id: 'production', label: 'Producción',  icon: Factory,      roles: ['admin', 'empleado'] },
  { id: 'supplies',   label: 'Insumos',     icon: Wheat,        roles: ['admin', 'empleado'] },
  { id: 'products',   label: 'Inventario',  icon: Archive,      roles: ['admin', 'empleado'], onlyFirstActive: false },
  { id: 'sales',      label: 'Ventas',      icon: ShoppingCart, roles: ['admin', 'empleado'] },
  { id: 'supplies',   label: 'Compras',     icon: ShoppingBag,  roles: ['admin', 'empleado'], onlyFirstActive: false },
  { id: 'reports',    label: 'Reportes',    icon: BarChart3,    roles: ['admin'] },
  { id: 'employees',  label: 'Usuarios',    icon: Users,        roles: ['admin'] },
];

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  empleado: 'Empleado',
};

const PAGE_LABELS: Record<PageId, string> = {
  dashboard:  'Inicio',
  products:   'Productos',
  supplies:   'Insumos',
  production: 'Producción',
  sales:      'Ventas',
  reports:    'Reportes',
  employees:  'Usuarios',
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

  // Track which IDs we've already seen so only first occurrence gets active style
  const seenActiveIds = new Set<PageId>();
  const itemsWithActiveFlag = visibleItems.map(item => {
    const canBeActive = !seenActiveIds.has(item.id);
    seenActiveIds.add(item.id);
    const isActive = currentPage === item.id && canBeActive;
    return { ...item, isActive };
  });

  const today = new Date().toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="min-h-screen flex bg-[#f0f2f7]">
      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-56 flex flex-col transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        style={{ backgroundColor: '#1e2230' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 flex-shrink-0">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl flex-shrink-0 bg-orange-500">
            <Croissant className="w-6 h-6 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-orange-400">PanControl</h1>
            <p className="text-[10px] leading-tight" style={{ color: '#8b93a8' }}>
              Sistema de Gestión<br />Panadería
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 pt-1 space-y-0.5 overflow-y-auto">
          {itemsWithActiveFlag.map((item, index) => {
            const Icon = item.icon;
            return (
              <button
                key={`${item.id}-${index}`}
                onClick={() => { onNavigate(item.id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  item.isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-[#8b93a8] hover:bg-[#2a2f42] hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}

          {/* Configuración (non-navigable) */}
          <button
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-[#8b93a8] hover:bg-[#2a2f42] hover:text-white"
          >
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span>Configuración</span>
          </button>
        </nav>

        {/* Sign out + bakery image */}
        <div className="flex-shrink-0">
          <div className="px-3 pb-2">
            <button
              onClick={signOut}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-[#8b93a8] hover:bg-red-900/40 hover:text-red-400"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span>Cerrar Sesión</span>
            </button>
          </div>
          <div className="h-44 overflow-hidden">
            <img
              src="/files_4194167-2026-06-27T19-34-01-638Z-image.webp"
              alt="Panadería"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </aside>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      {sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(false)}
          className="fixed top-4 right-4 z-50 lg:hidden p-2 bg-white rounded-lg shadow-lg"
        >
          <X className="w-5 h-5 text-stone-600" />
        </button>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-stone-200 px-6 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-stone-600 hover:bg-stone-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-stone-800">
              {PAGE_LABELS[currentPage]}
            </h2>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-sm text-stone-600 bg-stone-50 px-3 py-1.5 rounded-lg border border-stone-200">
              <Calendar className="w-4 h-4 text-stone-400" />
              <span>{today}</span>
            </div>
            <div className="flex items-center gap-2 cursor-pointer select-none">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                {profile?.full_name?.charAt(0).toUpperCase() ?? 'U'}
              </div>
              <span className="text-sm font-medium text-stone-700 hidden sm:block">
                {ROLE_LABELS[profile?.role ?? 'empleado']}
              </span>
              <ChevronDown className="w-4 h-4 text-stone-400 hidden sm:block" />
            </div>
          </div>
        </header>

        <main className="flex-1 p-5 lg:p-6">
          {children}
        </main>

        {/* Footer */}
        <footer className="px-6 py-3 border-t border-stone-200 bg-white flex items-center justify-between text-xs text-stone-400">
          <span>PanControl - Sistema de Gestión para Panaderías</span>
          <span>© 2026 Ocar David Vega Daza. Todos los derechos reservados.</span>
        </footer>
      </div>
    </div>
  );
}
