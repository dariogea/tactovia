import { Component } from "react";
export class ErrorBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Tactovia:", error);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="access-screen">
          <section className="modal">
            <h1>No se pudo mostrar esta pantalla</h1>
            <p>
              Vuelve a abrir Tactovia y utiliza «Continuar sesión» o tu último
              archivo guardado. Tus vídeos y tu biblioteca no se han eliminado.
            </p>
            <p>
              En la demo solo se conserva lo que hayas guardado en un archivo.
            </p>
            <button
              className="button primary"
              onClick={() => location.reload()}
            >
              Volver a abrir
            </button>
          </section>
        </main>
      );
    return this.props.children;
  }
}
