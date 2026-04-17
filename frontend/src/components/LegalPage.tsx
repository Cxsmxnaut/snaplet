type LegalSection = {
  title: string;
  body: readonly string[];
};

export function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
  footer,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  sections: readonly LegalSection[];
  footer?: string;
}) {
  return (
    <div className="min-h-screen bg-background px-6 py-20">
      <div className="max-w-4xl mx-auto rounded-[28px] bg-surface p-10 ambient-shadow border border-outline-variant/10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary mb-4">{eyebrow}</p>
        <h1 className="text-4xl md:text-5xl font-headline font-black tracking-tight text-on-surface mb-4">{title}</h1>
        <p className="text-on-surface-variant leading-relaxed text-lg max-w-3xl">{intro}</p>

        <div className="mt-10 space-y-8">
          {sections.map((section) => (
            <section key={section.title} className="rounded-[22px] bg-surface-container-low p-6 border border-outline-variant/10">
              <h2 className="text-2xl font-headline font-bold tracking-tight text-on-surface mb-4">{section.title}</h2>
              <div className="space-y-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-on-surface-variant leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {footer ? <p className="mt-10 text-sm text-on-surface-variant">{footer}</p> : null}
      </div>
    </div>
  );
}
