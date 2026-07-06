import { Button } from "@/components/ui/Button";

interface PlaceholderFormNoticeProps {
  label: string;
  ticket: string;
  onClose: () => void;
}

export function PlaceholderFormNotice({ label, ticket, onClose }: PlaceholderFormNoticeProps) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted">
        El formulario de «{label}» se implementará en la tarea {ticket} (Linear).
      </p>
      <Button variant="secondary" onClick={onClose}>
        Cerrar
      </Button>
    </div>
  );
}
