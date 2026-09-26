export default function KarakeepLogo({
  height,
  compact = false,
}: {
  height: number;
  compact?: boolean;
}) {
  return (
    <span
      className="flex items-center font-bold tracking-tight text-foreground"
      style={{ fontSize: height, lineHeight: 1 }}
    >
      {compact ? "K" : "Keepsake"}
    </span>
  );
}
