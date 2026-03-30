import { useEffect, useRef, useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CanvasStage } from '@/components/canvas/CanvasStage';
import type { CanvasStageHandle } from '@/components/canvas/CanvasStage';
import { ToolPanel } from '@/components/panels/ToolPanel';
import { LayerPanel } from '@/components/panels/LayerPanel';
import { PropertiesPanel } from '@/components/panels/PropertiesPanel';
import { TemplatePanel } from '@/components/panels/TemplatePanel';
import { TopToolbar } from '@/components/toolbar/TopToolbar';
import { FigmaToolbar } from '@/components/toolbar/FigmaToolbar';
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
  const [showRestore, setShowRestore] = useState(() => {
    const saved = localStorage.getItem(AUTOSAVE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.layers && parsed.layers.length > 0) {
          return true;
        }
      } catch { /* ignore */ }
    }
    return false;
  });
  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  
  const [leftWidth, setLeftWidth] = useState(() => {
    const saved = localStorage.getItem('stampify-left-width');
    return saved ? parseInt(saved, 10) : 224; // w-56 default
  });
  const [rightWidth, setRightWidth] = useState(() => {
    const saved = localStorage.getItem('stampify-right-width');
    return saved ? parseInt(saved, 10) : 256; // w-64 default
  });
  const [isDraggingLeft, setIsDraggingLeft] = useState(false);
  const [isDraggingRight, setIsDraggingRight] = useState(false);



  // Autosave every 30 seconds
  useEffect(() => {
    if (!hasActiveProject) return;
    const interval = setInterval(() => {
      localStorage.setItem(AUTOSAVE_KEY, JSON.stringify(doc));
    }, AUTOSAVE_INTERVAL);
    return () => clearInterval(interval);
  }, [doc, hasActiveProject]);

  // Persist panel widths
  useEffect(() => {
    localStorage.setItem('stampify-left-width', leftWidth.toString());
  }, [leftWidth]);

  useEffect(() => {
    localStorage.setItem('stampify-right-width', rightWidth.toString());
  }, [rightWidth]);

  // Drag listeners
  useEffect(() => {
    if (!isDraggingLeft && !isDraggingRight) return;
    
    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingLeft) {
        let newWidth = e.clientX - 48; // 48 is w-12 ToolPanel width
        if (newWidth < 180) newWidth = 180;
        if (newWidth > 600) newWidth = 600;
        setLeftWidth(newWidth);
      }
      if (isDraggingRight) {
        let newWidth = window.innerWidth - e.clientX;
        if (newWidth < 200) newWidth = 200;
        if (newWidth > 600) newWidth = 600;
        setRightWidth(newWidth);
      }
    };
    
    const handlePointerUp = () => {
      setIsDraggingLeft(false);
      setIsDraggingRight(false);
      document.body.style.cursor = '';
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingLeft, isDraggingRight]);

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
          {/* Left Sidebar: Layer Panel */}
          <div
            className={`border-r border-border bg-card flex flex-col ${!isDraggingLeft ? 'transition-all duration-200' : ''} ${
              leftCollapsed ? 'overflow-hidden' : ''
            }`}
            style={{ width: leftCollapsed ? 0 : leftWidth }}
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

          {/* Collapse toggle and resizer for left */}
          <div className="relative flex items-center bg-card border-r border-border">
            <button
              className="w-4 h-8 flex flex-col items-center justify-center bg-card border border-border border-l-0 rounded-r-md hover:bg-accent transition-colors z-10 absolute left-0"
              onClick={() => setLeftCollapsed(!leftCollapsed)}
              aria-label="Toggle left panel"
            >
              {leftCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
            </button>
            <div 
              className="w-1.5 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-20"
              onPointerDown={(e) => {
                e.preventDefault();
                setIsDraggingLeft(true);
                setLeftCollapsed(false);
                document.body.style.cursor = 'col-resize';
              }}
            />
          </div>

          {/* Canvas Area */}
          <CanvasStage ref={canvasStageRef} />

          {/* Collapse toggle and resizer for right */}
          <div className="relative flex items-center bg-card border-l border-border">
            <div 
              className="w-1.5 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-20"
              onPointerDown={(e) => {
                e.preventDefault();
                setIsDraggingRight(true);
                setRightCollapsed(false);
                document.body.style.cursor = 'col-resize';
              }}
            />
            <button
              className="w-4 h-8 flex flex-col items-center justify-center bg-card border border-border border-r-0 rounded-l-md hover:bg-accent transition-colors z-10 absolute right-0"
              onClick={() => setRightCollapsed(!rightCollapsed)}
              aria-label="Toggle right panel"
            >
              {rightCollapsed ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
            </button>
          </div>

          {/* Right Sidebar: Properties Panel */}
          <div
            className={`bg-card ${!isDraggingRight ? 'transition-all duration-200' : ''} ${
              rightCollapsed ? 'overflow-hidden' : ''
            }`}
            style={{ width: rightCollapsed ? 0 : rightWidth }}
          >
            <div className="flex items-center px-2 py-1.5 border-b border-border">
              <span className="text-xs font-semibold uppercase text-muted-foreground">Properties</span>
            </div>
            <div className="h-[calc(100%-32px)]">
              <PropertiesPanel />
            </div>
          </div>
        </div>
        <FigmaToolbar />
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
