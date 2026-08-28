import { useSettings } from "../context/SettingsContext";

/** Renders the uploaded logo if present, otherwise the Numera wordmark + glyph. */
export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { settings } = useSettings();
  const text = settings.site_name || "Numera";
  const dims = size === "lg" ? "h-9" : size === "sm" ? "h-6" : "h-7";

  if (settings.site_logo_url) {
    return (
      <img
        src={settings.site_logo_url}
        alt={text}
        className={`${dims} w-auto`}
        style={{ maxHeight: 36 }}
      />
    );
  }
  return (
    <span className="flex items-center gap-2 font-display font-bold">
      <span className="relative grid place-items-center">
        <span
          className="block rounded-lg"
          style={{
            width: size === "lg" ? 30 : 24,
            height: size === "lg" ? 30 : 24,
            background: "linear-gradient(135deg, #34d399, #22d3ee)",
          }}
        />
        <span
          className="absolute font-bold text-[#04130d]"
          style={{ fontSize: size === "lg" ? 16 : 13 }}
        >
          N
        </span>
      </span>
      <span style={{ color: "var(--fg)" }}>{text}</span>
    </span>
  );
}
