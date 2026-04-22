import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { motion } from 'motion/react';
import { 
  Bold, Italic, List, ListOrdered, Quote, Heading1, Heading2, 
  Image as ImageIcon, Link as LinkIcon, Eye, Save, Trash2, 
  Settings2, Share2, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Pitch } from '@/src/types';

interface PitchEditorProps {
  pitch?: Pitch;
  onSave: (pitch: Partial<Pitch>) => void;
  onPreview: (content: string) => void;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) return null;

  const buttons = [
    { icon: Heading1, action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(), active: 'heading1' },
    { icon: Heading2, action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(), active: 'heading2' },
    { icon: Bold, action: () => editor.chain().focus().toggleBold().run(), active: 'bold' },
    { icon: Italic, action: () => editor.chain().focus().toggleItalic().run(), active: 'italic' },
    { icon: List, action: () => editor.chain().focus().toggleBulletList().run(), active: 'bulletList' },
    { icon: ListOrdered, action: () => editor.chain().focus().toggleOrderedList().run(), active: 'orderedList' },
    { icon: Quote, action: () => editor.chain().focus().toggleBlockquote().run(), active: 'blockquote' },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-muted/30">
      {buttons.map((btn, index) => (
        <Button
          key={index}
          variant="ghost"
          size="sm"
          onClick={btn.action}
          className={editor.isActive(btn.active) ? 'bg-secondary' : ''}
        >
          <btn.icon className="w-4 h-4" />
        </Button>
      ))}
      <Separator orientation="vertical" className="h-6 mx-2" />
      <Button variant="ghost" size="sm" onClick={() => {
        const url = window.prompt('URL');
        if (url) editor.chain().focus().setLink({ href: url }).run();
      }}>
        <LinkIcon className="w-4 h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => {
        const url = window.prompt('Image URL');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      }}>
        <ImageIcon className="w-4 h-4" />
      </Button>
    </div>
  );
};

export function PitchEditor({ pitch, onSave, onPreview }: PitchEditorProps) {
  const [title, setTitle] = useState(pitch?.title || 'Untitled Pitch');
  const [activeTab, setActiveTab] = useState('content');

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextStyle,
      Color,
      Image,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline',
        },
      }),
      Placeholder.configure({
        placeholder: 'Forge your pitch here...',
      }),
    ],
    content: pitch?.content || '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none prose prose-invert max-w-none px-8 py-6 min-h-[600px]',
      },
    },
  });

  const handleSave = () => {
    if (editor) {
      onSave({
        title,
        content: editor.getHTML(),
      });
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)]">
      <header className="border-b border-border p-4 bg-background z-40">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex-1 max-w-xl">
            <Input 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-2xl font-bold bg-transparent border-none p-0 focus-visible:ring-0 placeholder:opacity-50"
              placeholder="Enterprise Security Briefing..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => onPreview(editor?.getHTML() || '')}>
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              Store
            </Button>
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-white font-bold">
              <Play className="w-4 h-4 mr-2" />
              Present Mode
            </Button>
          </div>
        </div>
      </header>
      
      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr,350px]">
        <div className="flex flex-col overflow-auto bg-card/10">
          <div className="max-w-4xl mx-auto w-full my-8 bg-card border border-border shadow-2xl overflow-hidden min-h-[800px] flex flex-col">
            <MenuBar editor={editor} />
            <div className="flex-1 overflow-auto">
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>
        
        <aside className="border-l border-border bg-background p-6 overflow-auto hidden lg:block">
          <Tabs defaultValue="settings" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-6">
              <TabsTrigger value="settings">Settings</TabsTrigger>
              <TabsTrigger value="stats">Stats</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings" className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-primary font-mono text-sm uppercase font-bold">
                  <Settings2 className="w-4 h-4" />
                  Access Control
                </div>
                <Separator />
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-muted-foreground">Password Protection</label>
                  <Input type="password" placeholder="Enter secure key..." className="h-8 text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-muted-foreground">Expiration Date</label>
                  <Input type="date" className="h-8 text-xs" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs uppercase font-bold text-muted-foreground">View Limit</label>
                  <Input type="number" placeholder="50" className="h-8 text-xs" />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2 text-primary font-mono text-sm uppercase font-bold">
                  <Share2 className="w-4 h-4" />
                  Share Link
                </div>
                <Separator />
                <div className="p-3 bg-muted/50 border border-dashed border-border flex items-center justify-between gap-2">
                  <code className="text-[10px] break-all text-muted-foreground">https://vault.pitch/x9f2j...</code>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px] uppercase font-bold">Copy</Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="stats">
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                <Eye className="w-12 h-12 mb-4" />
                <p className="text-sm font-mono uppercase tracking-widest">No viewer data yet</p>
                <p className="text-xs mt-2">Insights will appear here once viewed.</p>
              </div>
            </TabsContent>
          </Tabs>
        </aside>
      </main>
    </div>
  );
}
