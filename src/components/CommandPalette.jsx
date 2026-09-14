import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon.jsx";
export function CommandPalette({ commands, onClose }) {
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const input = useRef(null);
  const results = commands.filter(
    (c) =>
      !c.disabled &&
      c.label.toLocaleLowerCase("es").includes(query.toLocaleLowerCase("es")),
  );
  useEffect(() => {
    const previous = document.activeElement;
    input.current?.focus();
    return () => previous?.focus();
  }, []);
  useEffect(() => {
    document
      .querySelector(".command-results button.active")
      ?.scrollIntoView({ block: "nearest" });
  }, [index]);
  function run(command) {
    if (!command) return;
    onClose();
    command.action();
  }
  return (
    <div className="command-backdrop" onMouseDown={onClose}>
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Buscar comandos"
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setIndex((i) => Math.max(0, Math.min(i + 1, results.length - 1)));
          }
          if (e.key === "ArrowUp") {
            e.preventDefault();
            setIndex((i) => Math.max(0, i - 1));
          }
          if (e.key === "Enter") {
            e.preventDefault();
            run(results[index]);
          }
          if (e.key === "Tab") {
            e.preventDefault();
            input.current?.focus();
          }
        }}
      >
        <label>
          <Icon name="search" />
          <input
            ref={input}
            placeholder="¿Qué quieres hacer?"
            aria-label="Buscar comando"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIndex(0);
            }}
          />
          <kbd>esc</kbd>
        </label>
        <div className="command-results">
          {results.map((c, i) => (
            <button
              key={c.id}
              className={i === index ? "active" : ""}
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(c)}
            >
              <Icon name={c.icon} />
              <span>{c.label}</span>
              {c.hint && <kbd>{c.hint}</kbd>}
            </button>
          ))}
          {!results.length && (
            <p>
              No hay resultados. Prueba con «vídeo», «guardar» o «estadísticas».
            </p>
          )}
        </div>
        <footer>
          ↑ ↓ para navegar <span>↵ para abrir</span>
        </footer>
      </section>
    </div>
  );
}
