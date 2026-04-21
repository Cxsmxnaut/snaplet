import { ChangeEvent, DragEvent, useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { loadCreateDraft, saveCreateDraft } from '../features/kits/services/kitStorage';
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
  userId: string;
  launchIntent?: 'paste' | 'upload' | null;
  onLaunchIntentHandled?: () => void;
  onGenerate: (title: string, content: string, visibility: 'private' | 'public') => void;
  onUploadFile: (file: File, visibility: 'private' | 'public') => Promise<void>;
}

const ACCEPTED_FILE_TYPES = '.pdf,.docx,.txt,.md,.csv';

export const CreateKit = ({ userId, launchIntent = null, onLaunchIntentHandled, onGenerate, onUploadFile }: CreateKitProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<'private' | 'public'>('private');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);
  const [highlightUpload, setHighlightUpload] = useState(false);
  const handledIntentRef = useRef<string | null>(null);
  const draftHydratedRef = useRef(false);

  useEffect(() => {
    const draft = loadCreateDraft(userId);
    draftHydratedRef.current = true;
    if (!draft) {
      return;
    }

    setTitle(draft.title ?? '');
    setDescription(draft.description ?? '');
    setContent(draft.content ?? '');
    setVisibility(draft.visibility ?? 'private');
  }, [userId]);

  useEffect(() => {
    if (!draftHydratedRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      saveCreateDraft(userId, {
        title,
        description,
        content,
        visibility,
        updatedAt: new Date().toISOString(),
      });
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [content, description, title, userId, visibility]);

  useEffect(() => {
    if (!launchIntent || handledIntentRef.current === launchIntent) {
      return;
    }

    handledIntentRef.current = launchIntent;

    const timeoutId = window.setTimeout(() => {
      if (launchIntent === 'paste') {
        contentTextareaRef.current?.focus();
      }

      if (launchIntent === 'upload') {
        uploadSectionRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
        setHighlightUpload(true);
        fileInputRef.current?.click();
        window.setTimeout(() => setHighlightUpload(false), 1800);
      }

      onLaunchIntentHandled?.();
    }, 120);

    return () => window.clearTimeout(timeoutId);
  }, [launchIntent, onLaunchIntentHandled]);

  const saveDraft = () => {
    saveCreateDraft(userId, {
      title,
      description,
      content,
      visibility,
      updatedAt: new Date().toISOString(),
    });
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
      await onUploadFile(file, visibility);
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

  const buildGenerationContent = () => {
    if (!description.trim()) {
      return content;
    }

    return `Description: ${description.trim()}\n\n${content}`;
  };

  const handleGenerate = () => {
    const resolvedContent = buildGenerationContent().trim();
    if (!resolvedContent) {
      return;
    }

    logDebug('create-kit', 'Generate clicked', {
      titleLength: title.length,
      descriptionLength: description.length,
      contentLength: content.length,
    });

    onGenerate(title, resolvedContent, visibility);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 rounded-[32px] bg-surface/82 backdrop-blur-xl border border-outline-variant/10 ambient-shadow p-8">
        <div className="max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-3">Create</p>
          <h2 className="text-4xl md:text-5xl font-black font-headline text-on-surface leading-[1.08] tracking-tight mb-3">
            Turn notes into a study kit
          </h2>
          <p className="text-on-surface-variant text-base md:text-lg leading-relaxed">
            Paste notes below or upload a file. Pasting gives you the most control. Uploading starts processing right away.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="ghost"
            className="rounded-full h-12 px-6 bg-primary-container text-primary hover:bg-primary-container/80 shadow-none text-base"
            onClick={saveDraft}
          >
            {draftSaved ? 'Draft saved' : 'Save draft'}
          </Button>
          <Button className="rounded-full h-12 px-6 text-base" onClick={handleGenerate} disabled={!content.trim()}>
            Generate and review
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-6">
          <div className="rounded-[28px] border border-outline-variant/10 bg-surface/92 p-6 ambient-shadow space-y-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Study kit setup</p>
                <h3 className="mt-2 text-2xl font-headline font-bold text-on-surface">Paste the source you want to study</h3>
              </div>
              <div className="inline-flex items-center rounded-full bg-surface-container-low p-1 self-start">
              <VisibilityPill active={visibility === 'private'} onClick={() => setVisibility('private')} label="Private" />
              <VisibilityPill active={visibility === 'public'} onClick={() => setVisibility('public')} label="Public" />
              </div>
            </div>
            <p className="text-sm text-on-surface-variant">
              {visibility === 'public'
                ? 'This kit will get a read-only share page you can copy from review once it is generated.'
                : 'This kit stays private to your account until you explicitly make it public.'}
            </p>
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">Title</label>
                <input
                  type="text"
                  id="create-kit-title"
                  name="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Biology Chapter 5"
                  className="w-full bg-surface text-on-surface text-lg font-headline font-semibold p-5 rounded-xl border border-outline-variant/12 focus:ring-2 focus:ring-primary/25 focus:outline-none transition-all placeholder:text-on-surface-variant/30"
                />
              </div>
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-3 block">Optional context</label>
                <input
                  type="text"
                  id="create-kit-description"
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Lecture recap, vocab list, review packet..."
                  className="w-full bg-surface text-on-surface text-base p-5 rounded-xl border border-outline-variant/12 focus:ring-2 focus:ring-primary/25 focus:outline-none transition-all placeholder:text-on-surface-variant/30"
                />
              </div>
            </div>
          </div>

          <div className="bg-surface/95 deep-bloom rounded-[30px] flex flex-col min-h-[520px] border border-outline-variant/10 overflow-hidden">
            <div className="p-6 border-b border-outline-variant/10 flex flex-col gap-3 bg-surface-container-low/40 md:flex-row md:items-center md:justify-between">
              <div>
                <label className="text-xs font-bold uppercase tracking-widest text-on-surface-variant block">Source material</label>
                <p className="mt-2 text-sm text-on-surface-variant">Paste the notes you want turned into questions. Clear headings and bullets help the generator a lot.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={insertDiagramTemplate}
                  className="rounded-full bg-surface-container-low px-4 py-2 text-xs font-bold text-on-surface-variant hover:text-on-surface"
                >
                  Add diagram prompt
                </button>
                <button onClick={() => setContent('')} className="text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1">
                  <Trash2 className="w-3 h-3" /> Clear
                </button>
              </div>
            </div>
            <textarea
              ref={contentTextareaRef}
              id="create-kit-content"
              name="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Paste your notes, vocab, or content here to generate questions..."
              className="flex-grow bg-transparent p-8 text-on-surface text-lg leading-relaxed resize-none border-none focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/20 font-sans"
            />
            <div className="p-6 bg-surface-container-low/35 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-on-surface-variant">
                When you are ready, we will generate questions and take you straight into review.
              </p>
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={!content.trim()}
                className="px-10 rounded-full"
              >
                <Sparkles className="w-5 h-5" />
                Generate and review
              </Button>
            </div>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 flex flex-col gap-6">
          <section className="bg-surface/92 rounded-[28px] p-8 flex flex-col gap-6 relative overflow-hidden group border border-outline-variant/10 ambient-shadow">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/10 transition-colors"></div>
            <div className="relative z-10">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-3">Upload instead</p>
              <h3 className="text-xl font-headline font-bold text-on-surface mb-2">Create from a file</h3>
              <p className="text-sm text-on-surface-variant mb-6">
                Uploading skips the editor and starts processing immediately. Use this when your notes are already in a clean file.
              </p>
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
                ref={uploadSectionRef}
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
                  isDragOver || highlightUpload
                    ? 'border-primary/80 bg-primary/5'
                    : 'border-outline-variant/30 hover:border-primary/50'
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

          <section className="bg-surface/92 rounded-[28px] border border-outline-variant/10 p-8 ambient-shadow">
            <div className="flex items-center gap-3 mb-4">
              <Lightbulb className="text-tertiary w-5 h-5" />
              <h4 className="font-headline font-bold text-tertiary">Best results</h4>
            </div>
            <ul className="space-y-3 text-sm text-on-surface-variant leading-relaxed">
              <li>Use headings and bullets when you can.</li>
              <li>Keep one topic per kit so the generated deck stays focused.</li>
              <li>Add a short title now so the kit is easier to find later.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
};

const VisibilityPill = ({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`h-10 rounded-full px-4 text-sm font-bold transition-colors ${
      active ? 'bg-surface text-on-surface' : 'text-on-surface-variant'
    }`}
  >
    {label}
  </button>
);
