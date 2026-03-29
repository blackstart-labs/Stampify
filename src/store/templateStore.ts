import { create } from 'zustand';
import type { Template } from '@/types';
import { getStoredTemplates, saveTemplateToStorage } from '@/utils/templateUtils';

interface TemplateState {
  templates: Template[];
  activeTemplate: Template | null;
  loadTemplates: () => void;
  setActiveTemplate: (template: Template | null) => void;
  addTemplate: (template: Template) => void;
  removeTemplate: (index: number) => void;
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  activeTemplate: null,

  loadTemplates: () => {
    set({ templates: getStoredTemplates() });
  },

  setActiveTemplate: (template) => set({ activeTemplate: template }),

  addTemplate: (template) => {
    saveTemplateToStorage(template);
    set({ templates: getStoredTemplates() });
  },

  removeTemplate: (index) => {
    const templates = getStoredTemplates();
    templates.splice(index, 1);
    localStorage.setItem('stampify-templates', JSON.stringify(templates));
    set({ templates });
  },
}));
