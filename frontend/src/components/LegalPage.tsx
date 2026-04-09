export function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-background px-6 py-16">
      <div className="max-w-3xl mx-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8">
        <h1 className="text-3xl font-headline font-black text-on-surface mb-4">{title}</h1>
        <p className="text-on-surface-variant leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
