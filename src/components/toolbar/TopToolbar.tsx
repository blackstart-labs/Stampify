/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useRef, useState } from 'react';
import {
  Download, Upload, FilePlus, Save, Image as ImageIcon, Undo2, Redo2,
  Sun, Moon, Link, FileJson, Layers, Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useCanvasStore } from '@/store/canvasStore';
import { useImageImport } from '@/hooks/useImageImport';
import { exportVisibleStage } from '@/utils/exportUtils';
import { documentToTemplate, exportTemplateAsJSON, applyImagesToTemplate } from '@/utils/templateUtils';
import { fileToBase64 } from '@/utils/imageUtils';
import { saveAs } from 'file-saver';
import JSZip from 'jszip';
interface TopToolbarProps {
  canvasStageRef?: React.RefObject<unknown>;
}

export const TopToolbar: React.FC<TopToolbarProps> = ({ canvasStageRef }) => {
  const {
    document: doc, zoom, undo, redo, historyIndex, history,
    resetDocument, setDocumentName, exportSettings, setExportSettings,
    setZoom, pendingBatchJob, setPendingBatchJob
  } = useCanvasStore();

  const { importFromFiles, importFromUrl } = useImageImport();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showUrlDialog, setShowUrlDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [showTemplateExport, setShowTemplateExport] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [newWidth, setNewWidth] = useState(1920);
  const [newHeight, setNewHeight] = useState(1080);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  
  // Batch Export State
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [batchScaleMode, setBatchScaleMode] = useState<'stretch' | 'fit' | 'fill'>('stretch');
  const [batchImages, setBatchImages] = useState<{ name: string; src: string; width: number; height: number }[]>([]);
  const [batchProgress, setBatchProgress] = useState(0);
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const [isDark, setIsDark] = useState(() => {
    const stored = localStorage.getItem('stampify-theme');
    return stored ? stored === 'dark' : true;
  });

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) importFromFiles(Array.from(files));
    e.target.value = '';
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setUrlLoading(true);
    setUrlError('');
    try {
      await importFromUrl(urlInput.trim());
      setShowUrlDialog(false);
      setUrlInput('');
    } catch (err) {
      setUrlError('Failed to fetch image. The URL may be blocked by CORS or invalid.');
    } finally {
      setUrlLoading(false);
    }
  };

  const handleExport = async () => {
    const stage = (canvasStageRef as any)?.current?.getStage?.();
    if (!stage) {
      alert('Canvas stage is not available for export.');
      return;
    }

    try {
      // Hide transformer temporarily
      useCanvasStore.getState().setSelectedLayers([]);
      await new Promise(r => setTimeout(r, 50)); 

      const blob = await exportVisibleStage(
        stage,
        doc.width,
        doc.height,
        exportSettings
      );
      const ext = exportSettings.format;
      saveAs(blob, `${doc.name || 'export'}.${ext}`);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Export failed. Please try again.');
    }
    setShowExportDialog(false);
  };

  const handleTemplateExport = () => {
    const template = documentToTemplate(doc, templateName || doc.name, templateDesc, exportSettings);
    const json = exportTemplateAsJSON(template);
    const blob = new Blob([json], { type: 'application/json' });
    saveAs(blob, `${templateName || doc.name}.json`);
    setShowTemplateExport(false);
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

  const executeBatchJob = async (
    images: { name: string; src: string; width: number; height: number }[],
    scaleMode: 'stretch' | 'fit' | 'fill',
    format: 'png' | 'jpeg' | 'webp',
    baseTemplate?: import('@/types').Template
  ) => {
    if (images.length === 0) return;
    const stage = (canvasStageRef as any)?.current?.getStage?.();
    if (!stage) {
      alert('Canvas stage is not available for batch export.');
      return;
    }

    setIsBatchExporting(true);
    setBatchProgress(0);

    const zip = new JSZip();
    const ext = format;
    
    // Save original layers and selection
    const originalLayers = [...useCanvasStore.getState().document.layers];
    const originalSelection = [...useCanvasStore.getState().selectedLayerIds];
    
    // Create template from current document if not provided
    const template = baseTemplate || documentToTemplate(doc, 'Batch Template', '', { ...exportSettings, format });
    
    // Unselect to hide transformers during capture
    useCanvasStore.getState().setSelectedLayers([]);

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      // Generate new layers based on template and this specific image
      const newLayers = applyImagesToTemplate(
        template, 
        [{ src: img.src, originalSrc: img.src, width: img.width, height: img.height }],
        scaleMode === 'stretch' ? undefined : scaleMode
      );
      
      // Inject directly into store to force React/Konva to update the live canvas
      useCanvasStore.setState(s => ({ document: { ...s.document, layers: newLayers } }));
      
      // High timeout to guarantee React re-renders and Konva loads the base64 image over the network
      await new Promise(r => setTimeout(r, 300));
      
      try {
        const blob = await exportVisibleStage(
          stage,
          doc.width,
          doc.height,
          { ...exportSettings, format }
        );
        if (images.length === 1) {
          saveAs(blob, `${img.name}-edited.${ext}`);
        } else {
          zip.file(`${img.name}-edited.${ext}`, blob);
        }
      } catch (err) {
        console.error(`Failed to batch process ${img.name}`, err);
      }
      
      setBatchProgress(((i + 1) / images.length) * 100);
    }

    // Restore everything
    useCanvasStore.setState(s => ({ 
      document: { ...s.document, layers: originalLayers },
      selectedLayerIds: originalSelection 
    }));

    if (images.length > 1) {
      try {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, 'batch-export.zip');
      } catch (err) {
        console.error('ZIP generation failed', err);
        alert('Failed to generate ZIP archive.');
      }
    }
    
    setIsBatchExporting(false);
    setShowBatchDialog(false);
  };

  React.useEffect(() => {
    if (pendingBatchJob && canvasStageRef?.current) {
      const timer = setTimeout(() => {
        const job = pendingBatchJob;
        setPendingBatchJob(null);
        executeBatchJob(job.images, job.scaleMode, job.format, job.template);
      }, 500);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingBatchJob, canvasStageRef]);

  const handleBatchExport = () => {
    executeBatchJob(batchImages, batchScaleMode, exportSettings.format);
  };

  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    localStorage.setItem('stampify-theme', newIsDark ? 'dark' : 'light');
    if (newIsDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  return (
    <>
      <div className="h-11 bg-card border-b border-border flex items-center px-3 gap-2">
        {/* Logo */}
        <div className="flex items-center gap-2 mr-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center">
            <Layers size={16} className="text-white" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            Stampify
          </span>
        </div>

        <Separator orientation="vertical" className="h-6" />

        {/* Document name */}
        <Input
          className="h-7 text-xs w-40 bg-transparent border-none focus-visible:ring-1"
          value={doc.name}
          onChange={(e) => setDocumentName(e.target.value)}
          onFocus={(e) => e.target.select()}
        />

        <Separator orientation="vertical" className="h-6" />

        {/* File actions */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowNewDialog(true)} aria-label="New Project">
              <FilePlus size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>New Project</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => fileInputRef.current?.click()} aria-label="Import Image">
              <Upload size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Import Image</p></TooltipContent>
        </Tooltip>
        <input ref={fileInputRef} type="file" accept="image/*" multiple hidden onChange={handleFileImport} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowUrlDialog(true)} aria-label="Import from URL">
              <Link size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Import from URL</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6" />

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={undo} disabled={historyIndex < 0} aria-label="Undo">
              <Undo2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Undo (Ctrl+Z)</p></TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={redo} disabled={historyIndex >= history.length - 2} aria-label="Redo">
              <Redo2 size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Redo (Ctrl+Shift+Z)</p></TooltipContent>
        </Tooltip>

        <div className="flex-1" />

        {/* Zoom display */}
        <span className="text-xs text-muted-foreground font-mono mr-2">
          {Math.round(zoom * 100)}%
        </span>

        <span className="text-[10px] text-muted-foreground">
          {doc.width}×{doc.height}
        </span>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Template export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => setShowTemplateExport(true)} aria-label="Export Template">
              <FileJson size={16} />
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Export Template</p></TooltipContent>
        </Tooltip>

        {/* Theme toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={toggleTheme} aria-label="Toggle Theme">
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent><p>Toggle Theme</p></TooltipContent>
        </Tooltip>

        <Separator orientation="vertical" className="h-6 mx-2" />

        {/* Batch Export */}
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1 mr-1"
          onClick={() => setShowBatchDialog(true)}
        >
          <Layers size={14} />
          Batch
        </Button>

        {/* Export */}
        <Button
          size="sm"
          className="h-7 text-xs gap-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white"
          onClick={() => setShowExportDialog(true)}
        >
          <Download size={14} />
          Export
        </Button>
      </div>

      {/* URL Import Dialog */}
      <Dialog open={showUrlDialog} onOpenChange={setShowUrlDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import Image from URL</DialogTitle>
            <DialogDescription>Enter the URL of an image to import</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="https://example.com/image.png"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUrlImport()}
            />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUrlDialog(false)}>Cancel</Button>
            <Button onClick={handleUrlImport} disabled={urlLoading}>
              {urlLoading ? 'Loading...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Project Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Set canvas dimensions for your new project</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Width</Label>
              <Input type="number" value={newWidth} onChange={(e) => setNewWidth(Number(e.target.value))} />
            </div>
            <div>
              <Label className="text-xs">Height</Label>
              <Input type="number" value={newHeight} onChange={(e) => setNewHeight(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {[
              [1920, 1080, '1920×1080'],
              [1080, 1080, '1080×1080'],
              [1080, 1920, '1080×1920'],
              [800, 600, '800×600'],
              [4000, 4000, '4K×4K'],
            ].map(([w, h, label]) => (
              <Button key={label as string} variant="outline" size="sm" className="text-xs"
                onClick={() => { setNewWidth(w as number); setNewHeight(h as number); }}>
                {label as string}
              </Button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>Cancel</Button>
            <Button onClick={() => { resetDocument(newWidth, newHeight); setShowNewDialog(false); }}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Image</DialogTitle>
            <DialogDescription>Configure export settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Format</Label>
              <Select value={exportSettings.format} onValueChange={(v) => setExportSettings({ format: v as 'png' | 'jpeg' | 'webp' })}>
                <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="png" className="text-xs">PNG</SelectItem>
                  <SelectItem value="jpeg" className="text-xs">JPEG</SelectItem>
                  <SelectItem value="webp" className="text-xs">WebP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {exportSettings.format !== 'png' && (
              <div className="space-y-1">
                <div className="flex justify-between">
                  <Label className="text-xs">Quality</Label>
                  <span className="text-xs text-muted-foreground">{exportSettings.quality}%</span>
                </div>
                <Slider value={[exportSettings.quality]} onValueChange={([v]) => setExportSettings({ quality: v })} min={1} max={100} />
              </div>
            )}
            <div className="flex items-center justify-between">
              <Label className="text-xs">Scale</Label>
              <Select value={String(exportSettings.scale)} onValueChange={(v) => setExportSettings({ scale: Number(v) })}>
                <SelectTrigger className="w-20 h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1" className="text-xs">1x</SelectItem>
                  <SelectItem value="2" className="text-xs">2x</SelectItem>
                  <SelectItem value="3" className="text-xs">3x</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>Cancel</Button>
            <Button onClick={handleExport} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <Download size={14} className="mr-1" /> Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Template Export Dialog */}
      <Dialog open={showTemplateExport} onOpenChange={setShowTemplateExport}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Template</DialogTitle>
            <DialogDescription>Save current layout as a reusable template</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Template Name</Label>
              <Input className="mt-0.5" value={templateName} onChange={(e) => setTemplateName(e.target.value)} placeholder={doc.name} />
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <textarea
                className="w-full mt-0.5 rounded-md border border-input bg-background px-2 py-1 text-sm min-h-[60px] resize-y focus:outline-none focus:ring-1 focus:ring-ring"
                value={templateDesc}
                onChange={(e) => setTemplateDesc(e.target.value)}
                placeholder="Describe this template..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateExport(false)}>Cancel</Button>
            <Button onClick={handleTemplateExport}>
              <FileJson size={14} className="mr-1" /> Export JSON
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Export Dialog */}
      <Dialog open={showBatchDialog} onOpenChange={setShowBatchDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Batch Export</DialogTitle>
            <DialogDescription>
              Apply this canvas layout to multiple images at once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Button variant="outline" size="sm" className="w-full h-10" onClick={() => batchInputRef.current?.click()}>
              <Upload size={16} className="mr-2" /> Select Images
            </Button>
            <input ref={batchInputRef} type="file" accept="image/*" multiple hidden onChange={handleBatchImagesSelect} />

            {batchImages.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-center text-muted-foreground p-3 bg-muted rounded-md border border-border">
                  {batchImages.length} image(s) ready for batch processing
                </div>
                
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Image Scaling</Label>
                  <Select value={batchScaleMode} onValueChange={(v: 'stretch' | 'fit' | 'fill') => setBatchScaleMode(v)}>
                    <SelectTrigger className="w-32 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stretch" className="text-xs">Stretch (Exact bounds)</SelectItem>
                      <SelectItem value="fit" className="text-xs">Fit (Contain)</SelectItem>
                      <SelectItem value="fill" className="text-xs">Fill (Cover bounds)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {isBatchExporting && (
              <div className="space-y-2 mt-4 p-4 border border-border rounded-md bg-card">
                <div className="flex justify-between text-sm">
                  <span>Processing...</span>
                  <span className="font-mono text-muted-foreground">{Math.round(batchProgress)}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all"
                    style={{ width: `${batchProgress}%` }} />
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBatchDialog(false)}>Cancel</Button>
            <Button onClick={handleBatchExport} disabled={batchImages.length === 0 || isBatchExporting} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              <Download size={14} className="mr-1" /> Export ZIP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
