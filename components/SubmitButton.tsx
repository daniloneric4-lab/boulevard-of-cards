'use client';
import { useFormStatus } from 'react-dom';

export default function SubmitButton({ children, className = 'btn btn-dark', pendingText = 'Sačekaj…' }: { children: React.ReactNode; className?: string; pendingText?: string }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? pendingText : children}
    </button>
  );
}
