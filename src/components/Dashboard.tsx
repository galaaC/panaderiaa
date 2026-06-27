import { useEffect, useState } from 'react';
import { supabase, type Product, type Supply, type Sale } from '../lib/supabase';
import { Package, Wheat, ShoppingCart, TrendingUp, AlertTriangle, Clock, ArrowUpRight } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [productCount, setProductCount] = useState(0);
  const [supplyCount, setSupplyCount] = useState(0);
  const [todaySales, setTodaySales] = useState(0);
  const [todayProduction, setTodayProduction] = useState(0);
  const [lowStockSupplies, setLowStockSupplies] = useState<Supply[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentSales, setRecentSales] = useState<Sale[]>([]);
  const [totalProducts, setTotalProducts] = useState(0);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);

    const [productsRes, suppliesRes, salesRes, prodRes] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('supplies').select('*'),
      supabase.from('sales').select('*').order('date', { ascending: false }).limit(5),
      supabase.from('productions').select('*').eq('date', new Date().toISOString().split('T')[0]),
    ]);

    const products = productsRes.data as Product[] ?? [];
    const supplies = suppliesRes.data as Supply[] ?? [];
    const sales = salesRes.data as Sale[] ?? [];
    const productions = prodRes.data ?? [];

    setProductCount(products.length);
    setSupplyCount(supplies.length);
    setTotalProducts(products.reduce((sum, p) => sum + Number(p.quantity), 0));

    const today = new Date().toISOString().split('T')[0];
    const todaySalesTotal = sales
      .filter(s => s.date.split('T')[0] === today)
      .reduce((sum, s) => sum + Number(s.total), 0);
    setTodaySales(todaySalesTotal);
    setTodayProduction(productions.reduce((sum, p) => sum + Number(p.quantity), 0));
    setRecentSales(sales);

    setLowStockSupplies(supplies.filter(s => Number(s.quantity) <= Number(s.min_stock)));
    setLowStockProducts(products.filter(p => Number(p.quantity) < 10));

    setLoading(false);
  }

  const stats = [
    {
      label: 'Productos en Inventario',
      value: totalProducts,
      sub: `${productCount} tipos`,
      icon: Package,
      color: 'from-amber-500 to-orange-600',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    {
      label: 'Insumos Registrados',
      value: supplyCount,
      sub: `${lowStockSupplies.length} con stock bajo`,
      icon: Wheat,
      color: 'from-green-500 to-emerald-600',
      bg: 'bg-green-50',
      text: 'text-green-700',
    },
    {
      label: 'Ventas de Hoy',
      value: `$${todaySales.toLocaleString('es-ES')}`,
      sub: `${recentSales.filter(s => s.date.split('T')[0] === new Date().toISOString().split('T')[0]).length} transacciones`,
      icon: ShoppingCart,
      color: 'from-blue-500 to-cyan-600',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      label: 'Producción de Hoy',
      value: todayProduction,
      sub: 'unidades producidas',
      icon: TrendingUp,
      color: 'from-purple-500 to-pink-600',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={i}
              className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center shadow-md`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
              <p className="text-2xl font-bold text-stone-800">{stat.value}</p>
              <p className="text-sm text-stone-500 mt-0.5">{stat.label}</p>
              <p className={`text-xs mt-2 ${stat.text}`}>{stat.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low stock alerts */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <h3 className="font-semibold text-stone-800">Alertas de Stock</h3>
          </div>

          {lowStockSupplies.length === 0 && lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <Package className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay alertas de stock</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {lowStockSupplies.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 bg-red-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-red-500 rounded-full" />
                    <div>
                      <p className="text-sm font-medium text-stone-800">{s.name}</p>
                      <p className="text-xs text-stone-500">Insumo · {s.quantity} {s.unit} disponible</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-red-600 bg-red-100 px-2 py-1 rounded-lg">
                    Mín: {s.min_stock} {s.unit}
                  </span>
                </div>
              ))}
              {lowStockProducts.map(p => (
                <div key={p.id} className="flex items-center justify-between p-3 bg-amber-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <div>
                      <p className="text-sm font-medium text-stone-800">{p.name}</p>
                      <p className="text-xs text-stone-500">Producto · {p.quantity} {p.unit} disponible</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-lg">
                    Stock bajo
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent sales */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-500" />
            <h3 className="font-semibold text-stone-800">Ventas Recientes</h3>
          </div>

          {recentSales.length === 0 ? (
            <div className="text-center py-8 text-stone-400">
              <ShoppingCart className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p>No hay ventas registradas</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl hover:bg-stone-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                      <ShoppingCart className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-800">
                        ${Number(sale.total).toLocaleString('es-ES')}
                      </p>
                      <p className="text-xs text-stone-400">
                        {new Date(sale.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-green-500" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
