'use client';

import { ReceiptData } from '@/lib/receipt/types';
import { formatCurrency } from '@/lib/receipt/receiptService';
import { format } from 'date-fns';
import { Phone, CreditCard, User, Calendar } from 'lucide-react';

interface ReceiptTemplateProps {
  data: ReceiptData;
}

export function ReceiptTemplate({ data }: ReceiptTemplateProps) {
  const { storeInfo, receiptSettings, taxSettings, transaction, items, totals, membership, cashier } = data;
  const paperWidth = receiptSettings.paper_width === '58mm' ? 'w-[220px]' : 'w-[302px]';

  return (
    <div className={`receipt-container ${paperWidth} mx-auto bg-white p-4 text-slate-900 font-sans`}>
      {receiptSettings.show_logo && storeInfo.logo_url && (
        <div className="flex justify-center mb-3">
          <img
            src={storeInfo.logo_url}
            alt={storeInfo.name}
            className="h-12 object-contain"
          />
        </div>
      )}

      <div className="text-center mb-4">
        <h1 className="text-xl font-bold mb-1">{storeInfo.name}</h1>
        <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
          {storeInfo.address}
        </div>
        <div className="flex items-center justify-center gap-1 text-xs text-slate-600 mt-1">
          <Phone className="w-3 h-3" />
          <span>{storeInfo.phone}</span>
        </div>
        {storeInfo.tagline && (
          <div className="text-xs italic text-slate-500 mt-1">{storeInfo.tagline}</div>
        )}
      </div>

      <div className="border-t border-dashed border-slate-300 my-3"></div>

      <div className="text-xs space-y-1 mb-3">
        <div className="flex justify-between">
          <span className="font-semibold">Receipt #:</span>
          <span className="font-mono">{transaction.receipt_number}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Date:</span>
          <span>{format(transaction.date, 'MMM dd, yyyy')}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">Time:</span>
          <span>{format(transaction.date, 'hh:mm a')}</span>
        </div>
        {receiptSettings.show_cashier_name && (
          <div className="flex justify-between">
            <span className="font-semibold">Cashier:</span>
            <span className="text-blue-600">{cashier.name}</span>
          </div>
        )}
        {receiptSettings.show_payment_method && (
          <div className="flex justify-between">
            <span className="font-semibold">Payment:</span>
            <span className="text-slate-700">{transaction.payment_method}</span>
          </div>
        )}
      </div>

      {membership && (
        <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3 text-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <CreditCard className="w-3 h-3 text-blue-600" />
              <span className="font-semibold">Member Card</span>
            </div>
            <span className="font-mono text-blue-700">{membership.card_number}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-slate-600">Points Earned:</span>
            <span className="font-bold text-green-600">+{membership.points_earned} pts</span>
          </div>
        </div>
      )}

      <div className="border-t border-dashed border-slate-300 my-3"></div>

      <table className="w-full text-xs mb-3">
        <thead>
          <tr className="border-b border-slate-300">
            <th className="text-left font-semibold py-1">Item</th>
            <th className="text-center font-semibold py-1 w-12">Qty</th>
            <th className="text-right font-semibold py-1 w-16">Price</th>
            <th className="text-right font-semibold py-1 w-16">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index} className={index % 2 === 0 ? 'bg-slate-50' : ''}>
              <td className="py-1.5">
                <div className="font-medium">{item.name}</div>
                {item.is_weight_item && item.measured_weight && (
                  <div className="text-slate-500 text-[10px]">
                    {(item.measured_weight / 1000).toFixed(3)} {item.weight_unit} @ {formatCurrency(item.unit_price, storeInfo.currency_symbol)}/{item.weight_unit}
                  </div>
                )}
                {item.line_discount > 0 && (
                  <div className="text-green-600 text-[10px]">
                    Member Discount: -{formatCurrency(item.line_discount, storeInfo.currency_symbol)}
                  </div>
                )}
              </td>
              <td className="text-center py-1.5 font-mono">
                {item.is_weight_item ? (item.measured_weight ? `${(item.measured_weight / 1000).toFixed(2)} ${item.weight_unit}` : '1') : item.quantity}
              </td>
              <td className="text-right py-1.5 font-mono">
                {formatCurrency(item.unit_price, storeInfo.currency_symbol)}
              </td>
              <td className="text-right py-1.5 font-mono font-medium">
                {formatCurrency(item.line_total, storeInfo.currency_symbol)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t border-slate-300 my-3"></div>

      <div className="text-xs space-y-1 mb-3">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-mono">{formatCurrency(totals.subtotal, storeInfo.currency_symbol)}</span>
        </div>
        {totals.total_discount > 0 && (
          <div className="flex justify-between text-green-600">
            <span>Total Discounts:</span>
            <span className="font-mono">-{formatCurrency(totals.total_discount, storeInfo.currency_symbol)}</span>
          </div>
        )}
        {receiptSettings.show_tax_breakdown && taxSettings.tax_enabled && (
          <div className="flex justify-between">
            <span>Tax ({taxSettings.tax_rate}%):</span>
            <span className="font-mono">{formatCurrency(totals.tax_amount, storeInfo.currency_symbol)}</span>
          </div>
        )}
      </div>

      <div className="border-t-2 border-slate-900 my-3"></div>

      <div className="text-sm font-bold mb-2">
        <div className="flex justify-between">
          <span>Total Due:</span>
          <span className="text-lg">{formatCurrency(totals.grand_total, storeInfo.currency_symbol)}</span>
        </div>
      </div>

      {transaction.payment_amount > 0 && (
        <div className="text-xs mb-3">
          <div className="flex justify-between text-blue-600">
            <span>Amount Paid:</span>
            <span className="font-mono">{formatCurrency(transaction.payment_amount, storeInfo.currency_symbol)}</span>
          </div>
        </div>
      )}

      <div className="border-t-2 border-slate-900 my-3"></div>

      {receiptSettings.show_barcode && (
        <div className="my-4">
          <svg className="mx-auto" width="200" height="60">
            <rect x="0" y="0" width="200" height="60" fill="white" />
            {generateBarcodeLines(transaction.receipt_barcode).map((line, i) => (
              <rect
                key={i}
                x={line.x}
                y="5"
                width={line.width}
                height="40"
                fill="black"
              />
            ))}
          </svg>
          <div className="text-center text-[10px] font-mono mt-1">{transaction.receipt_barcode}</div>
        </div>
      )}

      {(storeInfo.whatsapp_number || receiptSettings.show_qr_code) && (
        <div className="grid grid-cols-2 gap-4 my-4">
          {storeInfo.whatsapp_number && (
            <div className="text-center">
              <div className="bg-slate-100 p-2 rounded inline-block">
                <div className="w-16 h-16 bg-green-500 flex items-center justify-center text-white text-xs">
                  QR
                </div>
              </div>
              <div className="text-[10px] text-green-600 mt-1 flex items-center justify-center gap-1">
                <span>📱</span> WhatsApp
              </div>
            </div>
          )}
          {receiptSettings.show_qr_code && (
            <div className="text-center">
              <div className="bg-slate-100 p-2 rounded inline-block">
                <div className="w-16 h-16 bg-blue-500 flex items-center justify-center text-white text-xs">
                  QR
                </div>
              </div>
              <div className="text-[10px] text-blue-600 mt-1 flex items-center justify-center gap-1">
                <span>📄</span> Digital Receipt
              </div>
            </div>
          )}
        </div>
      )}

      <div className="border-t border-dashed border-slate-300 my-3"></div>

      <div className="text-center space-y-2">
        <div className="font-semibold text-sm">Thank You for Shopping!</div>
        <div className="text-xs text-slate-600 leading-relaxed">
          {receiptSettings.thank_you_message}
        </div>
        <div className="text-[10px] text-slate-400 mt-3">
          Receipt generated by CloudPOS
        </div>
      </div>
    </div>
  );
}

function generateBarcodeLines(code: string): Array<{ x: number; width: number }> {
  const lines: Array<{ x: number; width: number }> = [];
  let x = 10;
  const baseWidth = 2;

  for (let i = 0; i < code.length; i++) {
    const char = code.charCodeAt(i);
    const pattern = char % 4;

    if (pattern === 0 || pattern === 2) {
      lines.push({ x, width: baseWidth });
      x += baseWidth + 1;
    } else {
      lines.push({ x, width: baseWidth * 1.5 });
      x += baseWidth * 1.5 + 1;
    }

    if (i % 2 === 0) {
      x += 1;
    }
  }

  return lines;
}
