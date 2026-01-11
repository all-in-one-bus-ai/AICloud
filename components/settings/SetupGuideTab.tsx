'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, AlertCircle, Printer, Tag, Scan, Scale, HelpCircle, BookOpen, Video } from 'lucide-react';

export function SetupGuideTab() {
  return (
    <div className="space-y-6">
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900">Getting Started</h3>
              <p className="text-sm text-blue-700 mt-1">
                Welcome to your POS system! Follow the guides below to set up your hardware devices and get started with sales.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start Checklist</CardTitle>
          <CardDescription>Complete these steps to get your POS system ready</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <div className="flex-1">
                <p className="font-medium text-sm text-green-900">Account Created</p>
                <p className="text-xs text-green-700">Your account is active and ready</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
              <div className="flex-1">
                <p className="font-medium text-sm">Add Your First Products</p>
                <p className="text-xs text-slate-600">Go to Products page and add items to sell</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
              <div className="flex-1">
                <p className="font-medium text-sm">Set Up Hardware Devices</p>
                <p className="text-xs text-slate-600">Configure printers, scanners, and scales</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
              <div className="flex-1">
                <p className="font-medium text-sm">Configure Store Settings</p>
                <p className="text-xs text-slate-600">Update store info, receipts, and branding</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="w-5 h-5 rounded-full border-2 border-slate-300" />
              <div className="flex-1">
                <p className="font-medium text-sm">Process Your First Sale</p>
                <p className="text-xs text-slate-600">Open POS and complete a test transaction</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
                  <p className="font-semibold text-sm mb-2">Step 2: Download Bridge Files</p>
                  <p className="text-sm text-slate-600 mb-3">
                    Download the hardware bridge package and extract it to your POS machine:
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
                      <code className="bg-white px-2 py-0.5 rounded text-xs">hardware-bridge.zip</code>
                      <a
                        href="/downloads/hardware-bridge/package.json"
                        download
                        className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded transition-colors"
                      >
                        Download Package
                      </a>
                    </div>
                  </div>
                </div>

                <div className="border-l-4 border-blue-500 pl-4 py-2">
                  <p className="font-semibold text-sm mb-2">Step 3: Install Dependencies</p>
                  <p className="text-sm text-slate-600 mb-2">
                    Open terminal in the hardware-bridge folder and run:
                  </p>
                  <code className="text-sm bg-slate-900 text-slate-100 px-3 py-2 rounded block font-mono">
                    npm install
                  </code>
                </div>

                <div className="border-l-4 border-green-500 pl-4 py-2">
                  <p className="font-semibold text-sm mb-2">Step 4: Start the Bridge Service</p>
                  <p className="text-sm text-slate-600 mb-2">Run:</p>
                  <code className="text-sm bg-slate-900 text-slate-100 px-3 py-2 rounded block font-mono">
                    npm start
                  </code>
                  <p className="text-xs text-green-600 mt-2 font-medium">
                    You should see: "POS Hardware Bridge Service - Running on: http://localhost:3001"
                  </p>
                </div>

                <div className="border-l-4 border-purple-500 pl-4 py-2">
                  <p className="font-semibold text-sm mb-2">Step 5: Configure Devices</p>
                  <p className="text-sm text-slate-600">
                    Return to the "Device" tab and configure each hardware device.
                    The connection status should show "Bridge Connected".
                  </p>
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
              </div>
            </div>

            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-green-900 mb-1">Need Help?</p>
                  <p className="text-sm text-green-800">
                    Check the full README.md file in the hardware-bridge folder for detailed documentation
                    and advanced configuration options.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Video className="w-5 h-5 text-purple-600" />
            <div>
              <CardTitle>Video Tutorials</CardTitle>
              <CardDescription>Watch step-by-step video guides</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="aspect-video bg-slate-200 rounded-lg mb-3 flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-400" />
              </div>
              <h4 className="font-semibold text-sm mb-1">Hardware Setup Guide</h4>
              <p className="text-xs text-slate-600">Learn how to set up your POS hardware devices</p>
            </div>
            <div className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="aspect-video bg-slate-200 rounded-lg mb-3 flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-400" />
              </div>
              <h4 className="font-semibold text-sm mb-1">Processing Your First Sale</h4>
              <p className="text-xs text-slate-600">Step-by-step guide to complete a transaction</p>
            </div>
            <div className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="aspect-video bg-slate-200 rounded-lg mb-3 flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-400" />
              </div>
              <h4 className="font-semibold text-sm mb-1">Managing Inventory</h4>
              <p className="text-xs text-slate-600">Add products and track stock levels</p>
            </div>
            <div className="border rounded-lg p-4 hover:bg-slate-50 cursor-pointer transition-colors">
              <div className="aspect-video bg-slate-200 rounded-lg mb-3 flex items-center justify-center">
                <Video className="w-12 h-12 text-slate-400" />
              </div>
              <h4 className="font-semibold text-sm mb-1">Reports & Analytics</h4>
              <p className="text-xs text-slate-600">View sales reports and business insights</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <div>
              <CardTitle>Help & Support</CardTitle>
              <CardDescription>Additional resources and support options</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="font-medium text-sm">User Manual</p>
                <p className="text-xs text-slate-600">Complete guide to all features</p>
              </div>
              <Badge variant="outline">PDF</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="font-medium text-sm">Keyboard Shortcuts</p>
                <p className="text-xs text-slate-600">Quick reference for power users</p>
              </div>
              <Badge variant="outline">PDF</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-slate-50 cursor-pointer">
              <div>
                <p className="font-medium text-sm">Knowledge Base</p>
                <p className="text-xs text-slate-600">Browse FAQ and articles</p>
              </div>
              <Badge variant="outline">Web</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
