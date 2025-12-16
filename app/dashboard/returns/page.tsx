'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { DashboardLayout } from '@/components/DashboardLayout';
import { StatsCard } from '@/components/StatsCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Plus, Search, CheckCircle, XCircle, Package, DollarSign } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface Return {
  id: string;
  return_number: string;
  return_date: string;
  customer_id: string;
  reason_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  refund_method: string;
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  notes: string;
  customers: {
    name: string;
  };
  return_reasons: {
    reason: string;
  };
}

interface ReturnItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  condition: string;
  restock: boolean;
  products: {
    name: string;
    sku: string;
  };
}

interface ReturnReason {
  id: string;
  reason: string;
  requires_manager_approval: boolean;
  is_active: boolean;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
}

export default function ReturnsPage() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [returns, setReturns] = useState<Return[]>([]);
  const [returnReasons, setReturnReasons] = useState<ReturnReason[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);

  const [formData, setFormData] = useState({
    customer_id: '',
    reason_id: '',
    refund_method: 'cash',
    notes: '',
  });

  const [lineItems, setLineItems] = useState([
    { product_id: '', quantity: 1, condition: 'new', restock: true },
  ]);

  const [stats, setStats] = useState({
    totalReturns: 0,
    pendingReturns: 0,
    todayReturns: 0,
    totalRefunded: 0,
  });

  useEffect(() => {
    if (tenantId) {
      fetchData();
    }
  }, [tenantId]);

  const fetchData = async () => {
    if (!tenantId) return;

    setLoading(true);
    try {
      const [returnsRes, reasonsRes, customersRes, productsRes] = await Promise.all([
        (supabase as any)
          .from('returns')
          .select('*, customers(name), return_reasons(reason)')
          .eq('tenant_id', tenantId)
          .order('return_date', { ascending: false }),
        (supabase as any)
          .from('return_reasons')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('is_active', true)
          .order('reason'),
        supabase
          .from('customers')
          .select('id, name, email')
          .eq('tenant_id', tenantId)
          .order('name'),
        supabase
          .from('products')
          .select('id, name, sku, price')
          .eq('tenant_id', tenantId)
          .order('name'),
      ]);

      if (returnsRes.data) {
        setReturns(returnsRes.data);
        calculateStats(returnsRes.data);
      }
      if (reasonsRes.data) setReturnReasons(reasonsRes.data);
      if (customersRes.data) setCustomers(customersRes.data);
      if (productsRes.data) setProducts(productsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load returns data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (returnsData: Return[]) => {
    const today = new Date().toDateString();
    setStats({
      totalReturns: returnsData.length,
      pendingReturns: returnsData.filter((r) => r.status === 'pending').length,
      todayReturns: returnsData.filter(
        (r) => new Date(r.return_date).toDateString() === today
      ).length,
      totalRefunded: returnsData
        .filter((r) => r.status === 'completed')
        .reduce((sum, r) => sum + Number(r.total_amount), 0),
    });
  };

  const handleAddReturn = async () => {
    if (!tenantId) return;

    if (!formData.customer_id || !formData.reason_id || lineItems.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    const validItems = lineItems.filter((item) => item.product_id && item.quantity > 0);
    if (validItems.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one product',
        variant: 'destructive',
      });
      return;
    }

    try {
      const returnNumber = `RET-${Date.now()}`;
      let subtotal = 0;

      const itemsWithPrices = validItems.map((item) => {
        const product = products.find((p) => p.id === item.product_id);
        const unitPrice = product?.price || 0;
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;
        return {
          ...item,
          unit_price: unitPrice,
          total_price: totalPrice,
        };
      });

      const taxAmount = subtotal * 0.2;
      const totalAmount = subtotal + taxAmount;

      const { data: returnData, error: returnError } = await (supabase as any)
        .from('returns')
        .insert({
          tenant_id: tenantId,
          return_number: returnNumber,
          customer_id: formData.customer_id,
          reason_id: formData.reason_id,
          refund_method: formData.refund_method,
          status: 'pending',
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          notes: formData.notes,
        })
        .select()
        .single();

      if (returnError) throw returnError;

      const itemsToInsert = itemsWithPrices.map((item) => ({
        tenant_id: tenantId,
        return_id: returnData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        condition: item.condition,
        restock: item.restock,
      }));

      const { error: itemsError } = await (supabase as any)
        .from('return_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Success',
        description: 'Return created successfully',
      });

      setShowAddDialog(false);
      resetForm();
      fetchData();
    } catch (error) {
      console.error('Error creating return:', error);
      toast({
        title: 'Error',
        description: 'Failed to create return',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateStatus = async (returnId: string, newStatus: string) => {
    try {
      const updates: any = { status: newStatus };

      if (newStatus === 'approved') {
        updates.approved_by = (await supabase.auth.getUser()).data.user?.id;
        updates.approved_at = new Date().toISOString();
      }

      if (newStatus === 'completed' && selectedReturn) {
        const items = await (supabase as any)
          .from('return_items')
          .select('*, products(*)')
          .eq('return_id', returnId);

        if (items.data) {
          for (const item of items.data) {
            if (item.restock) {
              await (supabase as any)
                .from('products')
                .update({
                  stock_quantity: (item.products.stock_quantity || 0) + item.quantity,
                })
                .eq('id', item.product_id);
            }
          }
        }
      }

      const { error } = await (supabase as any)
        .from('returns')
        .update(updates)
        .eq('id', returnId);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Return ${newStatus}`,
      });

      setShowDetailsDialog(false);
      fetchData();
    } catch (error) {
      console.error('Error updating return:', error);
      toast({
        title: 'Error',
        description: 'Failed to update return status',
        variant: 'destructive',
      });
    }
  };

  const viewReturnDetails = async (returnData: Return) => {
    setSelectedReturn(returnData);

    const { data: items } = await supabase
      .from('return_items')
      .select('*, products(name, sku)')
      .eq('return_id', returnData.id);

    if (items) {
      setReturnItems(items);
    }

    setShowDetailsDialog(true);
  };

  const resetForm = () => {
    setFormData({
      customer_id: '',
      reason_id: '',
      refund_method: 'cash',
      notes: '',
    });
    setLineItems([{ product_id: '', quantity: 1, condition: 'new', restock: true }]);
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      { product_id: '', quantity: 1, condition: 'new', restock: true },
    ]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'default',
      approved: 'secondary',
      rejected: 'destructive',
      completed: 'default',
    };
    return (
      <Badge variant={variants[status]} className={status === 'completed' ? 'bg-green-500' : ''}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const filteredReturns = returns.filter((ret) => {
    const matchesSearch =
      ret.return_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ret.customers?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ret.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Returns & Refunds</h1>
            <p className="text-muted-foreground">Process customer returns and issue refunds</p>
          </div>
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Return
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Return</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Customer *</Label>
                    <Select
                      value={formData.customer_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, customer_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select customer" />
                      </SelectTrigger>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Return Reason *</Label>
                    <Select
                      value={formData.reason_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, reason_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select reason" />
                      </SelectTrigger>
                      <SelectContent>
                        {returnReasons.map((reason) => (
                          <SelectItem key={reason.id} value={reason.id}>
                            {reason.reason}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Refund Method *</Label>
                  <Select
                    value={formData.refund_method}
                    onValueChange={(value) =>
                      setFormData({ ...formData, refund_method: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="store_credit">Store Credit</SelectItem>
                      <SelectItem value="exchange">Exchange</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Return Items *</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                      <Plus className="h-4 w-4 mr-1" />
                      Add Item
                    </Button>
                  </div>
                  {lineItems.map((item, index) => (
                    <Card key={index} className="p-3 space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Product</Label>
                          <Select
                            value={item.product_id}
                            onValueChange={(value) =>
                              updateLineItem(index, 'product_id', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select product" />
                            </SelectTrigger>
                            <SelectContent>
                              {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                  {product.name} - £{product.price}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Quantity</Label>
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) =>
                              updateLineItem(index, 'quantity', parseFloat(e.target.value))
                            }
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label>Condition</Label>
                          <Select
                            value={item.condition}
                            onValueChange={(value) =>
                              updateLineItem(index, 'condition', value)
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="new">New/Unopened</SelectItem>
                              <SelectItem value="opened">Opened</SelectItem>
                              <SelectItem value="damaged">Damaged</SelectItem>
                              <SelectItem value="defective">Defective</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-end gap-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`restock-${index}`}
                              checked={item.restock}
                              onChange={(e) =>
                                updateLineItem(index, 'restock', e.target.checked)
                              }
                              className="rounded"
                            />
                            <Label htmlFor={`restock-${index}`}>Restock</Label>
                          </div>
                          {lineItems.length > 1 && (
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              onClick={() => removeLineItem(index)}
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddReturn}>Create Return</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Total Returns"
            value={stats.totalReturns}
            icon={Package}
          />
          <StatsCard
            title="Pending Returns"
            value={stats.pendingReturns}
            icon={Package}
          />
          <StatsCard
            title="Today's Returns"
            value={stats.todayReturns}
            icon={Package}
          />
          <StatsCard
            title="Total Refunded"
            value={`£${stats.totalRefunded.toFixed(2)}`}
            icon={DollarSign}
          />
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by return number or customer..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Return #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Reason</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Refund Method</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReturns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No returns found
                  </TableCell>
                </TableRow>
              ) : (
                filteredReturns.map((ret) => (
                  <TableRow key={ret.id}>
                    <TableCell className="font-medium">{ret.return_number}</TableCell>
                    <TableCell>
                      {format(new Date(ret.return_date), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>{ret.customers?.name}</TableCell>
                    <TableCell>{ret.return_reasons?.reason}</TableCell>
                    <TableCell>{getStatusBadge(ret.status)}</TableCell>
                    <TableCell className="capitalize">{ret.refund_method}</TableCell>
                    <TableCell>£{Number(ret.total_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewReturnDetails(ret)}
                      >
                        View Details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Return Details</DialogTitle>
            </DialogHeader>
            {selectedReturn && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-muted-foreground">Return Number</Label>
                    <p className="font-medium">{selectedReturn.return_number}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Customer</Label>
                    <p className="font-medium">{selectedReturn.customers?.name}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Date</Label>
                    <p className="font-medium">
                      {format(new Date(selectedReturn.return_date), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground">Status</Label>
                    <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                  </div>
                </div>

                <div>
                  <Label className="text-muted-foreground">Return Items</Label>
                  <Table className="mt-2">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Condition</TableHead>
                        <TableHead>Unit Price</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {returnItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.products?.name}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="capitalize">{item.condition}</TableCell>
                          <TableCell>£{Number(item.unit_price).toFixed(2)}</TableCell>
                          <TableCell>£{Number(item.total_price).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="space-y-2 border-t pt-4">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>£{Number(selectedReturn.subtotal).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (20%):</span>
                    <span>£{Number(selectedReturn.tax_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>£{Number(selectedReturn.total_amount).toFixed(2)}</span>
                  </div>
                </div>

                {selectedReturn.notes && (
                  <div>
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="mt-1">{selectedReturn.notes}</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  {selectedReturn.status === 'pending' && (
                    <>
                      <Button
                        variant="destructive"
                        onClick={() => handleUpdateStatus(selectedReturn.id, 'rejected')}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        onClick={() => handleUpdateStatus(selectedReturn.id, 'approved')}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve
                      </Button>
                    </>
                  )}
                  {selectedReturn.status === 'approved' && (
                    <Button
                      onClick={() => handleUpdateStatus(selectedReturn.id, 'completed')}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Complete Refund
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
