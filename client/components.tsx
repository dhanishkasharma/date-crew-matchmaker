import { useEffect, useRef, type ReactNode } from "react";
import { LoaderCircle, X } from "lucide-react";
import { initials } from "./format";

export function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className={`brand ${light ? "brand-light" : ""}`}>
      <span className="brand-symbol">tdc</span>
      <div>
        <strong>The Date Crew</strong>
        <small>Matchmaker workspace</small>
      </div>
    </div>
  );
}
export function Avatar({
  name,
  large = false,
}: {
  name: string;
  id?: string;
  large?: boolean;
}) {
  return (
    <span
      className={`avatar ${large ? "avatar-large" : ""}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}
export function Verified({
  verified,
  label = true,
}: {
  verified: boolean;
  label?: boolean;
}) {
  return (
    <span
      className={`verified ${verified ? "" : "pending"}`}
      title={verified ? "Verified profile" : "Awaiting verification"}
    >
      <span className="verification-dot" />
      {label && (verified ? "Verified" : "Unverified")}
    </span>
  );
}
export function StageTag({ stage }: { stage: string }) {
  return (
    <span
      className={`stage-tag stage-${stage.toLowerCase().replaceAll(" ", "-")}`}
    >
      {stage}
    </span>
  );
}
export function Spinner({ label = "Loading workspace…" }: { label?: string }) {
  return (
    <div className="loading-state" role="status">
      <LoaderCircle className="spin" size={20} />
      <span>{label}</span>
    </div>
  );
}
export function Empty({
  title,
  children,
}: {
  icon?: ReactNode;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <h3>{title}</h3>
      {children && <p>{children}</p>}
    </div>
  );
}
export function Modal({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "modal-wide" : ""}`}
      onCancel={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      aria-labelledby="modal-title"
    >
      <header className="modal-heading">
        <div>
          <h2 id="modal-title">{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
        <button
          className="icon-button"
          aria-label="Close dialog"
          onClick={onClose}
        >
          <X size={20} />
        </button>
      </header>
      {children}
    </dialog>
  );
}
