"use client";

type PrintButtonProps = {
  targetId: string;
  label?: string;
  className?: string;
  strategy?: "clone" | "in-place";
};

export default function PrintButton({
  targetId,
  label = "Imprimer / Enregistrer en PDF",
  className = "",
  strategy = "clone",
}: PrintButtonProps) {
  function handlePrint() {
    const target = document.getElementById(targetId);

    if (!target) return;

    if (strategy === "in-place") {
      target.classList.add("print-active");
      document.body.classList.add("print-mode", "print-document-mode");

      const cleanup = () => {
        target.classList.remove("print-active");
        document.body.classList.remove("print-mode", "print-document-mode");
        window.removeEventListener("afterprint", cleanup);
      };

      window.addEventListener("afterprint", cleanup);
      window.print();
      return;
    }

    document.querySelectorAll(".print-root").forEach((element) => element.remove());

    const printRoot = document.createElement("div");
    const printableContent = target.cloneNode(true) as HTMLElement;
    printRoot.className = "print-root";
    printableContent.removeAttribute("id");
    printableContent.classList.add("print-target");
    printRoot.appendChild(printableContent);
    document.body.appendChild(printRoot);
    document.body.classList.add("print-mode");

    const cleanup = () => {
      document.body.classList.remove("print-mode");
      printRoot.remove();
      window.removeEventListener("afterprint", cleanup);
    };

    window.addEventListener("afterprint", cleanup);
    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className={`print-hide inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-400 hover:bg-slate-50 ${className}`}
    >
      {label}
    </button>
  );
}
