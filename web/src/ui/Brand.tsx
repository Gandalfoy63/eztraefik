// Docs: docs/05 - UI-UX/Logo.md
// The eztraefik logo in the app. Files are copies of marketing/logo/final (see the Logo note to refresh them).

// BrandMark is the app icon (blue tile), the same in both themes.
export function BrandMark({ size = 28 }: { size?: number }) {
  return <img className="brand-mark" src="/brand/icon-light.svg" width={size} height={size} alt="" aria-hidden="true" />;
}

// BrandLockup is mark + name in the colours of the current theme. Both versions are in the page; CSS shows the one
// that matches the theme (system preference or the theme switch). The animated files play once on load and show the
// finished logo when reduced motion is on.
export function BrandLockup({ height = 40, animated = false }: { height?: number; animated?: boolean }) {
  const suffix = animated ? "-animated" : "";
  const width = Math.round((height * 821) / 256);
  return (
    <span className="brand-lockup" role="img" aria-label="eztraefik">
      <img className="brand-on-light" src={`/brand/lockup-light${suffix}.svg`} width={width} height={height} alt="" />
      <img className="brand-on-dark" src={`/brand/lockup-dark${suffix}.svg`} width={width} height={height} alt="" />
    </span>
  );
}

// The name as text, with "ez" in the brand blue, for places where the name sits next to the icon.
export function BrandName() {
  return (
    <span className="brand-name">
      <span className="brand-ez">ez</span>traefik
    </span>
  );
}
