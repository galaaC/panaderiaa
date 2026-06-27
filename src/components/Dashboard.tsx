import { useEffect, useState, useMemo } from 'react';
import { supabase, type Product, type Supply, type Production, type Sale, type Category } from '../lib/supabase';
import { Croissant, TrendingUp, ShoppingCart, AlertTriangle, ChevronRight, Image as ImageIcon } from 'lucide-react';

type SaleWithItems = Sale;
type ProductionWithProduct = Production;
type ProductWithCategory = Product;

// SVG Line Chart
function SalesChart({ data }: { data: { label: string; total: number }[] }) {
  const W = 300, H = 140;
  const PAD = { top: 10, right: 10, bottom: 30, left: 55 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const maxVal = Math.max(...data.map(d => d.total), 1);

  const pts = data.map((d, i) => ({
    x: PAD.left + (data.length < 2 ? plotW / 2 : (i / (data.length - 1)) * plotW),
    y: PAD.top + plotH - (d.total / maxVal) * plotH,
    label: d.label,
    total: d.total,
  }));

  function smoothLine(points: typeof pts) {
    if (points.length < 2) return `M ${points[0]?.x ?? 0} ${points[0]?.y ?? 0}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1];
      const c = points[i];
      const cx = (c.x - p.x) / 2.5;
      d += ` C ${p.x + cx} ${p.y}, ${c.x - cx} ${c.y}, ${c.x} ${c.y}`;
    }
    return d;
  }

  const linePath = smoothLine(pts);
  const fillPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1].x} ${PAD.top + plotH} L ${pts[0].x} ${PAD.top + plotH} Z`
    : '';

  const yLabels = [0, Math.round(maxVal / 2), maxVal];

  function fmtMoney(v: number) {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
    return `$${v}`;
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: H }}>
      <defs>
        <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0.01" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {yLabels.map((v, i) => {
        const y = PAD.top + plotH - (v / maxVal) * plotH;
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#e5e7eb" strokeWidth="1" />
            <text x={PAD.left - 4} y={y + 4} textAnchor="end" fontSize="9" fill="#9ca3af">
              {fmtMoney(v)}
            </text>
          </g>
        );
      })}

      {/* Fill */}
      {fillPath && <path d={fillPath} fill="url(#chartFill)" />}

      {/* Line */}
      {linePath && <path d={linePath} fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />}

      {/* Dots + X labels */}
      {pts.map((pt, i) => (
        <g key={i}>
          <circle cx={pt.x} cy={pt.y} r="3.5" fill="#22c55e" stroke="white" strokeWidth="1.5" />
          <text x={pt.x} y={H - 4} textAnchor="middle" fontSize="8.5" fill="#9ca3af">
            {pt.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

// Product avatar thumbnail
function ProductThumb({ product }: { product?: Product | null }) {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0 bg-amber-50 flex items-center justify-center border border-stone-200">
      {product?.image_url ? (
        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
      ) : (
        <Croissant className="w-4 h-4 text-amber-400" />
      )}
    </div>
  );
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [supplies, setSupplies] = useState<Supply[]>([]);
  const [todayProductions, setTodayProductions] = useState<ProductionWithProduct[]>([]);
  const [todaySales, setTodaySales] = useState<SaleWithItems[]>([]);
  const [weekSales, setWeekSales] = useState<Sale[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => { loadDashboard(); }, []);

  async function loadDashboard() {
    setLoading(true);
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [prodRes, catsRes, supRes, prodTodayRes, salesTodayRes, weekSalesRes] = await Promise.all([
      supabase.from('products').select('*, category:categories(*)').order('name'),
      supabase.from('categories').select('*').order('name'),
      supabase.from('supplies').select('*').order('name'),
      supabase.from('productions').select('*, product:products(*)').eq('date', today).order('created_at', { ascending: false }).limit(6),
      supabase.from('sales').select('*, sale_items(*, product:products(*))').gte('date', today + 'T00:00:00').order('date', { ascending: false }).limit(6),
      supabase.from('sales').select('*').gte('date', weekAgo).order('date', { ascending: true }),
    ]);

    setProducts(prodRes.data as ProductWithCategory[] ?? []);
    setCategories(catsRes.data as Category[] ?? []);
    setSupplies(supRes.data as Supply[] ?? []);
    setTodayProductions(prodTodayRes.data as ProductionWithProduct[] ?? []);
    setTodaySales(salesTodayRes.data as SaleWithItems[] ?? []);
    setWeekSales(weekSalesRes.data as Sale[] ?? []);
    setLoading(false);
  }

  const totalProductQty = products.reduce((sum, p) => sum + Number(p.quantity), 0);
  const totalTodayProduction = todayProductions.reduce((sum, p) => sum + Number(p.quantity), 0);
  const totalTodaySales = todaySales.reduce((sum, s) => sum + Number(s.total), 0);
  const lowStockSupplies = supplies.filter(s => Number(s.quantity) <= Number(s.min_stock));

  // Last 7 days chart data
  const chartData = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return d;
    });
    return days.map(d => {
      const dateStr = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }).replace('.', '');
      const total = weekSales
        .filter(s => s.date.split('T')[0] === dateStr)
        .reduce((sum, s) => sum + Number(s.total), 0);
      return { label, total };
    });
  }, [weekSales]);

  const weekTotal = chartData.reduce((sum, d) => sum + d.total, 0);

  // Today's sold items (flattened from sales)
  const todaySoldItems = useMemo(() => {
    const map = new Map<string, { product?: Product | null; quantity: number; subtotal: number }>();
    for (const sale of todaySales) {
      for (const item of sale.sale_items ?? []) {
        const key = item.product?.id ?? item.id;
        const existing = map.get(key);
        if (existing) {
          existing.quantity += Number(item.quantity);
          existing.subtotal += Number(item.subtotal);
        } else {
          map.set(key, { product: item.product, quantity: Number(item.quantity), subtotal: Number(item.subtotal) });
        }
      }
    }
    return Array.from(map.values()).slice(0, 6);
  }, [todaySales]);

  // Filtered products for inventory
  const filteredProducts = selectedCategory === 'all'
    ? products
    : products.filter(p => p.category_id === selectedCategory);

  const stats = [
    {
      label: 'PRODUCTOS DISPONIBLES',
      value: totalProductQty.toLocaleString('es-ES'),
      sub: 'unidades',
      icon: Croissant,
      bg: 'bg-orange-500',
      link: 'Ver detalles',
    },
    {
      label: 'PRODUCCIÓN DE HOY',
      value: totalTodayProduction.toLocaleString('es-ES'),
      sub: 'unidades',
      icon: TrendingUp,
      bg: 'bg-green-500',
      link: 'Ver detalles',
    },
    {
      label: 'VENTAS DE HOY',
      value: `$ ${totalTodaySales.toLocaleString('es-ES')}`,
      sub: 'Total vendido',
      icon: ShoppingCart,
      bg: 'bg-blue-500',
      link: 'Ver detalles',
    },
    {
      label: 'INSUMOS BAJOS EN STOCK',
      value: String(lowStockSupplies.length),
      sub: 'productos',
      icon: AlertTriangle,
      bg: 'bg-violet-500',
      link: 'Ver detalles',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className="flex items-stretch">
                <div className={`${stat.bg} flex items-center justify-center px-4 py-5 w-20 flex-shrink-0`}>
                  <Icon className="w-8 h-8 text-white" strokeWidth={1.8} />
                </div>
                <div className="flex-1 px-4 py-4">
                  <p className="text-[10px] font-semibold tracking-wider text-stone-400 uppercase mb-1">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-stone-800 leading-none">
                    {stat.value} <span className="text-sm font-normal text-stone-400">{stat.sub}</span>
                  </p>
                  <button className="mt-2 flex items-center gap-1 text-xs text-blue-500 hover:text-blue-600 font-medium">
                    {stat.link} <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Middle row: production | sales | chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Producción de hoy */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Producción de hoy</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-stone-400">Producto</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-stone-400">Cantidad</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-stone-400">Unidad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {todayProductions.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-stone-400">
                      Sin producción hoy
                    </td>
                  </tr>
                ) : todayProductions.map(p => (
                  <tr key={p.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ProductThumb product={p.product} />
                        <span className="text-sm text-stone-700 font-medium">{p.product?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right font-semibold text-stone-700">
                      {Number(p.quantity).toLocaleString('es-ES')}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-stone-400">
                      {p.product?.unit ?? 'und'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-stone-50">
            <button className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1">
              Ver toda la producción <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Ventas de hoy */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Ventas de hoy</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-stone-400">Producto</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-stone-400">Cant.</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-stone-400">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {todaySoldItems.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-stone-400">
                      Sin ventas hoy
                    </td>
                  </tr>
                ) : todaySoldItems.map((item, i) => (
                  <tr key={i} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ProductThumb product={item.product} />
                        <span className="text-sm text-stone-700 font-medium">{item.product?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right font-semibold text-stone-700">
                      {item.quantity}
                    </td>
                    <td className="px-4 py-2.5 text-sm text-right text-stone-700 font-medium">
                      $ {item.subtotal.toLocaleString('es-ES')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-stone-50">
            <button className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1">
              Ver todas las ventas <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Resumen de ventas (chart) */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Resumen de ventas</h3>
            <span className="text-xs text-stone-400 bg-stone-50 px-2 py-1 rounded-lg border border-stone-200">
              Esta semana
            </span>
          </div>
          <div className="p-4">
            <SalesChart data={chartData} />
          </div>
          <div className="px-5 pb-4 border-t border-stone-50 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 font-medium">Total ventas semana:</span>
              <span className="text-sm font-bold text-stone-800">
                $ {weekTotal.toLocaleString('es-ES')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row: inventory grid + low stock */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Inventario de productos */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Inventario de productos</h3>
          </div>

          {/* Category filter tabs */}
          <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-stone-50">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                selectedCategory === 'all'
                  ? 'bg-green-500 text-white'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Todos
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-green-500 text-white'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Product cards */}
          <div className="p-4">
            {filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-stone-400">
                <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
                <p className="text-sm">No hay productos en esta categoría</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                {filteredProducts.slice(0, 12).map(p => {
                  const qty = Number(p.quantity);
                  const isLow = qty < 10;
                  return (
                    <div key={p.id} className="rounded-xl overflow-hidden border border-stone-100 hover:shadow-md transition-shadow group">
                      <div className="h-20 bg-stone-50 overflow-hidden">
                        {p.image_url ? (
                          <img
                            src={p.image_url}
                            alt={p.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-50 to-orange-50">
                            <Croissant className="w-8 h-8 text-amber-200" />
                          </div>
                        )}
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-stone-800 leading-tight truncate">{p.name}</p>
                        <p className={`text-[11px] mt-0.5 font-medium ${isLow ? 'text-red-500' : 'text-green-600'}`}>
                          Disponible: {qty} {p.unit}
                        </p>
                        <p className="text-[11px] text-stone-500">
                          Precio: $ {Number(p.price).toLocaleString('es-ES')}
                        </p>
                        <button className="text-[11px] text-blue-500 hover:text-blue-600 font-medium mt-1">
                          Ver más
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Insumos con bajo stock */}
        <div className="bg-white rounded-2xl border border-stone-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Insumos con bajo stock</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-stone-50">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-stone-400">Insumo</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-stone-400">Disp.</th>
                  <th className="text-right px-4 py-2 text-xs font-semibold text-stone-400">Mín.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {lowStockSupplies.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-6 text-center text-sm text-stone-400">
                      Sin alertas de stock
                    </td>
                  </tr>
                ) : lowStockSupplies.map(s => (
                  <tr key={s.id} className="hover:bg-stone-50 transition-colors">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-stone-700">{s.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`text-xs font-semibold ${Number(s.quantity) === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                        {s.quantity} {s.unit}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right text-xs text-stone-400">
                      {s.min_stock} {s.unit}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lowStockSupplies.length > 0 && (
            <div className="px-5 py-3 border-t border-stone-50">
              <button className="text-xs text-blue-500 hover:text-blue-600 font-medium flex items-center gap-1">
                Ver todos los insumos <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
