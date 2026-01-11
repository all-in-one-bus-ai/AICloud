'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Store, Receipt, Tag, DollarSign, Upload } from 'lucide-react';
import { useTenant } from '@/context/TenantContext';
import { getStoreSettings, upsertStoreSettings, uploadLogo, type StoreSettings } from '@/lib/settings/storeSettingsService';
import { getReceiptSettings, upsertReceiptSettings, type ReceiptSettings } from '@/lib/settings/receiptSettingsService';
import { getTaxSettings, upsertTaxSettings, type TaxSettings } from '@/lib/settings/taxSettingsService';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SuccessDialog } from '@/components/SuccessDialog';

export function StoreInfoTab() {
  const { tenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [storeSettings, setStoreSettings] = useState<Partial<StoreSettings>>({
    store_name: '',
    tagline: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
    whatsapp_number: '',
    currency_symbol: '£',
    currency_code: 'GBP',
    timezone: 'Europe/London',
  });

  const [receiptSettings, setReceiptSettings] = useState<Partial<ReceiptSettings>>({
    paper_width: '80mm',
    show_logo: true,
    show_barcode: true,
    show_qr_code: false,
    barcode_type: 'CODE128',
    header_text: '',
    footer_text: 'Thank you for your purchase!',
    greeting_message: 'Welcome!',
    thank_you_message: 'Thank you for shopping with us!',
    show_tax_breakdown: true,
    show_item_details: true,
    show_cashier_name: true,
    show_payment_method: true,
  });

  const [taxSettings, setTaxSettings] = useState<Partial<TaxSettings>>({
    tax_name: 'VAT',
    tax_rate: 20.0,
    tax_enabled: true,
    tax_inclusive: true,
  });

  const [loyaltySettings, setLoyaltySettings] = useState<any>({
    is_enabled: true,
    earn_rate_value: 0.01,
    redeem_value_per_coin: 1.0,
    min_coins_to_redeem: 10,
    membership_barcode_prefix: 'MEM',
  });

  useEffect(() => {
    if (tenantId) {
      loadSettings();
    }
  }, [tenantId]);

  const loadSettings = async () => {
    if (!tenantId) return;

    try {
      setLoading(true);

      const [store, receipt, tax, loyalty] = await Promise.all([
        getStoreSettings(tenantId),
        getReceiptSettings(tenantId),
        getTaxSettings(tenantId),
        supabase.from('loyalty_settings').select('*').eq('tenant_id', tenantId).maybeSingle(),
      ]);

      if (store) setStoreSettings(store);
      if (receipt) setReceiptSettings(receipt);
      if (tax) setTaxSettings(tax);
      if (loyalty.data) setLoyaltySettings(loyalty.data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStoreInfo = async () => {
    if (!tenantId) {
      toast.error('No tenant ID found');
      return;
    }

    if (!storeSettings.store_name || storeSettings.store_name.trim() === '') {
      toast.error('Store name is required');
      return;
    }

    if (storeSettings.email && storeSettings.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(storeSettings.email)) {
        toast.error('Please enter a valid email address');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('Saving store info with tenant_id:', tenantId);
      console.log('Current store settings:', storeSettings);

      const settingsToSave = {
        tenant_id: tenantId,
        store_name: storeSettings.store_name.trim(),
        tagline: storeSettings.tagline || '',
        address: storeSettings.address || '',
        phone: storeSettings.phone || '',
        email: storeSettings.email || '',
        website: storeSettings.website || '',
        logo_url: storeSettings.logo_url || null,
        whatsapp_number: storeSettings.whatsapp_number || '',
        whatsapp_qr_url: storeSettings.whatsapp_qr_url || null,
        currency_symbol: storeSettings.currency_symbol || '£',
        currency_code: storeSettings.currency_code || 'GBP',
        timezone: storeSettings.timezone || 'Europe/London',
      };

      console.log('Settings to save:', settingsToSave);
      const result = await upsertStoreSettings(settingsToSave);
      console.log('Save result:', result);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error?.message || error?.hint || 'Failed to save store information');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReceiptSettings = async () => {
    if (!tenantId) {
      toast.error('No tenant ID found');
      return;
    }

    try {
      setLoading(true);
      console.log('Saving receipt settings with tenant_id:', tenantId);
      const result = await upsertReceiptSettings({ ...receiptSettings, tenant_id: tenantId } as ReceiptSettings);
      console.log('Receipt settings save result:', result);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error?.message || error?.hint || 'Failed to save receipt settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTaxSettings = async () => {
    if (!tenantId) {
      toast.error('No tenant ID found');
      return;
    }

    if (taxSettings.tax_enabled) {
      if (!taxSettings.tax_name || taxSettings.tax_name.trim() === '') {
        toast.error('Tax name is required when tax is enabled');
        return;
      }
      if (taxSettings.tax_rate === undefined || taxSettings.tax_rate === null || taxSettings.tax_rate < 0) {
        toast.error('Please enter a valid tax rate');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('Saving tax settings with tenant_id:', tenantId);
      const result = await upsertTaxSettings({ ...taxSettings, tenant_id: tenantId } as TaxSettings);
      console.log('Tax settings save result:', result);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error?.message || error?.hint || 'Failed to save tax settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveLoyaltySettings = async () => {
    if (!tenantId) {
      toast.error('No tenant ID found');
      return;
    }

    if (loyaltySettings.is_enabled) {
      if (loyaltySettings.earn_rate_value <= 0) {
        toast.error('Earn rate must be greater than 0');
        return;
      }
      if (loyaltySettings.redeem_value_per_coin <= 0) {
        toast.error('Redemption value must be greater than 0');
        return;
      }
      if (loyaltySettings.min_coins_to_redeem < 0) {
        toast.error('Minimum points to redeem cannot be negative');
        return;
      }
      if (!loyaltySettings.membership_barcode_prefix || loyaltySettings.membership_barcode_prefix.trim() === '') {
        toast.error('Card barcode prefix is required');
        return;
      }
    }

    try {
      setLoading(true);
      console.log('Saving loyalty settings with tenant_id:', tenantId);
      console.log('Loyalty settings:', loyaltySettings);

      const cleanSettings = { ...loyaltySettings, tenant_id: tenantId };
      if (cleanSettings.id === undefined) {
        delete cleanSettings.id;
      }

      const { data, error } = await (supabase as any)
        .from('loyalty_settings')
        .upsert(cleanSettings, { onConflict: 'tenant_id' })
        .select()
        .single();

      if (error) {
        console.error('Loyalty settings error:', error);
        throw error;
      }

      console.log('Loyalty settings save result:', data);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Save error:', error);
      toast.error(error?.message || error?.hint || 'Failed to save loyalty settings');
    } finally {
      setLoading(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !tenantId) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Logo must be less than 2MB');
      return;
    }

    try {
      setUploading(true);
      const logoUrl = await uploadLogo(tenantId, file);
      const updatedSettings = { ...storeSettings, logo_url: logoUrl };
      setStoreSettings(updatedSettings);

      const settingsToSave = {
        tenant_id: tenantId,
        store_name: updatedSettings.store_name || '',
        tagline: updatedSettings.tagline || '',
        address: updatedSettings.address || '',
        phone: updatedSettings.phone || '',
        email: updatedSettings.email || '',
        website: updatedSettings.website || '',
        logo_url: logoUrl,
        whatsapp_number: updatedSettings.whatsapp_number || '',
        whatsapp_qr_url: updatedSettings.whatsapp_qr_url || null,
        currency_symbol: updatedSettings.currency_symbol || '£',
        currency_code: updatedSettings.currency_code || 'GBP',
        timezone: updatedSettings.timezone || 'Europe/London',
      };

      await upsertStoreSettings(settingsToSave);
      toast.success('Logo uploaded successfully');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error?.message || 'Failed to upload logo');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Store className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>Configure your store details and branding</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Store Name *</Label>
              <Input
                value={storeSettings.store_name}
                onChange={(e) => setStoreSettings({ ...storeSettings, store_name: e.target.value })}
                placeholder="My Shop"
                required
                className={!storeSettings.store_name?.trim() ? 'border-red-300' : ''}
              />
              {!storeSettings.store_name?.trim() && (
                <p className="text-xs text-red-600">Store name is required</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tagline</Label>
              <Input
                value={storeSettings.tagline}
                onChange={(e) => setStoreSettings({ ...storeSettings, tagline: e.target.value })}
                placeholder="Quality products, great prices"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={storeSettings.address}
              onChange={(e) => setStoreSettings({ ...storeSettings, address: e.target.value })}
              placeholder="123 Main St, City, Postcode"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={storeSettings.phone}
                onChange={(e) => setStoreSettings({ ...storeSettings, phone: e.target.value })}
                placeholder="+44 20 1234 5678"
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={storeSettings.email}
                onChange={(e) => setStoreSettings({ ...storeSettings, email: e.target.value })}
                placeholder="contact@myshop.com"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Website</Label>
              <Input
                value={storeSettings.website}
                onChange={(e) => setStoreSettings({ ...storeSettings, website: e.target.value })}
                placeholder="https://myshop.com"
              />
            </div>
            <div className="space-y-2">
              <Label>WhatsApp Number</Label>
              <Input
                value={storeSettings.whatsapp_number}
                onChange={(e) => setStoreSettings({ ...storeSettings, whatsapp_number: e.target.value })}
                placeholder="+44 7700 900000"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <Label>Store Logo</Label>
            <div className="flex items-center gap-4">
              {storeSettings.logo_url && (
                <div className="w-24 h-24 border rounded-lg overflow-hidden bg-slate-100">
                  <img src={storeSettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                </div>
              )}
              <div className="flex-1">
                <Input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/svg+xml"
                  onChange={handleLogoUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-slate-500 mt-1">Max 2MB. PNG, JPG, SVG supported.</p>
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Currency Symbol</Label>
              <Input
                value={storeSettings.currency_symbol}
                onChange={(e) => setStoreSettings({ ...storeSettings, currency_symbol: e.target.value })}
                placeholder="£"
              />
            </div>
            <div className="space-y-2">
              <Label>Currency Code</Label>
              <Input
                value={storeSettings.currency_code}
                onChange={(e) => setStoreSettings({ ...storeSettings, currency_code: e.target.value })}
                placeholder="GBP"
              />
            </div>
            <div className="space-y-2">
              <Label>Timezone</Label>
              <Select
                value={storeSettings.timezone}
                onValueChange={(value) => setStoreSettings({ ...storeSettings, timezone: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
                  <SelectItem value="America/New_York">America/New_York (EST)</SelectItem>
                  <SelectItem value="America/Los_Angeles">America/Los_Angeles (PST)</SelectItem>
                  <SelectItem value="Asia/Dubai">Asia/Dubai (GST)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveStoreInfo} disabled={loading || uploading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                'Save Store Information'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Receipt className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <CardTitle>Receipt Settings</CardTitle>
              <CardDescription>Customize your receipt appearance and content</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Paper Width</Label>
              <Select
                value={receiptSettings.paper_width}
                onValueChange={(value) => setReceiptSettings({ ...receiptSettings, paper_width: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="58mm">58mm (2.3")</SelectItem>
                  <SelectItem value="80mm">80mm (3.15")</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Barcode Type</Label>
              <Select
                value={receiptSettings.barcode_type}
                onValueChange={(value) => setReceiptSettings({ ...receiptSettings, barcode_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CODE128">Code 128</SelectItem>
                  <SelectItem value="EAN13">EAN-13</SelectItem>
                  <SelectItem value="QR">QR Code</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Header Text</Label>
            <Input
              value={receiptSettings.header_text}
              onChange={(e) => setReceiptSettings({ ...receiptSettings, header_text: e.target.value })}
              placeholder="Optional header message"
            />
          </div>

          <div className="space-y-2">
            <Label>Footer Text</Label>
            <Input
              value={receiptSettings.footer_text}
              onChange={(e) => setReceiptSettings({ ...receiptSettings, footer_text: e.target.value })}
              placeholder="Thank you for your purchase!"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Greeting Message</Label>
              <Input
                value={receiptSettings.greeting_message}
                onChange={(e) => setReceiptSettings({ ...receiptSettings, greeting_message: e.target.value })}
                placeholder="Welcome!"
              />
            </div>
            <div className="space-y-2">
              <Label>Thank You Message</Label>
              <Input
                value={receiptSettings.thank_you_message}
                onChange={(e) => setReceiptSettings({ ...receiptSettings, thank_you_message: e.target.value })}
                placeholder="Thank you for shopping with us!"
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-3">
            <h4 className="font-medium text-sm">Receipt Content</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center justify-between">
                <Label>Show Logo</Label>
                <Switch
                  checked={receiptSettings.show_logo}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, show_logo: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Barcode</Label>
                <Switch
                  checked={receiptSettings.show_barcode}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, show_barcode: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show QR Code</Label>
                <Switch
                  checked={receiptSettings.show_qr_code}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, show_qr_code: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Tax Breakdown</Label>
                <Switch
                  checked={receiptSettings.show_tax_breakdown}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, show_tax_breakdown: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Item Details</Label>
                <Switch
                  checked={receiptSettings.show_item_details}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, show_item_details: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Cashier Name</Label>
                <Switch
                  checked={receiptSettings.show_cashier_name}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, show_cashier_name: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Show Payment Method</Label>
                <Switch
                  checked={receiptSettings.show_payment_method}
                  onCheckedChange={(checked) => setReceiptSettings({ ...receiptSettings, show_payment_method: checked })}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveReceiptSettings} disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                'Save Receipt Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Tag className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle>Membership & Loyalty</CardTitle>
              <CardDescription>Configure your loyalty program and member benefits</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Loyalty Program</Label>
              <p className="text-xs text-slate-500">Allow customers to earn and redeem loyalty points</p>
            </div>
            <Switch
              checked={loyaltySettings.is_enabled}
              onCheckedChange={(checked) => setLoyaltySettings({ ...loyaltySettings, is_enabled: checked })}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Earn Rate (points per £1)</Label>
              <Input
                type="number"
                step="0.01"
                value={loyaltySettings.earn_rate_value}
                onChange={(e) => setLoyaltySettings({ ...loyaltySettings, earn_rate_value: parseFloat(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Redemption Value (£ per 100 points)</Label>
              <Input
                type="number"
                step="0.1"
                value={loyaltySettings.redeem_value_per_coin}
                onChange={(e) => setLoyaltySettings({ ...loyaltySettings, redeem_value_per_coin: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Minimum Points to Redeem</Label>
              <Input
                type="number"
                value={loyaltySettings.min_coins_to_redeem}
                onChange={(e) => setLoyaltySettings({ ...loyaltySettings, min_coins_to_redeem: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Card Barcode Prefix</Label>
              <Input
                value={loyaltySettings.membership_barcode_prefix}
                onChange={(e) => setLoyaltySettings({ ...loyaltySettings, membership_barcode_prefix: e.target.value })}
                placeholder="MEM"
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveLoyaltySettings} disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                'Save Loyalty Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <DollarSign className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <CardTitle>Tax & Pricing</CardTitle>
              <CardDescription>Configure tax rates and pricing rules</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Tax</Label>
              <p className="text-xs text-slate-500">Apply tax to all sales</p>
            </div>
            <Switch
              checked={taxSettings.tax_enabled}
              onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, tax_enabled: checked })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tax Name</Label>
              <Input
                value={taxSettings.tax_name}
                onChange={(e) => setTaxSettings({ ...taxSettings, tax_name: e.target.value })}
                placeholder="VAT, GST, Sales Tax"
              />
            </div>
            <div className="space-y-2">
              <Label>Tax Rate (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxSettings.tax_rate}
                onChange={(e) => setTaxSettings({ ...taxSettings, tax_rate: parseFloat(e.target.value) })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Tax Inclusive</Label>
              <p className="text-xs text-slate-500">Prices include tax (vs added at checkout)</p>
            </div>
            <Switch
              checked={taxSettings.tax_inclusive}
              onCheckedChange={(checked) => setTaxSettings({ ...taxSettings, tax_inclusive: checked })}
            />
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={handleSaveTaxSettings} disabled={loading}>
              {loading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Saving...
                </>
              ) : (
                'Save Tax Settings'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <SuccessDialog
        open={showSuccessDialog}
        onOpenChange={setShowSuccessDialog}
        title="Settings Saved"
        description="Your settings have been saved successfully."
      />
    </div>
  );
}
