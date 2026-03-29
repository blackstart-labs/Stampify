import { useEffect, useRef, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CanvasStage } from '@/components/canvas/CanvasStage';
import type { CanvasStageHandle } from '@/components/canvas/CanvasStage';
import { ToolPanel } from '@/components/panels/ToolPanel';
import { LayerPanel } from '@/components/panels/LayerPanel';
import { PropertiesPanel } from '@/components/panels/PropertiesPanel';
import { TemplatePanel } from '@/components/panels/TemplatePanel';
import { TopToolbar } from '@/components/toolbar/TopToolbar';
import { StartScreen } from '@/components/StartScreen';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { useCanvasStore } from '@/store/canvasStore';
import { Separator } from '@/components/ui/separator';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Layers, ChevronLeft, ChevronRight } from 'lucide-react';

const AUTOSAVE_KEY = 'stampify-autosave';
const AUTOSAVE_INTERVAL = 30000;

function App() {
  useKeyboardShortcuts();

  const canvasStageRef = useRef<CanvasStageHandle>(null);
  const { document: doc, loadDocument, hasActiveProject } = useCanvasStore();
  const [showRestore, setShowRestore] = useState(false);
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Check for autosave on mount
  useEffect(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.layers && parsed.layers.length > 0) {
          setShowRestore(true);
        }
      } catch { /* ignore */ }
    }
  }, []);

  // Autosave every 30 seconds
  useEffect(() => {
    if (!hasActiveProject) return;
    const interval = setInterval(() => {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc));
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [doc, hasActiveProject]);

  const handleRestore = () => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        loadDocument(parsed);
      } catch { /* ignore */ }
    }
    setShowRestore(false);
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen w-screen flex flex-col overflow-hidden bg-background text-foreground relative">
        {!hasActiveProject ? (
          <StartScreen />
        ) : (
          <>
            {/* Top Toolbar */}
            <TopToolbar canvasStageRef={canvasStageRef} />

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden">
          {/* Tool Panel */}
          <ToolPanel />

          {/* Left Sidebar: Layer Panel */}
          <div
            className={`border-r border-border bg-card flex flex-col transition-all duration-200 ${
              leftCollapsed ? 'w-0 overflow-hidden' : 'w-56'
            }`}
          >
            <div className="flex items-center justify-between px-2 py-1.5 border-b border-border">
              <span className="text-xs font-semibold uppercase text-muted-foreground flex items-center gap-1">
                <Layers size={12} /> Layers
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <LayerPanel />
            </div>
            <Separator />
            <div className="max-h-64 overflow-auto p-2">
              <TemplatePanel />
            </div>
          </div>

          {/* Collapse toggle for left */}
          <button
            className="w-4 flex items-center justify-center bg-card border-r border-border hover:bg-accent transition-colors"
            onClick={() => setLeftCollapsed(!leftCollapsed)}
            aria-label="Toggle left panel"
          >
            {leftCollapsed ? <ChevronRight size={10} /> : <ChevronLeft size={10} />}
          </button>

          {/* Canvas Area */}
          <CanvasStage ref={canvasStageRef} />

          {/* Collapse toggle for right */}
          <button
            className="w-4 flex items-center justify-center bg-card border-l border-border hover:bg-accent transition-colors"
            onClick={() => setRightCollapsed(!rightCollapsed)}
            aria-label="Toggle right panel"
          >
            {rightCollapsed ? <ChevronLeft size={10} /> : <ChevronRight size={10} />}
          </button>

          {/* Right Sidebar: Properties Panel */}
          <div
            className={`border-l border-border bg-card transition-all duration-200 ${
              rightCollapsed ? 'w-0 overflow-hidden' : 'w-64'
            }`}
          >
            <div className="flex items-center px-2 py-1.5 border-b border-border">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Properties</span>
            </div>
            <div className="h-[calc(100%-32px)]">
              <PropertiesPanel />
            </div>
          </div>
        </div>
      </>
    )}
  </div>

      {/* Restore Dialog */}
      <Dialog open={showRestore} onOpenChange={setShowRestore}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Restore Previous Session</DialogTitle>
            <DialogDescription>
              A previous editing session was found. Would you like to restore it?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { localStorage.removeItem(AUTOSAVE_KEY); setShowRestore(false); }}>
              Start Fresh
            </Button>
            <Button onClick={handleRestore} className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
              Restore Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export default App;
