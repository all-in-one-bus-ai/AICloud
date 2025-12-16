'use client';

import { DashboardLayout } from '@/components/DashboardLayout';
import { ModulePage } from '@/components/ModulePage';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useTenant } from '@/context/TenantContext';
import { useAuth } from '@/context/AuthContext';
import { Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Supplier {
  id: string;
  name: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  current_balance: number;
  is_active: boolean;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const { tenantId } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    postal_code: '',
    country: 'UK',
  });

  useEffect(() => {
    if (tenantId) {
      fetchSuppliers();
    }
  }, [tenantId]);

  const fetchSuppliers = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('suppliers')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('name');

    if (!error && data) {
      setSuppliers(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const supplierData = {
      ...formData,
      tenant_id: tenantId,
      created_by: user?.id,
    };

    if (editingSupplier) {
      const { error } = await (supabase as any)
        .from('suppliers')
        .update(supplierData)
        .eq('id', editingSupplier.id);

      if (!error) {
        toast({ title: 'Supplier updated successfully' });
        fetchSuppliers();
        resetForm();
      } else {
        toast({ title: 'Error updating supplier', variant: 'destructive' });
      }
    } else {
      const { error } = await (supabase as any)
        .from('suppliers')
        .insert(supplierData);

      if (!error) {
        toast({ title: 'Supplier created successfully' });
        fetchSuppliers();
        resetForm();
      } else {
        toast({ title: 'Error creating supplier', variant: 'destructive' });
      }
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      contact_person: supplier.contact_person || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      city: supplier.city || '',
      postal_code: supplier.postal_code || '',
      country: supplier.country,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this supplier?')) {
      const { error } = await (supabase as any)
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (!error) {
        toast({ title: 'Supplier deleted successfully' });
        fetchSuppliers();
      } else {
        toast({ title: 'Error deleting supplier', variant: 'destructive' });
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      contact_person: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      postal_code: '',
      country: 'UK',
    });
    setEditingSupplier(null);
    setDialogOpen(false);
  };

  return (
    <DashboardLayout>
      <ModulePage
        title="Suppliers"
        description="Manage your suppliers and vendor relationships"
        onAddNew={() => setDialogOpen(true)}
        addNewLabel="Add Supplier"
      >
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact Person</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : suppliers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">No suppliers found</TableCell>
                  </TableRow>
                ) : (
                  suppliers.map((supplier) => (
                    <TableRow key={supplier.id}>
                      <TableCell className="font-medium">{supplier.name}</TableCell>
                      <TableCell>{supplier.contact_person || '-'}</TableCell>
                      <TableCell>{supplier.email || '-'}</TableCell>
                      <TableCell>{supplier.phone || '-'}</TableCell>
                      <TableCell>{supplier.city || '-'}</TableCell>
                      <TableCell>£{supplier.current_balance.toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={supplier.is_active ? 'default' : 'secondary'}>
                          {supplier.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(supplier)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(supplier.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingSupplier ? 'Edit Supplier' : 'Add New Supplier'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Supplier Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="contact_person">Contact Person</Label>
                  <Input
                    id="contact_person"
                    value={formData.contact_person}
                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <Textarea
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal Code</Label>
                  <Input
                    id="postal_code"
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSupplier ? 'Update' : 'Create'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </ModulePage>
    </DashboardLayout>
  );
}
