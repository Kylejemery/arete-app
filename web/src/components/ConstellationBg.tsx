export default function ConstellationBg() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle, rgba(201,168,76,0.12) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Vignette — fades grid toward edges */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 70% at 50% 40%, transparent 30%, #0f1724 85%)',
        }}
      />
    </div>
  );
}
