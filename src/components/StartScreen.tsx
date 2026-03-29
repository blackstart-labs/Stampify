import React, { useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useCanvasStore } from '@/store/canvasStore';
import { useImageImport } from '@/hooks/useImageImport';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Image as ImageIcon, FilePlus, Upload, Link, Monitor } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { CopyPlus, FileJson } from 'lucide-react';
import { parseTemplateJSON, templateToDocument } from '@/utils/templateUtils';
import { fileToBase64 } from '@/utils/imageUtils';
import type { Template } from '@/types';

export const StartScreen: React.FC = () => {
  const { resetDocument, loadDocument, setPendingBatchJob } = useCanvasStore();
  const { importFromFiles, importFromUrl } = useImageImport();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [newWidth, setNewWidth] = useState(1920);
  const [newHeight, setNewHeight] = useState(1080);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  // Batch Export State
  const batchTemplateInputRef = useRef<HTMLInputElement>(null);
  const batchImagesInputRef = useRef<HTMLInputElement>(null);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchTemplate, setBatchTemplate] = useState<Template | null>(null);
  const [batchImages, setBatchImages] = useState<{ name: string; src: string; width: number; height: number }[]>([]);
  const [batchScaleMode, setBatchScaleMode] = useState<'stretch' | 'fit' | 'fill'>('stretch');
  const [batchFormat, setBatchFormat] = useState<'png' | 'jpeg' | 'webp'>('png');

  // We only trigger import if files are actually dropped
  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      importFromFiles(acceptedFiles);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'] },
    noClick: true,
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      importFromFiles(Array.from(files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    try {
      await importFromUrl(urlInput.trim());
      setShowUrlDialog(false);
    } catch {
      alert('Failed to fetch image. URL might be invalid or protected by CORS.');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleBatchTemplateImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const template = parseTemplateJSON(text);
    if (!template) {
      alert('Invalid template file');
      return;
    }
    setBatchTemplate(template);
    if (batchTemplateInputRef.current) batchTemplateInputRef.current.value = '';
  };
  
  const handleBatchImagesSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const images: { name: string; src: string; width: number; height: number }[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const src = await fileToBase64(file);
      const img = new globalThis.Image();
      await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.src = src;
      });
      images.push({ name: file.name.replace(/\.[^.]+$/, ''), src, width: img.width, height: img.height });
    }
    setBatchImages(images);
  };
  
  const submitBatchJob = () => {
    if (!batchTemplate || batchImages.length === 0) return;
    setPendingBatchJob({
      template: batchTemplate,
      images: batchImages,
      scaleMode: batchScaleMode,
      format: batchFormat
    });
    // Setting loadDocument unmounts StartScreen and mounts the canvas
    loadDocument(templateToDocument(batchTemplate));
  };

  return (
    <div 
      {...getRootProps()} 
      className={`absolute inset-0 flex flex-col items-center justify-center bg-background text-foreground transition-colors ${
        isDragActive ? 'bg-accent/50 border-4 border-primary border-dashed' : ''
      }`}
    >
      <input {...getInputProps()} />
      <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileImport} />

      <div className="text-center mb-10 pointer-events-none">
        <h1 className="text-5xl font-black mb-4 tracking-tight bg-gradient-to-br from-blue-500 to-indigo-600 bg-clip-text text-transparent">
          Stampify
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          The professional web-based image editor. Create a new canvas or drop an image anywhere to begin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-6">
        {/* Create New Block */}
        <div 
          onClick={() => setShowNewDialog(true)}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 hover:shadow-xl hover:border-blue-500/50 transition-all cursor-pointer flex flex-col items-center text-center hover:-translate-y-1"
        >
          <div className="h-16 w-16 rounded-full bg-blue-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-500/20 transition-all">
            <Monitor className="h-8 w-8 text-blue-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Create New</h3>
          <p className="text-sm text-muted-foreground">Start with a blank canvas and set your custom dimensions.</p>
        </div>

        {/* Open Image Block */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 hover:shadow-xl hover:border-indigo-500/50 transition-all cursor-pointer flex flex-col items-center text-center hover:-translate-y-1"
        >
          <div className="h-16 w-16 rounded-full bg-indigo-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
            <ImageIcon className="h-8 w-8 text-indigo-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Open Image</h3>
          <p className="text-sm text-muted-foreground">Upload an image to start editing. The canvas will match its size.</p>
        </div>

        {/* Batch Export Block */}
        <div 
          onClick={() => setShowBatchDialog(true)}
          className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 hover:shadow-xl hover:border-slate-500/50 transition-all cursor-pointer flex flex-col items-center text-center hover:-translate-y-1"
        >
          <div className="h-16 w-16 rounded-full bg-slate-500/10 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-slate-500/20 transition-all">
            <CopyPlus className="h-8 w-8 text-slate-500" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Batch Process</h3>
          <p className="text-sm text-muted-foreground">Apply a template to multiple images. Exports natively or as a ZIP.</p>
        </div>
      </div>

      <div className="mt-8 flex gap-4 text-sm text-muted-foreground items-center justify-center flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => setShowUrlDialog(true)}>
          <Link className="mr-2 h-4 w-4" /> Import from URL
        </Button>
        <span className="flex items-center">
          <Upload className="mr-2 h-4 w-4" /> Or drag & drop anywhere
        </span>
        <span className="flex items-center">
          <span className="font-mono bg-muted px-1.5 py-0.5 rounded mr-2 text-xs">Ctrl+V</span> Paste from clipboard
        </span>
      </div>

      {/* New Project Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs mb-1">Width (px)</Label>
              <Input type="number" value={newWidth} onChange={(e) => setNewWidth(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs mb-1">Height (px)</Label>
              <Input type="number" value={newHeight} onChange={(e) => setNewHeight(Number(e.target.value))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={() => { resetDocument(newWidth, newHeight); setShowNewDialog(false); }} className="bg-gradient-to-r from-blue-600 to-indigo-600">
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* URL Import Dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import from URL</DialogTitle>
            <DialogDescription>Paste an image URL to start editing it directly.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input 
              value={urlInput} 
              onChange={(e) => setUrlInput(e.target.value)} 
              placeholder="https://example.com/image.png" 
              disabled={urlLoading}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUrlDialog(false)}>Cancel</Button>
            <Button onClick={handleUrlImport} disabled={!urlInput || urlLoading}>
              {urlLoading ? 'Loading...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Processing Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Start Batch Workflow</DialogTitle>
            <DialogDescription>
              Select your template, upload your images, and configure the export.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Template Selection */}
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">1. Template (.json)</Label>
              <input ref={batchTemplateInputRef} type="file" accept=".json" hidden onChange={handleBatchTemplateImport} />
              
              {batchTemplate ? (
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <FileJson size={14} className="text-blue-500 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{batchTemplate.name}</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setBatchTemplate(null)} className="h-7 px-2">Clear</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full text-sm font-normal" onClick={() => batchTemplateInputRef.current?.click()}>
                  <Upload size={14} className="mr-2" /> Upload Template File
                </Button>
              )}
            </div>
            
            {/* Image Selection */}
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">2. Source Images</Label>
              <input ref={batchImagesInputRef} type="file" accept="image/*" multiple hidden onChange={handleBatchImagesSelect} />
              
              {batchImages.length > 0 ? (
                <div className="flex items-center justify-between p-3 border border-border rounded-md bg-muted/50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <ImageIcon size={14} className="text-indigo-500 flex-shrink-0" />
                    <span className="text-sm font-medium truncate">{batchImages.length} Image(s) Selected</span>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setBatchImages([])} className="h-7 px-2">Clear</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full text-sm font-normal" onClick={() => batchImagesInputRef.current?.click()}>
                  <Upload size={14} className="mr-2" /> Select Images
                </Button>
              )}
            </div>
            
            {/* Export Settings */}
            <div>
              <Label className="text-xs font-semibold uppercase text-muted-foreground mb-2 block">3. Export Settings</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs">Image Scaling</Label>
                  <Select value={batchScaleMode} onValueChange={(v: 'fit' | 'fill' | 'stretch') => setBatchScaleMode(v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stretch" className="text-xs">Stretch</SelectItem>
                      <SelectItem value="fit" className="text-xs">Fit</SelectItem>
                      <SelectItem value="fill" className="text-xs">Fill</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-1">
                  <Label className="text-xs">Format</Label>
                  <Select value={batchFormat} onValueChange={(v: 'png' | 'jpeg' | 'webp') => setBatchFormat(v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="png" className="text-xs">PNG</SelectItem>
                      <SelectItem value="jpeg" className="text-xs">JPEG</SelectItem>
                      <SelectItem value="webp" className="text-xs">WebP</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>Cancel</Button>
            <Button 
              onClick={submitBatchJob} 
              disabled={!batchTemplate || batchImages.length === 0}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
            >
              Start Batch Processing
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
