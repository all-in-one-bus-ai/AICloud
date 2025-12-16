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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Printer, Tag, Scan, DollarSign, Scale, Settings2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { hardwareBridge } from '@/lib/hardware/bridgeService';
import { useTenant } from '@/context/TenantContext';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';

interface DeviceSettings {
  id?: string;
  device_type: string;
  device_name: string;
  is_enabled: boolean;
  connection_type: string;
  configuration: any;
}

export default function SettingsPage() {
  const { tenantId } = useTenant();
  const [bridgeConnected, setBridgeConnected] = useState(false);
  const [loading, setLoading] = useState(false);

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

      toast.success('Device settings saved');
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
            <h1 className="text-3xl font-bold">Settings</h1>
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

        <Tabs defaultValue="devices" className="space-y-6">
          <TabsList>
            <TabsTrigger value="devices">
              <Settings2 className="w-4 h-4 mr-2" />
              Devices
            </TabsTrigger>
            <TabsTrigger value="setup">Setup Guide</TabsTrigger>
            <TabsTrigger value="store">Store Info</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-6">
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
          </TabsContent>

          <TabsContent value="setup" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Hardware Bridge Setup Guide</CardTitle>
                <CardDescription>
                  Follow these steps to install and configure the hardware bridge service on your POS machine
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">What is the Hardware Bridge?</h3>
                    <p className="text-slate-600">
                      The Hardware Bridge is a local Node.js service that runs on your POS machine and enables this web application
                      to communicate with your physical hardware devices like printers, scanners, scales, and cash drawers.
                    </p>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Supported Devices</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                        <Printer className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Receipt Printers</p>
                          <p className="text-xs text-slate-600">ESC/POS thermal printers (Epson TM, Star Micronics)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                        <Tag className="w-5 h-5 text-purple-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Label Printers</p>
                          <p className="text-xs text-slate-600">Zebra, Brother (USB, Network)</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                        <Scan className="w-5 h-5 text-green-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Barcode Scanners</p>
                          <p className="text-xs text-slate-600">USB-HID, Bluetooth scanners</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                        <Scale className="w-5 h-5 text-orange-600 mt-0.5" />
                        <div>
                          <p className="font-medium text-sm">Weight Scales</p>
                          <p className="text-xs text-slate-600">USB, Serial (RS-232) scales</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">System Requirements</h3>
                    <ul className="space-y-2 text-slate-600">
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <span>Node.js 16 or higher installed</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <span>Windows 10/11, macOS 10.14+, or Linux (Ubuntu 18.04+)</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <span>Hardware devices connected via USB, Serial, or Network</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5" />
                        <span>Port 3001 available (not used by other applications)</span>
                      </li>
                    </ul>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Installation Steps</h3>
                    <div className="space-y-4">
                      <div className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="font-semibold text-sm mb-2">Step 1: Download Node.js</p>
                        <p className="text-sm text-slate-600 mb-2">
                          If you don't have Node.js installed, download it from:
                        </p>
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded">https://nodejs.org/</code>
                        <p className="text-xs text-slate-500 mt-2">Download the LTS version and follow the installer.</p>
                      </div>

                      <div className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="font-semibold text-sm mb-2">Step 2: Create Hardware Bridge Directory</p>
                        <p className="text-sm text-slate-600 mb-2">
                          Create a folder on your POS machine for the bridge service:
                        </p>
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded block">
                          C:\POS\hardware-bridge (Windows)
                        </code>
                        <code className="text-sm bg-slate-100 px-2 py-1 rounded block mt-1">
                          ~/pos/hardware-bridge (macOS/Linux)
                        </code>
                      </div>

                      <div className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="font-semibold text-sm mb-2">Step 3: Download Bridge Files</p>
                        <p className="text-sm text-slate-600 mb-3">
                          Download the following files and save them to your hardware-bridge directory:
                        </p>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">📄</span>
                              <code className="bg-white px-2 py-0.5 rounded text-xs">package.json</code>
                            </div>
                            <a
                              href="/downloads/hardware-bridge/package.json"
                              download="package.json"
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                            >
                              Download
                            </a>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">📄</span>
                              <code className="bg-white px-2 py-0.5 rounded text-xs">server.js</code>
                            </div>
                            <a
                              href="/downloads/hardware-bridge/server.js"
                              download="server.js"
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                            >
                              Download
                            </a>
                          </div>

                          <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                            <div className="flex items-center gap-2">
                              <span className="text-slate-400">📄</span>
                              <code className="bg-white px-2 py-0.5 rounded text-xs">README.md</code>
                            </div>
                            <a
                              href="/downloads/hardware-bridge/README.md"
                              download="README.md"
                              className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                            >
                              Download
                            </a>
                          </div>

                          <div className="mt-3 p-2 bg-amber-50 border border-amber-200 rounded">
                            <p className="text-xs font-medium text-amber-900 mb-2">Service Files (create a services/ folder):</p>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <code className="bg-white px-2 py-0.5 rounded text-xs">printerService.js</code>
                                <a
                                  href="/downloads/hardware-bridge/services/printerService.js"
                                  download="printerService.js"
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded transition-colors"
                                >
                                  Download
                                </a>
                              </div>
                              <div className="flex items-center justify-between">
                                <code className="bg-white px-2 py-0.5 rounded text-xs">labelPrinterService.js</code>
                                <a
                                  href="/downloads/hardware-bridge/services/labelPrinterService.js"
                                  download="labelPrinterService.js"
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded transition-colors"
                                >
                                  Download
                                </a>
                              </div>
                              <div className="flex items-center justify-between">
                                <code className="bg-white px-2 py-0.5 rounded text-xs">scannerService.js</code>
                                <a
                                  href="/downloads/hardware-bridge/services/scannerService.js"
                                  download="scannerService.js"
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded transition-colors"
                                >
                                  Download
                                </a>
                              </div>
                              <div className="flex items-center justify-between">
                                <code className="bg-white px-2 py-0.5 rounded text-xs">scaleService.js</code>
                                <a
                                  href="/downloads/hardware-bridge/services/scaleService.js"
                                  download="scaleService.js"
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded transition-colors"
                                >
                                  Download
                                </a>
                              </div>
                              <div className="flex items-center justify-between">
                                <code className="bg-white px-2 py-0.5 rounded text-xs">cashDrawerService.js</code>
                                <a
                                  href="/downloads/hardware-bridge/services/cashDrawerService.js"
                                  download="cashDrawerService.js"
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded transition-colors"
                                >
                                  Download
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                          <p className="text-xs text-blue-900 font-medium mb-1">Folder Structure:</p>
                          <pre className="text-xs bg-white px-2 py-2 rounded font-mono">
{`hardware-bridge/
├── package.json
├── server.js
├── README.md
└── services/
    ├── printerService.js
    ├── labelPrinterService.js
    ├── scannerService.js
    ├── scaleService.js
    └── cashDrawerService.js`}
                          </pre>
                        </div>
                      </div>

                      <div className="border-l-4 border-blue-500 pl-4 py-2">
                        <p className="font-semibold text-sm mb-2">Step 4: Install Dependencies</p>
                        <p className="text-sm text-slate-600 mb-2">
                          Open terminal/command prompt in the hardware-bridge folder and run:
                        </p>
                        <code className="text-sm bg-slate-900 text-slate-100 px-3 py-2 rounded block font-mono">
                          npm install
                        </code>
                        <p className="text-xs text-slate-500 mt-2">
                          This will install all required dependencies (express, ws, escpos, node-hid, serialport).
                        </p>
                      </div>

                      <div className="border-l-4 border-green-500 pl-4 py-2">
                        <p className="font-semibold text-sm mb-2">Step 5: Start the Bridge Service</p>
                        <p className="text-sm text-slate-600 mb-2">Run the following command:</p>
                        <code className="text-sm bg-slate-900 text-slate-100 px-3 py-2 rounded block font-mono">
                          npm start
                        </code>
                        <p className="text-xs text-green-600 mt-2 font-medium">
                          You should see: "POS Hardware Bridge Service - Running on: http://localhost:3001"
                        </p>
                      </div>

                      <div className="border-l-4 border-purple-500 pl-4 py-2">
                        <p className="font-semibold text-sm mb-2">Step 6: Configure Devices</p>
                        <p className="text-sm text-slate-600">
                          Return to the "Devices" tab above and configure each hardware device.
                          The connection status badge should now show "Bridge Connected" in green.
                        </p>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Auto-Start on System Boot (Optional)</h3>
                    <div className="space-y-3">
                      <div>
                        <p className="font-medium text-sm mb-2">Windows:</p>
                        <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                          <li>Create a file called <code className="bg-slate-100 px-1 rounded">start-bridge.bat</code></li>
                          <li>Add these lines:
                            <code className="text-xs bg-slate-900 text-slate-100 px-2 py-1 rounded block mt-1 font-mono">
                              @echo off<br/>
                              cd C:\POS\hardware-bridge<br/>
                              npm start
                            </code>
                          </li>
                          <li>Press Win + R, type <code className="bg-slate-100 px-1 rounded">shell:startup</code></li>
                          <li>Copy the .bat file to the Startup folder</li>
                        </ol>
                      </div>

                      <div>
                        <p className="font-medium text-sm mb-2">macOS/Linux:</p>
                        <ol className="text-sm text-slate-600 space-y-1 list-decimal list-inside">
                          <li>Create a systemd service file (requires sudo)</li>
                          <li>Enable and start the service</li>
                          <li>See full instructions in the README.md file</li>
                        </ol>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="text-lg font-semibold mb-3">Troubleshooting</h3>
                    <div className="space-y-3">
                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-sm mb-1">Bridge won't start</p>
                        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                          <li>Check Node.js is installed: <code className="bg-white px-1 rounded">node --version</code></li>
                          <li>Check port 3001 is not in use by another application</li>
                          <li>Run <code className="bg-white px-1 rounded">npm install</code> again</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-sm mb-1">Printer not connecting</p>
                        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                          <li>Check USB cable is properly connected</li>
                          <li>Verify printer power is on</li>
                          <li>Try a different USB port</li>
                          <li>Check printer drivers are installed (Windows)</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-sm mb-1">Scanner not working</p>
                        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                          <li>Most USB scanners work as keyboard input (no setup needed)</li>
                          <li>Test by opening notepad and scanning a barcode</li>
                          <li>Ensure scanner is in auto-trigger mode</li>
                        </ul>
                      </div>

                      <div className="p-3 bg-slate-50 rounded-lg">
                        <p className="font-medium text-sm mb-1">Scale not reading</p>
                        <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
                          <li>Check COM port in Device Manager (Windows)</li>
                          <li>Verify baud rate matches scale settings (usually 9600)</li>
                          <li>Test scale with manufacturer software first</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-semibold text-green-900 mb-1">Need Help?</p>
                        <p className="text-sm text-green-800">
                          Check the full README.md file in the hardware-bridge folder for detailed API documentation,
                          connection examples, and advanced configuration options.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="store">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
                <CardDescription>Configure your store details</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Store information settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Manage security and access control</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-slate-600">Security settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
