'use client';

import { useState } from 'react';
import { CartItem } from '@/lib/promotions/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, Percent, Trash2, Scale, Minus, Hash } from 'lucide-react';

interface CartItemContextMenuProps {
  item: CartItem | null;
  position: { x: number; y: number };
  onClose: () => void;
  onChangeWeight: (itemId: string) => void;
  onChangePrice: (itemId: string, newPrice: number) => Promise<void>;
  onApplyDiscount: (itemId: string, discountType: 'percentage' | 'fixed', discountValue: number) => void;
  onDelete: (itemId: string) => void;
  onReduceQuantity?: (itemId: string) => void;
  onSetQuantity?: (itemId: string, quantity: number) => void;
  onProductsReload?: () => void;
}

export function CartItemContextMenu({
  item,
  position,
  onClose,
  onChangeWeight,
  onChangePrice,
  onApplyDiscount,
  onDelete,
  onReduceQuantity,
  onSetQuantity,
  onProductsReload,
}: CartItemContextMenuProps) {
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [showQuantityDialog, setShowQuantityDialog] = useState(false);
  const [newPrice, setNewPrice] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState('');
  const [newQuantity, setNewQuantity] = useState('');

  if (!item) return null;

  const handleChangeWeight = () => {
    onChangeWeight(item.id);
    onClose();
  };

  const handleChangePrice = () => {
    setNewPrice(item.unit_price.toString());
    setShowPriceDialog(true);
  };

  const handleApplyDiscount = () => {
    setDiscountValue('');
    setShowDiscountDialog(true);
  };

  const handleDelete = () => {
    onDelete(item.id);
    onClose();
  };

  const handleReduceQuantity = () => {
    if (onReduceQuantity) {
      onReduceQuantity(item.id);
    }
    onClose();
  };

  const handleSetQuantity = () => {
    setNewQuantity(item.quantity.toString());
    setShowQuantityDialog(true);
  };

  const confirmPriceChange = async () => {
    const price = parseFloat(newPrice);
    if (price > 0) {
      await onChangePrice(item.id, price);
      setShowPriceDialog(false);
      onClose();
      if (onProductsReload) {
        onProductsReload();
      }
    }
  };

  const confirmDiscountApply = () => {
    const value = parseFloat(discountValue);
    if (value > 0) {
      onApplyDiscount(item.id, discountType, value);
      setShowDiscountDialog(false);
      onClose();
    }
  };

  const confirmQuantityChange = () => {
    const qty = parseFloat(newQuantity);
    if (qty > 0 && onSetQuantity) {
      onSetQuantity(item.id, qty);
      setShowQuantityDialog(false);
      onClose();
    }
  };

  return (
    <>
      <div
        className="fixed bg-white border-2 border-slate-300 rounded-lg shadow-xl z-50 py-2 min-w-[200px]"
        style={{
          left: `${position.x}px`,
          top: `${position.y}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {item.is_weight_item ? (
          <>
            <button
              onClick={handleChangeWeight}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 flex items-center gap-3 text-sm"
            >
              <Scale className="h-4 w-4" />
              Change Weight
            </button>
            <button
              onClick={handleApplyDiscount}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 flex items-center gap-3 text-sm"
            >
              <Percent className="h-4 w-4" />
              Apply Discount
            </button>
            <button
              onClick={handleChangePrice}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 flex items-center gap-3 text-sm"
            >
              <Edit className="h-4 w-4" />
              Change Price/kg
            </button>
            <div className="border-t border-slate-200 my-1" />
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-3 text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete Item
            </button>
          </>
        ) : (
          <>
            <button
              onClick={handleReduceQuantity}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 flex items-center gap-3 text-sm"
              disabled={item.quantity <= 1}
            >
              <Minus className="h-4 w-4" />
              Reduce (-)
            </button>
            <button
              onClick={handleSetQuantity}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 flex items-center gap-3 text-sm"
            >
              <Hash className="h-4 w-4" />
              Set Quantity
            </button>
            <button
              onClick={handleApplyDiscount}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 flex items-center gap-3 text-sm"
            >
              <Percent className="h-4 w-4" />
              Apply Discount
            </button>
            <button
              onClick={handleChangePrice}
              className="w-full px-4 py-2 text-left hover:bg-slate-100 flex items-center gap-3 text-sm"
            >
              <Edit className="h-4 w-4" />
              Change Price
            </button>
            <div className="border-t border-slate-200 my-1" />
            <button
              onClick={handleDelete}
              className="w-full px-4 py-2 text-left hover:bg-red-50 hover:text-red-600 flex items-center gap-3 text-sm"
            >
              <Trash2 className="h-4 w-4" />
              Delete Item
            </button>
          </>
        )}
      </div>

      <Dialog open={showPriceDialog} onOpenChange={(open) => {
        setShowPriceDialog(open);
        if (!open) onClose();
      }}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>
              {item.is_weight_item ? 'Change Price per kg' : 'Change Product Price'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="font-medium mb-2">{item.product_name}</p>
              <p className="text-sm text-slate-600">
                Current: £{item.unit_price.toFixed(2)}{item.is_weight_item ? '/kg' : ''}
              </p>
            </div>
            <div className="space-y-2">
              <Label>New Price (£{item.is_weight_item ? '/kg' : ''})</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') confirmPriceChange();
                }}
                autoFocus
                className="text-lg"
              />
            </div>
            {item.is_weight_item && (
              <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg text-sm">
                <p className="font-medium text-yellow-800">Note:</p>
                <p className="text-yellow-700">
                  This will update the product price in your inventory for future sales.
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowPriceDialog(false);
              onClose();
            }}>
              Cancel
            </Button>
            <Button onClick={confirmPriceChange} disabled={parseFloat(newPrice) <= 0}>
              Update Price
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDiscountDialog} onOpenChange={(open) => {
        setShowDiscountDialog(open);
        if (!open) onClose();
      }}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Apply Discount to Item</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="font-medium mb-2">{item.product_name}</p>
              <p className="text-sm text-slate-600">
                Item Subtotal: £{item.line_subtotal.toFixed(2)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={discountType === 'percentage' ? 'default' : 'outline'}
                onClick={() => setDiscountType('percentage')}
                className="flex-1"
              >
                Percentage
              </Button>
              <Button
                variant={discountType === 'fixed' ? 'default' : 'outline'}
                onClick={() => setDiscountType('fixed')}
                className="flex-1"
              >
                Fixed Amount
              </Button>
            </div>
            <div className="space-y-2">
              <Label>
                {discountType === 'percentage' ? 'Discount (%)' : 'Discount Amount (£)'}
              </Label>
              <Input
                type="number"
                step={discountType === 'percentage' ? '1' : '0.01'}
                min="0"
                max={discountType === 'percentage' ? '100' : item.line_subtotal.toString()}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') confirmDiscountApply();
                }}
                autoFocus
                className="text-lg"
              />
            </div>
            {parseFloat(discountValue) > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-slate-600">Discount Amount</p>
                <p className="text-lg font-bold text-red-600">
                  -£{(
                    discountType === 'percentage'
                      ? (item.line_subtotal * parseFloat(discountValue)) / 100
                      : parseFloat(discountValue)
                  ).toFixed(2)}
                </p>
                <p className="text-sm text-slate-600 mt-2">New Total</p>
                <p className="text-xl font-bold text-blue-600">
                  £{(
                    item.line_subtotal -
                    (discountType === 'percentage'
                      ? (item.line_subtotal * parseFloat(discountValue)) / 100
                      : parseFloat(discountValue))
                  ).toFixed(2)}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowDiscountDialog(false);
              onClose();
            }}>
              Cancel
            </Button>
            <Button onClick={confirmDiscountApply} disabled={parseFloat(discountValue) <= 0}>
              Apply Discount
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showQuantityDialog} onOpenChange={(open) => {
        setShowQuantityDialog(open);
        if (!open) onClose();
      }}>
        <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
          <DialogHeader>
            <DialogTitle>Set Quantity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <p className="font-medium mb-2">{item.product_name}</p>
              <p className="text-sm text-slate-600">
                Current Quantity: {item.quantity}
              </p>
            </div>
            <div className="space-y-2">
              <Label>New Quantity</Label>
              <Input
                type="number"
                step="1"
                min="1"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') confirmQuantityChange();
                }}
                autoFocus
                className="text-lg"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowQuantityDialog(false);
              onClose();
            }}>
              Cancel
            </Button>
            <Button onClick={confirmQuantityChange} disabled={parseFloat(newQuantity) <= 0}>
              Set Quantity
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
