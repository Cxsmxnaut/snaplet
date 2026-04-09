type MissingStateProps = {
  title: string;
  message: string;
  onGoBack: () => void;
};

export function MissingState({ title, message, onGoBack }: MissingStateProps) {
  return (
    <div className="max-w-2xl mx-auto rounded-2xl border border-outline-variant/20 bg-surface-container-low p-8 text-center space-y-4">
      <h2 className="text-2xl font-headline font-black text-on-surface">{title}</h2>
      <p className="text-on-surface-variant">{message}</p>
      <button className="px-6 py-3 rounded-full bg-primary text-on-primary font-bold" onClick={onGoBack}>
        Go to Dashboard
      </button>
    </div>
  );
}
