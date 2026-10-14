export function LoadingIndicator({ children, className = '' }: { children: React.ReactNode; className?: string }) {
 return <span className={'loading-indicator ' + className} role="status"><span className="loading-spinner" aria-hidden="true" />{children}</span>
}
