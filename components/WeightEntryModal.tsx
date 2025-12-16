'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WeightEntryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (weight: number) => void;
  product: {
    name: string;
    price_per_unit: number;
    weight_unit: string;
    min_quantity_step: number;
  } | null;
}

export function WeightEntryModal({ open, onOpenChange, onConfirm, product }: WeightEntryModalProps) {
  const [weight, setWeight] = useState('');

  useEffect(() => {
    if (open) {
      setWeight('');
    }
  }, [open]);

  if (!product) return null;

  const weightInGrams = parseFloat(weight) || 0;
  const weightInKg = weightInGrams / 1000;
  const total = weightInKg * product.price_per_unit;

  const handleConfirm = () => {
    if (weightInGrams <= 0) return;
    onConfirm(weightInGrams);
    onOpenChange(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && weightInGrams > 0) {
      handleConfirm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Weight</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-lg mb-2">{product.name}</p>
            <p className="text-sm text-slate-600">
              £{product.price_per_unit.toFixed(2)} per kg
            </p>
          </div>

          <div>
            <Label>Weight (g)</Label>
            <Input
              type="number"
              step="1"
              min="1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter weight (min: 1 g)"
              autoFocus
              className="text-lg"
            />
            <p className="text-xs text-slate-500 mt-1">
              Minimum step: 1 g
            </p>
          </div>

          {weightInGrams > 0 && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-slate-600">Total</p>
              <p className="text-2xl font-bold text-blue-600">
                £{total.toFixed(2)}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                {weightInGrams} g ({weightInKg.toFixed(3)} kg) × £{product.price_per_unit.toFixed(2)}/kg
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={weightInGrams <= 0}>
            Add to Cart
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
