'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Pencil, Trash2, Plus, X, Eye, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_id: string;
  suppliers?: { name: string };
  order_date: string;
  expected_delivery_date: string | null;
  status: string;
  total_amount: number;
}

interface Supplier {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
}

interface POItem {
  product_id: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [poItems, setPoItems] = useState<any[]>([]);
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    supplier_id: '',
    expected_delivery_date: '',
  });

  const [items, setItems] = useState<POItem[]>([{
    product_id: '',
    quantity: 1,
    unit_cost: 0,
    total_cost: 0,
  }]);

  useEffect(() => {
    if (tenantId) {
      fetchPurchaseOrders();
      fetchSuppliers();
      fetchProducts();
    }
  }, [tenantId]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('purchase_orders')
      .select('*, suppliers(name)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setPurchaseOrders(data);
    }
    setLoading(false);
  };

  const fetchSuppliers = async () => {
    const { data } = await (supabase as any)
      .from('suppliers')
      .select('id, name')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setSuppliers(data);
    }
  };

  const fetchProducts = async () => {
    const { data } = await (supabase as any)
      .from('products')
      .select('id, name, sku')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name');

    if (data) {
      setProducts(data);
    }
  };

  const generatePONumber = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `PO-${timestamp}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.supplier_id) {
      toast({ title: 'Please select a supplier', variant: 'destructive' });
      return;
    }

    const validItems = items.filter(item => item.product_id && item.quantity > 0);
    if (validItems.length === 0) {
      toast({ title: 'Please add at least one item', variant: 'destructive' });
      return;
    }

    const subtotal = validItems.reduce((sum, item) => sum + item.total_cost, 0);
    const taxAmount = subtotal * 0.20;
    const total = subtotal + taxAmount;

    const poData = {
      tenant_id: tenantId,
      supplier_id: formData.supplier_id,
      po_number: generatePONumber(),
      order_date: new Date().toISOString(),
      expected_delivery_date: formData.expected_delivery_date || null,
      status: 'draft',
      subtotal,
      tax_amount: taxAmount,
      total_amount: total,
      created_by: user?.id,
    };

    const { data: poResult, error: poError } = await (supabase as any)
      .from('purchase_orders')
      .insert(poData)
      .select()
      .single();

    if (poError) {
      toast({ title: 'Error creating purchase order', variant: 'destructive' });
      return;
    }

    const itemsData = validItems.map(item => ({
      tenant_id: tenantId,
      purchase_order_id: poResult.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_cost: item.unit_cost,
      total_cost: item.total_cost,
    }));

    const { error: itemsError } = await (supabase as any)
      .from('purchase_order_items')
      .insert(itemsData);

    if (!itemsError) {
      toast({ title: 'Purchase order created successfully' });
      fetchPurchaseOrders();
      resetForm();
    } else {
      toast({ title: 'Error adding items to purchase order', variant: 'destructive' });
    }
  };

  const handleItemChange = (index: number, field: keyof POItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };

    if (field === 'quantity' || field === 'unit_cost') {
      newItems[index].total_cost = newItems[index].quantity * newItems[index].unit_cost;
    }

    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, {
      product_id: '',
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
    }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const viewPO = async (po: PurchaseOrder) => {
    setSelectedPO(po);

    const { data } = await (supabase as any)
      .from('purchase_order_items')
      .select('*, products(name, sku)')
      .eq('purchase_order_id', po.id);

    if (data) {
      setPoItems(data);
    }

    setViewDialogOpen(true);
  };

  const updatePOStatus = async (poId: string, status: string) => {
    const { error } = await (supabase as any)
      .from('purchase_orders')
      .update({ status })
      .eq('id', poId);

    if (!error) {
      toast({ title: `Purchase order ${status}` });
      fetchPurchaseOrders();
      if (viewDialogOpen) {
        setViewDialogOpen(false);
      }
    } else {
      toast({ title: 'Error updating status', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this purchase order?')) {
      const { error } = await (supabase as any)
        .from('purchase_orders')
        .delete()
        .eq('id', id);

      if (!error) {
        toast({ title: 'Purchase order deleted successfully' });
        fetchPurchaseOrders();
      } else {
        toast({ title: 'Error deleting purchase order', variant: 'destructive' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      supplier_id: '',
      expected_delivery_date: '',
    });
    setItems([{
      product_id: '',
      quantity: 1,
      unit_cost: 0,
      total_cost: 0,
    }]);
    setDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      draft: 'bg-slate-100 text-slate-700',
      sent: 'bg-blue-100 text-blue-700',
      confirmed: 'bg-orange-100 text-orange-700',
      received: 'bg-green-100 text-green-700',
      cancelled: 'bg-red-100 text-red-700',
    };

    return (
      <Badge className={variants[status] || ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <ModulePage
        title="Purchase Orders"
        description="Create and manage purchase orders from suppliers"
        onAddNew={() => setDialogOpen(true)}
        addNewLabel="Create Purchase Order"
      >
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Expected Delivery</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : purchaseOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center">No purchase orders found</TableCell>
                  </TableRow>
                ) : (
                  purchaseOrders.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">{po.po_number}</TableCell>
                      <TableCell>{po.suppliers?.name}</TableCell>
                      <TableCell>{new Date(po.order_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {po.expected_delivery_date
                          ? new Date(po.expected_delivery_date).toLocaleDateString()
                          : '-'}
                      </TableCell>
                      <TableCell>£{po.total_amount.toFixed(2)}</TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => viewPO(po)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {po.status === 'draft' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(po.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Purchase Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="supplier">Supplier *</Label>
                  <Select
                    value={formData.supplier_id}
                    onValueChange={(value) => setFormData({ ...formData, supplier_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="expected_delivery">Expected Delivery Date</Label>
                  <Input
                    id="expected_delivery"
                    type="date"
                    value={formData.expected_delivery_date}
                    onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-semibold">Items</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>

                {items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-end">
                    <div className="flex-1">
                      <Label>Product</Label>
                      <Select
                        value={item.product_id}
                        onValueChange={(value) => handleItemChange(index, 'product_id', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map(product => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-24">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        min="1"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="w-32">
                      <Label>Unit Cost</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unit_cost}
                        onChange={(e) => handleItemChange(index, 'unit_cost', parseFloat(e.target.value))}
                      />
                    </div>
                    <div className="w-32">
                      <Label>Total</Label>
                      <Input
                        value={item.total_cost.toFixed(2)}
                        readOnly
                        className="bg-slate-50"
                      />
                    </div>
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Subtotal:</span>
                  <span>£{items.reduce((sum, item) => sum + item.total_cost, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span>VAT (20%):</span>
                  <span>£{(items.reduce((sum, item) => sum + item.total_cost, 0) * 0.20).toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>£{(items.reduce((sum, item) => sum + item.total_cost, 0) * 1.20).toFixed(2)}</span>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Purchase Order
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
            </DialogHeader>
            {selectedPO && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">PO Number:</span> {selectedPO.po_number}
                  </div>
                  <div>
                    <span className="font-medium">Supplier:</span> {selectedPO.suppliers?.name}
                  </div>
                  <div>
                    <span className="font-medium">Order Date:</span> {new Date(selectedPO.order_date).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {getStatusBadge(selectedPO.status)}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Items</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Unit Cost</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {poItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.products?.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell>£{item.unit_cost.toFixed(2)}</TableCell>
                          <TableCell>£{item.total_cost.toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="border-t pt-4">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total:</span>
                    <span>£{selectedPO.total_amount.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4 border-t">
                  {selectedPO.status === 'draft' && (
                    <Button onClick={() => updatePOStatus(selectedPO.id, 'sent')}>
                      Send to Supplier
                    </Button>
                  )}
                  {selectedPO.status === 'sent' && (
                    <Button onClick={() => updatePOStatus(selectedPO.id, 'confirmed')}>
                      Mark as Confirmed
                    </Button>
                  )}
                  {selectedPO.status === 'confirmed' && (
                    <Button onClick={() => updatePOStatus(selectedPO.id, 'received')}>
                      <Check className="h-4 w-4 mr-1" />
                      Mark as Received
                    </Button>
                  )}
                  {selectedPO.status !== 'cancelled' && selectedPO.status !== 'received' && (
                    <Button variant="destructive" onClick={() => updatePOStatus(selectedPO.id, 'cancelled')}>
                      Cancel Order
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </ModulePage>
    </DashboardLayout>
  );
}
