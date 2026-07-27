const brandAssets = {
  horizontalPrimary: "brand/tactovia-horizontal-primary.svg",
  horizontalOnInk: "brand/tactovia-horizontal-on-ink.svg",
  horizontalNegative: "brand/tactovia-horizontal-negative.svg",
  stackedPrimary: "brand/tactovia-stacked-primary.svg",
  stackedNegative: "brand/tactovia-stacked-negative.svg",
  symbolPrimary: "brand/tactovia-symbol-primary.svg",
  symbolNegative: "brand/tactovia-symbol-negative.svg",
  animated: "brand/tactovia-logo-animated.svg"
};

export function BrandLogo({
  layout = "horizontal",
  surface = "adaptive",
  className = ""
}) {
  const primary =
    layout === "stacked"
      ? brandAssets.stackedPrimary
      : layout === "symbol"
        ? brandAssets.symbolPrimary
        : brandAssets.horizontalPrimary;
  const dark =
    layout === "stacked"
      ? brandAssets.stackedNegative
      : layout === "symbol"
        ? brandAssets.symbolNegative
        : surface === "ink" || surface === "adaptive"
          ? brandAssets.horizontalOnInk
          : brandAssets.horizontalNegative;

  if (surface === "light") {
    return (
      <img
        className={`tactovia-logo ${className}`.trim()}
        src={primary}
        alt="Tactovia"
      />
    );
  }

  if (surface === "dark" || surface === "ink") {
    return (
      <img
        className={`tactovia-logo ${className}`.trim()}
        src={dark}
        alt="Tactovia"
      />
    );
  }

  return (
    <span className={`tactovia-logo-adaptive ${className}`.trim()}>
      <img className="logo-for-light" src={primary} alt="Tactovia" />
      <img className="logo-for-dark" src={dark} alt="Tactovia" />
    </span>
  );
}

export function BrandSplash() {
  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  return (
    <div className="brand-splash" aria-label="Iniciando Tactovia">
      <img
        src={reducedMotion ? brandAssets.horizontalOnInk : brandAssets.animated}
        alt="Tactovia. Ve el juego. Decide mejor."
      />
    </div>
  );
}

export function BrandAbout({ version }) {
  return (
    <article className="settings-section brand-about-card">
      <div className="brand-about-logo">
        <BrandLogo layout="horizontal" surface="ink" />
      </div>
      <div className="brand-about-copy">
        <span className="eyebrow">Acerca de Tactovia</span>
        <h2>Plataforma de análisis deportivo</h2>
        <p>
          Del vídeo a la decisión: una herramienta local para observar,
          estructurar y convertir el juego en información útil.
        </p>
        <strong>Ve el juego. Decide mejor.</strong>
      </div>
      <div className="brand-about-version">
        <span>Versión</span>
        <strong>{version}</strong>
        <small>Datos y vídeos permanecen en este ordenador.</small>
      </div>
    </article>
  );
}
