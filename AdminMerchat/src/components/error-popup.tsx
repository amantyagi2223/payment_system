type ErrorPopupProps = {
  message?: string;
};

export default function ErrorPopup({ message }: ErrorPopupProps) {
  if (!message) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-[min(92vw,420px)] rounded-xl border border-rose-200 bg-white p-4 shadow-xl">
      <p className="text-xs uppercase tracking-[0.2em] text-rose-600">API Error</p>
      <p className="mt-1 text-sm text-rose-700">{message}</p>
    </div>
  );
}

