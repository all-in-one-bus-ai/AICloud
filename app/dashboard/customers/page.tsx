'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Plus, Pencil, Trash2, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/lib/supabase/types';

type Customer = Database['public']['Tables']['customers']['Row'];

export default function CustomersPage() {
  const { tenantId } = useTenant();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (tenantId) {
      loadCustomers();
    }
  }, [tenantId]);

  const loadCustomers = async () => {
    if (!tenantId) return;

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to load customers',
        variant: 'destructive',
      });
      return;
    }

    setCustomers(data || []);
  };

  const openCreateDialog = () => {
    setEditingCustomer(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
    });
    setShowDialog(true);
  };

  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
    });
    setShowDialog(true);
  };

  const handleSave = async () => {
    if (!tenantId || !formData.name) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in customer name',
        variant: 'destructive',
      });
      return;
    }

    const customerData = {
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      address: formData.address || null,
    };

    if (editingCustomer) {
      const { error } = await (supabase as any)
        .from('customers')
        .update(customerData)
        .eq('id', editingCustomer.id);

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to update customer',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Customer updated successfully',
      });
    } else {
      const { error } = await (supabase as any)
        .from('customers')
        .insert({
          ...customerData,
          tenant_id: tenantId,
        });

      if (error) {
        toast({
          title: 'Error',
          description: 'Failed to create customer',
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'Customer created successfully',
      });
    }

    setShowDialog(false);
    loadCustomers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete customer',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Success',
      description: 'Customer deleted successfully',
    });

    loadCustomers();
  };

  const filteredCustomers = customers.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.phone && c.phone.includes(searchQuery))
  );

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Customers</h1>
            <p className="text-slate-600 mt-1">Manage customer information</p>
          </div>
          <Button onClick={openCreateDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Customer
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="mb-4">
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>

            <div className="rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900">Email</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900">Phone</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-slate-900">Address</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-slate-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium">{customer.name}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{customer.email || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{customer.phone || '-'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{customer.address || '-'}</td>
                        <td className="px-4 py-3 text-sm text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(customer)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(customer.id)}
                            >
                              <Trash2 className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                          <Users className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                          <p>No customers found</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingCustomer ? 'Edit Customer' : 'Add Customer'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter phone number"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                {editingCustomer ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
