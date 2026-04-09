type MissingStateProps = {
  title: string;
  message: string;
  onGoBack: () => void;
};

export function MissingState({ title, message, onGoBack }: MissingStateProps) {
  return (
    <div className="max-w-2xl mx-auto rounded-xl bg-surface-container-lowest p-10 text-center space-y-4 ambient-shadow">
      <h2 className="text-3xl font-headline font-black tracking-tight text-on-surface">{title}</h2>
      <p className="text-on-surface-variant leading-relaxed">{message}</p>
      <button className="px-6 py-3 rounded-lg gradient-primary text-on-primary font-bold font-headline" onClick={onGoBack}>
        Go to Dashboard
      </button>
    </div>
  );
}
