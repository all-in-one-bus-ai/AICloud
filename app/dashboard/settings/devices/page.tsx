'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Printer, Tag, Scan, DollarSign, Scale, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { hardwareBridge } from '@/lib/hardware/bridgeService';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { SuccessDialog } from '@/components/SuccessDialog';

interface DeviceSettings {
  id?: string;
  device_type: string;
  device_name: string;
  is_enabled: boolean;
  connection_type: string;
  configuration: any;
}

export default function DevicesSettingsPage() {
  const { tenantId } = useTenant();
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  const [receiptPrinter, setReceiptPrinter] = useState<DeviceSettings>({
    device_type: 'receipt_printer',
    device_name: 'Epson TM-T88VI',
    is_enabled: true,
    connection_type: 'USB',
    configuration: {
      paperSize: '80mm',
      printSpeed: 'fast'
    }
  });

  const [labelPrinter, setLabelPrinter] = useState<DeviceSettings>({
    device_type: 'label_printer',
    device_name: 'Zebra ZD420',
    is_enabled: true,
    connection_type: 'USB',
    configuration: {
      labelSize: '2" x 1"',
      barcodeFormat: 'CODE128',
      printProductName: true,
      displayPrice: true
    }
  });

  const [scanner, setScanner] = useState<DeviceSettings>({
    device_type: 'barcode_scanner',
    device_name: 'Honeywell Voyager 1350g',
    is_enabled: true,
    connection_type: 'USB-HID',
    configuration: {
      scanMethod: 'auto',
      triggerMode: 'auto',
      autoSubmit: true,
      enableFeedback: true,
      manualEntry: true
    }
  });

  const [cashDrawer, setCashDrawer] = useState<DeviceSettings>({
    device_type: 'cash_drawer',
    device_name: 'MS Cash Drawer EP-125NL',
    is_enabled: true,
    connection_type: 'Receipt Printer (RJ-12)',
    configuration: {
      autoOpen: true,
      displayPopup: true
    }
  });

  const [weightScale, setWeightScale] = useState<DeviceSettings>({
    device_type: 'weight_scale',
    device_name: 'Mettler Toledo Ariva-S',
    is_enabled: true,
    connection_type: 'USB',
    configuration: {
      weightUnit: 'kg',
      precision: '0.01',
      autoTare: true,
      autoEdit: true,
      refreshContinuously: true
    }
  });

  useEffect(() => {
    checkBridgeConnection();
    loadDeviceSettings();
    const interval = setInterval(checkBridgeConnection, 5000);
    return () => clearInterval(interval);
  }, [tenantId]);

  const checkBridgeConnection = async () => {
    const connected = await hardwareBridge.checkConnection();
    setBridgeConnected(connected);
  };

  const loadDeviceSettings = async () => {
    if (!tenantId) return;

    try {
      const { data, error } = await supabase
        .from('device_settings')
        .select('*')
        .eq('tenant_id', tenantId);

      if (error) throw error;

      if (data) {
        data.forEach((device: any) => {
          switch (device.device_type) {
            case 'receipt_printer':
              setReceiptPrinter(device);
              break;
            case 'label_printer':
              setLabelPrinter(device);
              break;
            case 'barcode_scanner':
              setScanner(device);
              break;
            case 'cash_drawer':
              setCashDrawer(device);
              break;
            case 'weight_scale':
              setWeightScale(device);
              break;
          }
        });
      }
    } catch (error: any) {
      console.error('Error loading device settings:', error);
    }
  };

  const saveDeviceSettings = async (device: DeviceSettings) => {
    if (!tenantId) return;

    try {
      setLoading(true);

      if (device.id) {
        const { error } = await (supabase as any)
          .from('device_settings')
          .update({
            device_name: device.device_name,
            is_enabled: device.is_enabled,
            connection_type: device.connection_type,
            configuration: device.configuration
          })
          .eq('id', device.id);

        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any)
          .from('device_settings')
          .insert({
            tenant_id: tenantId,
            device_type: device.device_type,
            device_name: device.device_name,
            is_enabled: device.is_enabled,
            connection_type: device.connection_type,
            configuration: device.configuration
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      }

      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error('Error saving device settings:', error);
      toast.error('Failed to save device settings');
    } finally {
      setLoading(false);
    }
  };

  const testReceiptPrinter = async () => {
    try {
      setLoading(true);
      const result = await hardwareBridge.testReceiptPrinter();
      if (result.success) {
        toast.success('Test print sent successfully');
      } else {
        toast.error(result.error || 'Failed to print test');
      }
    } catch (error: any) {
      toast.error('Failed to connect to hardware bridge');
    } finally {
      setLoading(false);
    }
  };

  const testLabelPrinter = async () => {
    try {
      setLoading(true);
      const result = await hardwareBridge.testLabelPrinter();
      if (result.success) {
        toast.success('Test label sent successfully');
      } else {
        toast.error(result.error || 'Failed to print test label');
      }
    } catch (error: any) {
      toast.error('Failed to connect to hardware bridge');
    } finally {
      setLoading(false);
    }
  };

  const testScanner = async () => {
    try {
      setLoading(true);
      await hardwareBridge.startScanner();
      toast.success('Scanner started. Scan a barcode to test.');
    } catch (error: any) {
      toast.error('Failed to start scanner');
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Hardware Devices</h1>
            <p className="text-slate-600 mt-1">Configure your POS hardware devices</p>
          </div>
          <div className="flex items-center gap-2">
            {bridgeConnected ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Bridge Connected
              </Badge>
            ) : (
              <Badge variant="destructive">
                <XCircle className="w-3 h-3 mr-1" />
                Bridge Offline
              </Badge>
            )}
          </div>
        </div>

        {!bridgeConnected && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900">Hardware Bridge Not Running</h3>
                  <p className="text-sm text-amber-700 mt-1">
                    The local hardware bridge service is not running. Please start the bridge service to connect your POS hardware devices.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Printer className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle>Receipt Printer</CardTitle>
                    <CardDescription>Configure your receipt printer for customer receipts</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={receiptPrinter.is_enabled}
                  onCheckedChange={(checked) => {
                    const updated = { ...receiptPrinter, is_enabled: checked };
                    setReceiptPrinter(updated);
                    saveDeviceSettings(updated);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Printer Name</Label>
                  <Input
                    value={receiptPrinter.device_name}
                    onChange={(e) => setReceiptPrinter({ ...receiptPrinter, device_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Connection Type</Label>
                  <Select
                    value={receiptPrinter.connection_type}
                    onValueChange={(value) => setReceiptPrinter({ ...receiptPrinter, connection_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USB">USB</SelectItem>
                      <SelectItem value="Network">Network</SelectItem>
                      <SelectItem value="Serial">Serial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Paper Size</Label>
                  <Select
                    value={receiptPrinter.configuration.paperSize}
                    onValueChange={(value) =>
                      setReceiptPrinter({
                        ...receiptPrinter,
                        configuration: { ...receiptPrinter.configuration, paperSize: value }
                      })
                    }
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
                  <Label>Print Speed</Label>
                  <Select
                    value={receiptPrinter.configuration.printSpeed}
                    onValueChange={(value) =>
                      setReceiptPrinter({
                        ...receiptPrinter,
                        configuration: { ...receiptPrinter.configuration, printSpeed: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="fast">Fast</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={testReceiptPrinter} disabled={!bridgeConnected || loading}>
                  Test Print
                </Button>
                <Button variant="outline" onClick={() => saveDeviceSettings(receiptPrinter)} disabled={loading}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Tag className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <CardTitle>Barcode Label Printer</CardTitle>
                    <CardDescription>Configure label printer for product barcode labels</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={labelPrinter.is_enabled}
                  onCheckedChange={(checked) => {
                    const updated = { ...labelPrinter, is_enabled: checked };
                    setLabelPrinter(updated);
                    saveDeviceSettings(updated);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Printer Name</Label>
                  <Input
                    value={labelPrinter.device_name}
                    onChange={(e) => setLabelPrinter({ ...labelPrinter, device_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Connection Type</Label>
                  <Select
                    value={labelPrinter.connection_type}
                    onValueChange={(value) => setLabelPrinter({ ...labelPrinter, connection_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USB">USB</SelectItem>
                      <SelectItem value="Network">Network</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Label Size</Label>
                  <Select
                    value={labelPrinter.configuration.labelSize}
                    onValueChange={(value) =>
                      setLabelPrinter({
                        ...labelPrinter,
                        configuration: { ...labelPrinter.configuration, labelSize: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value='2" x 1"'>2" x 1" (50mm x 25mm)</SelectItem>
                      <SelectItem value='3" x 2"'>3" x 2" (75mm x 50mm)</SelectItem>
                      <SelectItem value='4" x 2"'>4" x 2" (100mm x 50mm)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Barcode Format</Label>
                  <Select
                    value={labelPrinter.configuration.barcodeFormat}
                    onValueChange={(value) =>
                      setLabelPrinter({
                        ...labelPrinter,
                        configuration: { ...labelPrinter.configuration, barcodeFormat: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CODE128">Code 128</SelectItem>
                      <SelectItem value="EAN13">EAN-13</SelectItem>
                      <SelectItem value="UPCA">UPC-A</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Print product name on label</Label>
                  <Checkbox
                    checked={labelPrinter.configuration.printProductName}
                    onCheckedChange={(checked) =>
                      setLabelPrinter({
                        ...labelPrinter,
                        configuration: { ...labelPrinter.configuration, printProductName: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Display price on label</Label>
                  <Checkbox
                    checked={labelPrinter.configuration.displayPrice}
                    onCheckedChange={(checked) =>
                      setLabelPrinter({
                        ...labelPrinter,
                        configuration: { ...labelPrinter.configuration, displayPrice: checked }
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={testLabelPrinter} disabled={!bridgeConnected || loading}>
                  Print Test Label
                </Button>
                <Button variant="outline" onClick={() => saveDeviceSettings(labelPrinter)} disabled={loading}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Scan className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <CardTitle>Barcode Scanner</CardTitle>
                    <CardDescription>Configure barcode scanner for product scanning</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={scanner.is_enabled}
                  onCheckedChange={(checked) => {
                    const updated = { ...scanner, is_enabled: checked };
                    setScanner(updated);
                    saveDeviceSettings(updated);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scanner Device</Label>
                  <Input
                    value={scanner.device_name}
                    onChange={(e) => setScanner({ ...scanner, device_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Connection Type</Label>
                  <Select
                    value={scanner.connection_type}
                    onValueChange={(value) => setScanner({ ...scanner, connection_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USB-HID">USB-HID</SelectItem>
                      <SelectItem value="USB">USB</SelectItem>
                      <SelectItem value="Bluetooth">Bluetooth</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scan Method</Label>
                  <Select
                    value={scanner.configuration.scanMethod}
                    onValueChange={(value) =>
                      setScanner({
                        ...scanner,
                        configuration: { ...scanner.configuration, scanMethod: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="manual">Manual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trigger Mode</Label>
                  <Select
                    value={scanner.configuration.triggerMode}
                    onValueChange={(value) =>
                      setScanner({
                        ...scanner,
                        configuration: { ...scanner.configuration, triggerMode: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Auto</SelectItem>
                      <SelectItem value="button">Button</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Auto-submit after scan</Label>
                  <Checkbox
                    checked={scanner.configuration.autoSubmit}
                    onCheckedChange={(checked) =>
                      setScanner({
                        ...scanner,
                        configuration: { ...scanner.configuration, autoSubmit: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable sensitive feedback</Label>
                  <Checkbox
                    checked={scanner.configuration.enableFeedback}
                    onCheckedChange={(checked) =>
                      setScanner({
                        ...scanner,
                        configuration: { ...scanner.configuration, enableFeedback: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Enable manual entry mode</Label>
                  <Checkbox
                    checked={scanner.configuration.manualEntry}
                    onCheckedChange={(checked) =>
                      setScanner({
                        ...scanner,
                        configuration: { ...scanner.configuration, manualEntry: checked }
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button onClick={testScanner} disabled={!bridgeConnected || loading}>
                  Test Scanner
                </Button>
                <Button variant="outline" onClick={() => saveDeviceSettings(scanner)} disabled={loading}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    <DollarSign className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <CardTitle>Cash Drawer</CardTitle>
                    <CardDescription>Configure cash drawer for cash transactions</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={cashDrawer.is_enabled}
                  onCheckedChange={(checked) => {
                    const updated = { ...cashDrawer, is_enabled: checked };
                    setCashDrawer(updated);
                    saveDeviceSettings(updated);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Drawer Model</Label>
                  <Input
                    value={cashDrawer.device_name}
                    onChange={(e) => setCashDrawer({ ...cashDrawer, device_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Connected To</Label>
                  <Input value={cashDrawer.connection_type} disabled />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Auto-open when printing receipt</Label>
                  <Checkbox
                    checked={cashDrawer.configuration.autoOpen}
                    onCheckedChange={(checked) =>
                      setCashDrawer({
                        ...cashDrawer,
                        configuration: { ...cashDrawer.configuration, autoOpen: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Display popup if successful</Label>
                  <Checkbox
                    checked={cashDrawer.configuration.displayPopup}
                    onCheckedChange={(checked) =>
                      setCashDrawer({
                        ...cashDrawer,
                        configuration: { ...cashDrawer.configuration, displayPopup: checked }
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await hardwareBridge.openCashDrawer();
                      toast.success('Cash drawer opened');
                    } catch (error) {
                      toast.error('Failed to open cash drawer');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={!bridgeConnected || loading}
                >
                  Open Drawer
                </Button>
                <Button variant="outline" onClick={() => saveDeviceSettings(cashDrawer)} disabled={loading}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <Scale className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle>Weight Scale</CardTitle>
                    <CardDescription>Configure scale for weighing bulk products</CardDescription>
                  </div>
                </div>
                <Switch
                  checked={weightScale.is_enabled}
                  onCheckedChange={(checked) => {
                    const updated = { ...weightScale, is_enabled: checked };
                    setWeightScale(updated);
                    saveDeviceSettings(updated);
                  }}
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Scale Model</Label>
                  <Input
                    value={weightScale.device_name}
                    onChange={(e) => setWeightScale({ ...weightScale, device_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Connection Type</Label>
                  <Select
                    value={weightScale.connection_type}
                    onValueChange={(value) => setWeightScale({ ...weightScale, connection_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USB">USB</SelectItem>
                      <SelectItem value="Serial">Serial (RS-232)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Weight Unit</Label>
                  <Select
                    value={weightScale.configuration.weightUnit}
                    onValueChange={(value) =>
                      setWeightScale({
                        ...weightScale,
                        configuration: { ...weightScale.configuration, weightUnit: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kg">Kilograms (kg)</SelectItem>
                      <SelectItem value="g">Grams (g)</SelectItem>
                      <SelectItem value="lb">Pounds (lb)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Precision</Label>
                  <Select
                    value={weightScale.configuration.precision}
                    onValueChange={(value) =>
                      setWeightScale({
                        ...weightScale,
                        configuration: { ...weightScale.configuration, precision: value }
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0.01">0.01 (2 decimals)</SelectItem>
                      <SelectItem value="0.001">0.001 (3 decimals)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Auto-tare when item is removed</Label>
                  <Checkbox
                    checked={weightScale.configuration.autoTare}
                    onCheckedChange={(checked) =>
                      setWeightScale({
                        ...weightScale,
                        configuration: { ...weightScale.configuration, autoTare: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Automatically edit weight to cart</Label>
                  <Checkbox
                    checked={weightScale.configuration.autoEdit}
                    onCheckedChange={(checked) =>
                      setWeightScale({
                        ...weightScale,
                        configuration: { ...weightScale.configuration, autoEdit: checked }
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Refresh weight continuously display</Label>
                  <Checkbox
                    checked={weightScale.configuration.refreshContinuously}
                    onCheckedChange={(checked) =>
                      setWeightScale({
                        ...weightScale,
                        configuration: { ...weightScale.configuration, refreshContinuously: checked }
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  onClick={async () => {
                    try {
                      setLoading(true);
                      await hardwareBridge.tareScale();
                      toast.success('Scale tared successfully');
                    } catch (error) {
                      toast.error('Failed to tare scale');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={!bridgeConnected || loading}
                >
                  Calibrate Scale
                </Button>
                <Button variant="outline" onClick={() => saveDeviceSettings(weightScale)} disabled={loading}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <SuccessDialog
          open={showSuccessDialog}
          onOpenChange={setShowSuccessDialog}
          title="Device Settings Saved"
          description="Your device settings have been saved successfully."
        />
      </div>
    </DashboardLayout>
  );
}
