interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorMessage({
  title = "Error",
  message,
  onRetry,
}: ErrorMessageProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className="max-w-md w-full p-6 border border-red-200 bg-red-50 rounded-lg">
        <h3 className="text-lg font-semibold text-red-900 mb-2">{title}</h3>
        <p className="text-sm text-red-800 mb-4">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}
