import KarakeepFull from "@/public/icons/karakeep-full.svg";
import KarakeepMark from "@/public/icons/logo-icon.svg";

export default function KarakeepLogo({
  height,
  compact = false,
}: {
  height: number;
  compact?: boolean;
}) {
  const Icon = compact ? KarakeepMark : KarakeepFull;
  return (
    <span className="flex items-center">
      <Icon
        height={height}
        width={compact ? height : undefined}
        className="fill-foreground"
      />
    </span>
  );
}
