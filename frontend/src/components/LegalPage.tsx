export function LegalPage({ title, body }: { title: string; body: string }) {
  return (
    <div className="min-h-screen bg-background px-6 py-20">
      <div className="max-w-3xl mx-auto rounded-xl bg-surface-container-lowest p-10 ambient-shadow">
        <h1 className="text-4xl font-headline font-black tracking-tight text-on-surface mb-4">{title}</h1>
        <p className="text-on-surface-variant leading-relaxed text-base">{body}</p>
      </div>
    </div>
  );
}
