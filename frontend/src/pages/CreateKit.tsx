import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/Button';
import { logDebug } from '../lib/debug';
import { 
  CloudUpload, 
  FileText, 
  X, 
  Lightbulb, 
  Trash2,
  Sparkles,
  Loader2
} from 'lucide-react';

interface CreateKitProps {
  onGenerate: (title: string, content: string) => void;
  onUploadFile: (file: File) => Promise<void>;
}

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.txt,.md,.csv';

export const CreateKit = ({ onGenerate, onUploadFile }: CreateKitProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const rawDraft = window.localStorage.getItem('snaplet_create_draft');
    if (!rawDraft) {
      return;
    }

    try {
      const draft = JSON.parse(rawDraft) as { title?: string; description?: string; content?: string };
      setTitle(draft.title ?? '');
      setDescription(draft.description ?? '');
      setContent(draft.content ?? '');
    } catch {
      window.localStorage.removeItem('snaplet_create_draft');
    }
  }, []);

  const saveDraft = () => {
    window.localStorage.setItem(
      'snaplet_create_draft',
      JSON.stringify({
        title,
        description,
        content,
        updatedAt: new Date().toISOString(),
      }),
    );
    setDraftSaved(true);
    window.setTimeout(() => setDraftSaved(false), 1800);
  };

  const insertDiagramTemplate = () => {
    setContent((current) =>
      current
        ? `${current}\n\n[Diagram description]\nLabel the key parts and explain what each part does.\n`
        : '[Diagram description]\nLabel the key parts and explain what each part does.\n',
    );
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      await onUploadFile(file);
      setUploadedFileName(file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handlePickFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    if (!nextFile) {
      return;
    }
    await handleUpload(nextFile);
    event.target.value = '';
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const nextFile = event.dataTransfer.files?.[0];
    if (!nextFile) {
      return;
    }
    await handleUpload(nextFile);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      <header className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6 rounded-[32px] bg-surface/82 backdrop-blur-xl border border-outline-variant/10 ambient-shadow p-8">
        <div className="max-w-3xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-3">Creator</p>
          <h2 className="text-5xl font-black font-headline text-on-surface leading-[1.1] tracking-tight mb-4">
            Create a new study kit
          </h2>
          <p className="text-on-surface-variant text-lg leading-relaxed">
            Build a study kit from notes, files, or pasted material, then turn it into high-quality questions.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            className="rounded-full h-12 px-6 bg-primary-container text-primary hover:bg-primary-container/80 shadow-none text-base"
            onClick={saveDraft}
          >
            {draftSaved ? 'Draft saved' : 'Create'}
          </Button>
          <Button className="rounded-full h-12 px-6 text-base" onClick={() => onGenerate(title, content)} disabled={!content}>
            Create and practice
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          <div className="inline-flex items-center rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface-variant self-start">
            Public
          </div>

          <div className="bg-surface/92 p-6 rounded-[28px] border border-outline-variant/10 ambient-shadow">
            <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-4 block">Title</label>
            <input 
              type="text" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add a clear title for your set"
              className="w-full bg-surface text-on-surface text-xl font-headline font-semibold p-5 rounded-xl border border-outline-variant/12 focus:ring-2 focus:ring-primary/25 focus:outline-none transition-all placeholder:text-on-surface-variant/30"
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add a description..."
              className="mt-4 w-full bg-surface text-on-surface text-base p-5 rounded-xl border border-outline-variant/12 focus:ring-2 focus:ring-primary/25 focus:outline-none transition-all placeholder:text-on-surface-variant/30"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button onClick={() => fileInputRef.current?.click()} className="rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface-variant">+ Import</button>
            <button onClick={insertDiagramTemplate} className="rounded-full bg-surface-container-low px-5 py-3 text-sm font-bold text-on-surface-variant">+ Add diagram</button>
            <div className="ml-auto rounded-full bg-primary-container/60 px-4 py-2 text-sm font-bold text-primary">
              AI suggestions included
            </div>
          </div>

          <div className="bg-surface/95 deep-bloom rounded-[30px] flex flex-col min-h-[540px] border border-outline-variant/10 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low/40">
              <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Source material</label>
              <button onClick={() => setContent('')} className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                <Trash2 className="w-3 h-3" /> Clear
              </button>
            </div>
            <textarea 
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your notes, vocab, or content here to generate questions..."
              className="flex-grow bg-transparent p-8 text-on-surface text-lg leading-relaxed resize-none border-none focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/20 font-sans"
            />
            <div className="p-6 bg-surface-container-low/35 flex justify-end">
              <Button 
                size="lg" 
                onClick={() => {
                  logDebug('create-kit', 'Generate clicked', {
                    titleLength: title.length,
                    descriptionLength: description.length,
                    contentLength: content.length,
                  });
                  onGenerate(title, buildGenerationContent());
                }}
                disabled={!content}
                className="px-10 rounded-full"
              >
                <Sparkles className="w-5 h-5" />
                Generate Questions
              </Button>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          <section className="bg-surface/92 rounded-[28px] p-8 flex flex-col gap-6 relative overflow-hidden group border border-outline-variant/10 ambient-shadow">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="relative z-10">
              <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Import Documents</h3>
              <p className="text-sm text-on-surface-variant mb-6">Drop your PDFs, DOCX, or text files here for automated parsing.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_FILE_TYPES}
                className="hidden"
                onChange={(e) => {
                  void handlePickFile(e);
                }}
              />
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(event) => {
                  void handleDrop(event);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-[24px] p-10 flex flex-col items-center justify-center gap-4 transition-all cursor-pointer bg-surface-container-low group/upload ${
                  isDragOver ? 'border-primary/80' : 'border-outline-variant/30 hover:border-primary/50'
                }`}
              >
                <div className="w-16 h-16 rounded-full bg-surface-container-high flex items-center justify-center group-hover/upload:scale-110 transition-transform">
                  {uploading ? <Loader2 className="w-8 h-8 text-primary animate-spin" /> : <CloudUpload className="w-8 h-8 text-primary" />}
                </div>
                <div className="text-center">
                  <span className="text-sm font-semibold text-on-surface">{uploading ? 'Uploading...' : 'Click to upload or drag file'}</span>
                  <p className="text-xs text-on-surface-variant/60 mt-1">Supported: PDF, DOCX, TXT, MD, CSV (max 8MB)</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-col gap-3">
              {uploadedFileName ? (
                <div className="flex items-center gap-3 p-3 bg-surface-container-high/40 rounded-xl border border-outline-variant/10">
                  <FileText className="w-5 h-5 text-secondary" />
                  <div className="flex-grow">
                    <p className="text-xs font-bold text-on-surface truncate">{uploadedFileName}</p>
                    <p className="text-[10px] text-on-surface-variant/60">Uploaded and parsed</p>
                  </div>
                  <button
                    onClick={() => setUploadedFileName(null)}
                    className="text-on-surface-variant hover:text-error transition-colors"
                    aria-label="Clear uploaded file state"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : null}
              {uploadError ? <p className="text-xs text-error">{uploadError}</p> : null}
            </div>
          </section>

          {/* Tips */}
          <section className="bg-surface/92 rounded-[28px] border border-outline-variant/10 p-8 ambient-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="text-tertiary w-5 h-5" />
              <h4 className="font-headline font-bold text-tertiary">Pro Tip</h4>
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              For the best results with our kinetic intelligence engine, ensure your notes include clear headings and key terms. Use bullet points to help the AI identify relationship clusters.
            </p>
          </section>

          {/* Decorative */}
          <div className="h-48 rounded-[24px] overflow-hidden relative border border-outline-variant/10">
            <img 
              src="https://picsum.photos/seed/kinetic/400/300" 
              alt="Abstract" 
              className="w-full h-full object-cover grayscale opacity-40"
              referrerPolicy="no-referrer"
            />
            <div className="absolute bottom-4 left-4 right-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Kinetic Intelligence Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
  const buildGenerationContent = () => {
    if (!description.trim()) {
      return content;
    }

    return `Description: ${description.trim()}\n\n${content}`;
  };
