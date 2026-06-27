import { useRef } from 'react';
import type { Sale } from '../lib/supabase';
import { X, Printer, ShoppingBag, Clock, Calendar } from 'lucide-react';

interface InvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale | null;
  invoiceNumber: number;
}

export default function InvoiceModal({
  isOpen,
  onClose,
  sale,
  invoiceNumber,
}: InvoiceModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !sale) return null;

  const currentDate = new Date(sale.date);
  const items = sale.sale_items ?? [];

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Factura #${invoiceNumber}</title>
          <style>
            @page { size: 80mm auto; margin: 0; }
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              padding: 10px;
              width: 80mm;
            }
            .header { text-align: center; margin-bottom: 15px; }
            .logo { font-size: 18px; font-weight: bold; margin-bottom: 5px; }
            .subtitle { font-size: 10px; color: #666; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .info-row { display: flex; justify-content: space-between; margin: 3px 0; font-size: 11px; }
            .items-table { width: 100%; margin: 10px 0; }
            .items-table th { text-align: left; font-size: 10px; padding: 5px 0; border-bottom: 1px solid #000; }
            .items-table td { font-size: 11px; padding: 4px 0; }
            .items-table td:last-child, .items-table th:last-child { text-align: right; }
            .total-row { font-weight: bold; font-size: 14px; display: flex; justify-content: space-between; margin-top: 10px; padding-top: 10px; border-top: 2px solid #000; }
            .footer { text-align: center; margin-top: 15px; font-size: 10px; color: #666; }
            .thank-you { font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-stone-50">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-stone-800">Factura #{invoiceNumber}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200 transition-colors"
            >
              <Printer className="w-4 h-4" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:bg-stone-200 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Preview / Print Content */}
          <div ref={printRef} className="bg-white">
            {/* Header */}
            <div className="header text-center mb-6 print:mb-3">
              <div className="logo text-2xl font-bold text-stone-800 print:text-base">PanControl</div>
              <div className="subtitle text-stone-500">Sistema de Gestión para Panaderías</div>
            </div>

            <div className="divider border-t border-dashed border-stone-300 print:border-black my-4 print:my-2" />

            {/* Invoice Info */}
            <div className="space-y-2 mb-6 print:mb-3">
              <div className="info-row flex justify-between text-sm print:text-[11px]">
                <span className="flex items-center gap-1.5 text-stone-500">
                  <Hash className="w-3.5 h-3.5 print:hidden" />
                  Factura:
                </span>
                <span className="font-medium text-stone-800">#{invoiceNumber}</span>
              </div>
              <div className="info-row flex justify-between text-sm print:text-[11px]">
                <span className="flex items-center gap-1.5 text-stone-500">
                  <Calendar className="w-3.5 h-3.5 print:hidden" />
                  Fecha:
                </span>
                <span className="text-stone-800">
                  {currentDate.toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric'
                  })}
                </span>
              </div>
              <div className="info-row flex justify-between text-sm print:text-[11px]">
                <span className="flex items-center gap-1.5 text-stone-500">
                  <Clock className="w-3.5 h-3.5 print:hidden" />
                  Hora:
                </span>
                <span className="text-stone-800">
                  {currentDate.toLocaleTimeString('es-ES', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>

            <div className="divider border-t border-dashed border-stone-300 print:border-black my-4 print:my-2" />

            {/* Items */}
            <div className="items-table">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-stone-200 print:border-black">
                    <th className="text-left text-xs font-semibold text-stone-500 pb-2">Producto</th>
                    <th className="text-center text-xs font-semibold text-stone-500 pb-2">Cant.</th>
                    <th className="text-right text-xs font-semibold text-stone-500 pb-2">Precio</th>
                    <th className="text-right text-xs font-semibold text-stone-500 pb-2">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b border-stone-100 print:border-none">
                      <td className="py-2 text-sm text-stone-800 print:text-[11px]">
                        {item.product?.name ?? 'Producto'}
                      </td>
                      <td className="py-2 text-center text-sm text-stone-600 print:text-[11px]">
                        {item.quantity}
                      </td>
                      <td className="py-2 text-right text-sm text-stone-600 print:text-[11px]">
                        ${Number(item.price).toLocaleString('es-ES')}
                      </td>
                      <td className="py-2 text-right text-sm font-medium text-stone-800 print:text-[11px]">
                        ${Number(item.subtotal).toLocaleString('es-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divider border-t border-dashed border-stone-300 print:border-black my-4 print:my-2" />

            {/* Total */}
            <div className="total-row flex justify-between items-center pt-4 print:pt-2 border-t-2 border-stone-800">
              <span className="text-stone-600 text-lg print:text-sm">TOTAL:</span>
              <span className="text-stone-900 text-2xl font-bold print:text-base">
                ${Number(sale.total).toLocaleString('es-ES')}
              </span>
            </div>

            {/* Footer */}
            <div className="footer text-center mt-8 print:mt-4">
              <p className="thank-you text-stone-600 text-sm print:text-xs">
                ¡Gracias por su compra!
              </p>
              <p className="text-stone-400 text-xs mt-2 print:mt-1">
                Conserve este comprobante
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hash({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="9" x2="20" y2="9" />
      <line x1="4" y1="15" x2="20" y2="15" />
      <line x1="10" y1="3" x2="8" y2="21" />
      <line x1="16" y1="3" x2="14" y2="21" />
    </svg>
  );
}
