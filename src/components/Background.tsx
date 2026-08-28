/** Fixed aurora-blob + grid background, rendered once behind everything. */
export function Background() {
  return (
    <>
      <div className="aurora-bg">
        <div
          className="aurora-blob"
          style={{
            width: 480,
            height: 480,
            top: -120,
            left: -80,
            background: "radial-gradient(circle, #10b981, transparent 70%)",
          }}
        />
        <div
          className="aurora-blob"
          style={{
            width: 420,
            height: 420,
            top: 120,
            right: -100,
            background: "radial-gradient(circle, #22d3ee, transparent 70%)",
            animationDelay: "-6s",
          }}
        />
        <div
          className="aurora-blob"
          style={{
            width: 360,
            height: 360,
            bottom: -120,
            left: "40%",
            background: "radial-gradient(circle, #8b5cf6, transparent 70%)",
            animationDelay: "-12s",
          }}
        />
      </div>
      <div className="grid-overlay" />
    </>
  );
}
