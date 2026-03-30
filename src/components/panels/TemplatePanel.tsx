/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { FileJson, Upload, Trash2, Play } from 'lucide-react';
import { useCanvasStore } from '@/store/canvasStore';
import { useTemplateStore } from '@/store/templateStore';
import { parseTemplateJSON, templateToDocument, saveTemplateToStorage } from '@/utils/templateUtils';
import type { Template } from '@/types';

export const TemplatePanel: React.FC = () => {
  const { loadDocument, exportSettings } = useCanvasStore();
  const { templates, loadTemplates, removeTemplate, setActiveTemplate } = useTemplateStore();
  const [showImportDialog, setShowImportDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleImportTemplate = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const template = parseTemplateJSON(text);
    if (!template) {
      alert('Invalid template file');
      return;
    }
    saveTemplateToStorage(template);
    loadTemplates();
    const doc = templateToDocument(template);
    loadDocument(doc);
    setShowImportDialog(false);
  };

  const handleApplyTemplate = (template: Template) => {
    const doc = templateToDocument(template);
    loadDocument(doc);
    setActiveTemplate(template);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase text-muted-foreground">Templates</h3>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="w-6 h-6" onClick={() => fileInputRef.current?.click()} aria-label="Import Template">
            <Upload size={12} />
          </Button>
          <input ref={fileInputRef} type="file" accept=".json" hidden onChange={handleImportTemplate} />
        </div>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-4">
          <FileJson size={24} className="mx-auto text-muted-foreground mb-2" />
          <p className="text-xs text-muted-foreground">No templates saved</p>
          <p className="text-[10px] text-muted-foreground mt-1">Export a template from the toolbar</p>
        </div>
      ) : (
        <ScrollArea className="max-h-48">
          <div className="space-y-1">
            {templates.map((t, i) => (
              <div key={i} className="flex items-center gap-2 p-1.5 rounded-md hover:bg-accent group">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{t.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{t.description || 'No description'}</p>
                </div>
                <Button variant="ghost" size="icon" className="w-6 h-6 flex-shrink-0" onClick={() => handleApplyTemplate(t)} aria-label="Apply Template">
                  <Play size={10} />
                </Button>
                <Button variant="ghost" size="icon" className="w-6 h-6 flex-shrink-0 opacity-0 group-hover:opacity-100"
                  onClick={() => removeTemplate(i)} aria-label="Delete Template">
                  <Trash2 size={10} />
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
};
