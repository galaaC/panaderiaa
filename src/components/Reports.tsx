import { useEffect, useState } from 'react';
import { supabase, type Sale, type Production, type Product, type Supply } from '../lib/supabase';
import { BarChart3, TrendingUp, Factory, Package, AlertTriangle, DollarSign, Award, Loader2 } from 'lucide-react';

type Period = 'today' | 'week' | 'month' | 'all';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('month');
  const [sales, setSales] = useState<Sale[]>([]);
  const [productions, setProductions] = useState<Production[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [salesRes, prodRes, prodRes2, supRes] = await Promise.all([
      supabase.from('sales').select('*, sale_items(*, product:products(*))').order('date', { ascending: false }),
      supabase.from('productions').select('*, product:products(*)').order('date', { ascending: false }),
      supabase.from('products').select('*'),
      supabase.from('supplies').select('*'),
    ]);
    setSales(salesRes.data as Sale[] ?? []);
    setProductions(prodRes.data as Production[] ?? []);
    setProducts(prodRes2.data as Product[] ?? []);
    setSupplies(supRes.data as Supply[] ?? []);
    setLoading(false);
  }

  function getPeriodStart(): Date {
    const now = new Date();
    if (period === 'today') {
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (period === 'week') {
      const d = new Date(now);
      d.setDate(d.getDate() - 7);
      return d;
    } else if (period === 'month') {
      const d = new Date(now);
      d.setDate(d.getDate() - 30);
      return d;
    }
    return new Date(2000, 0, 1);
  }

  const periodStart = getPeriodStart();

  const periodSales = sales.filter(s => new Date(s.date) >= periodStart);
  const periodProductions = productions.filter(p => new Date(p.date + 'T00:00') >= periodStart);

  const totalSales = periodSales.reduce((sum, s) => sum + Number(s.total), 0);
  const totalProduction = periodProductions.reduce((sum, p) => sum + Number(p.quantity), 0);
  const salesCount = periodSales.length;

  // Top selling products
  const productSalesMap = new Map<string, { name: string; quantity: number; revenue: number }>();
  periodSales.forEach(sale => {
    sale.sale_items?.forEach(item => {
      const key = item.product_id;
      const existing = productSalesMap.get(key);
      if (existing) {
        existing.quantity += Number(item.quantity);
        existing.revenue += Number(item.subtotal);
      } else {
        productSalesMap.set(key, {
          name: item.product?.name ?? 'Desconocido',
          quantity: Number(item.quantity),
          revenue: Number(item.subtotal),
        });
      }
    });
  });
  const topProducts = Array.from(productSalesMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  // Most produced products
  const productionMap = new Map<string, { name: string; quantity: number }>();
  periodProductions.forEach(p => {
    const key = p.product_id;
    const existing = productionMap.get(key);
    if (existing) {
      existing.quantity += Number(p.quantity);
    } else {
      productionMap.set(key, { name: p.product?.name ?? 'Desconocido', quantity: Number(p.quantity) });
    }
  });
  const topProduced = Array.from(productionMap.values()).sort((a, b) => b.quantity - a.quantity).slice(0, 10);

  // Low stock supplies
  const lowStockSupplies = supplies.filter(s => Number(s.quantity) <= Number(s.min_stock));

  // Low stock products
  const lowStockProducts = products.filter(p => Number(p.quantity) < 10);

  // Estimated profit (revenue - estimated cost of supplies consumed)
  // We calculate based on production: each production consumed supplies per recipe
  // For simplicity, we estimate cost as 40% of revenue (typical bakery margin)
  const estimatedCost = totalSales * 0.4;
  const estimatedProfit = totalSales - estimatedCost;

  // Daily sales chart data
  const dailySalesMap = new Map<string, number>();
  periodSales.forEach(s => {
    const day = s.date.split('T')[0];
    dailySalesMap.set(day, (dailySalesMap.get(day) ?? 0) + Number(s.total));
  });
  const dailySales = Array.from(dailySalesMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-14);
  const maxDailySale = Math.max(...dailySales.map(d => d[1]), 1);

  const periodLabels: Record<Period, string> = {
    today: 'Hoy', week: 'Última semana', month: 'Último mes', all: 'Todo el tiempo',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period selector */}
      <div className="flex gap-1 p-1 bg-white border border-stone-200 rounded-xl w-fit">
        {(['today', 'week', 'month', 'all'] as Period[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              period === p ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' : 'text-stone-500 hover:text-stone-700'
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-md mb-3">
            <DollarSign className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-stone-800">${totalSales.toLocaleString('es-ES')}</p>
          <p className="text-sm text-stone-500 mt-0.5">Ventas totales</p>
          <p className="text-xs text-blue-600 mt-2">{salesCount} transacciones</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-md mb-3">
            <TrendingUp className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-stone-800">${estimatedProfit.toLocaleString('es-ES')}</p>
          <p className="text-sm text-stone-500 mt-0.5">Ganancia estimada</p>
          <p className="text-xs text-green-600 mt-2">Margen ~60%</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md mb-3">
            <Factory className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-stone-800">{totalProduction.toLocaleString('es-ES')}</p>
          <p className="text-sm text-stone-500 mt-0.5">Unidades producidas</p>
          <p className="text-xs text-amber-600 mt-2">{periodProductions.length} lotes</p>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-md mb-3">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <p className="text-2xl font-bold text-stone-800">{lowStockSupplies.length + lowStockProducts.length}</p>
          <p className="text-sm text-stone-500 mt-0.5">Alertas de stock</p>
          <p className="text-xs text-red-600 mt-2">{lowStockSupplies.length} insumos · {lowStockProducts.length} productos</p>
        </div>
      </div>

      {/* Daily sales chart */}
      {dailySales.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-stone-800">Ventas por día</h3>
          </div>
          <div className="flex items-end gap-1 h-48 overflow-x-auto">
            {dailySales.map(([day, amount]) => (
              <div key={day} className="flex flex-col items-center gap-1 flex-1 min-w-[40px]">
                <span className="text-xs text-stone-500 font-medium">
                  ${amount >= 1000 ? `${(amount / 1000).toFixed(0)}K` : amount.toFixed(0)}
                </span>
                <div
                  className="w-full bg-gradient-to-t from-amber-500 to-orange-400 rounded-t-lg transition-all hover:opacity-80"
                  style={{ height: `${(amount / maxDailySale) * 100}%`, minHeight: '4px' }}
                />
                <span className="text-xs text-stone-400">
                  {new Date(day + 'T00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top selling products */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-stone-800">Productos más vendidos</h3>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No hay datos de ventas en este período</p>
          ) : (
            <div className="space-y-3">
              {topProducts.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-amber-100 text-amber-700' :
                    i === 1 ? 'bg-stone-200 text-stone-600' :
                    i === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-stone-100 text-stone-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                    <p className="text-xs text-stone-400">{p.quantity} unidades</p>
                  </div>
                  <span className="text-sm font-semibold text-stone-700">
                    ${p.revenue.toLocaleString('es-ES')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Most produced products */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Factory className="w-5 h-5 text-orange-500" />
            <h3 className="font-semibold text-stone-800">Productos más producidos</h3>
          </div>
          {topProduced.length === 0 ? (
            <p className="text-sm text-stone-400 text-center py-8">No hay datos de producción en este período</p>
          ) : (
            <div className="space-y-3">
              {topProduced.map((p, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? 'bg-orange-100 text-orange-700' :
                    i === 1 ? 'bg-stone-200 text-stone-600' :
                    i === 2 ? 'bg-amber-100 text-amber-700' :
                    'bg-stone-100 text-stone-400'
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-stone-800 truncate">{p.name}</p>
                  </div>
                  <span className="text-sm font-semibold text-stone-700">
                    {p.quantity.toLocaleString('es-ES')} u.
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Low stock details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-red-500" />
            <h3 className="font-semibold text-stone-800">Insumos con stock bajo</h3>
          </div>
          {lowStockSupplies.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Todos los insumos tienen stock suficiente</p>
            </div>
          ) : (
            <div className="space-y-2">
              {lowStockSupplies.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{s.name}</p>
                    <p className="text-xs text-stone-500">Disponible: {s.quantity} {s.unit} · Mínimo: {s.min_stock} {s.unit}</p>
                  </div>
                  <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-lg">
                    {Number(s.quantity) <= 0 ? 'Agotado' : 'Bajo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-stone-800">Productos con stock bajo</h3>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Todos los productos tienen stock suficiente</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-stone-800">{p.name}</p>
                    <p className="text-xs text-stone-500">Disponible: {p.quantity} {p.unit}</p>
                  </div>
                  <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">
                    {Number(p.quantity) <= 0 ? 'Agotado' : 'Bajo'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
