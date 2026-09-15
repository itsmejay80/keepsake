import {
  ZBookmark,
  ZPreferredLinkPreview,
} from "@karakeep/shared/types/bookmarks";

function prefersAsDefault(
  renderer: {
    preferAsDefault?: boolean | ((bookmark: ZBookmark) => boolean);
  },
  bookmark?: ZBookmark | null,
): boolean {
  if (typeof renderer.preferAsDefault === "function") {
    return bookmark ? renderer.preferAsDefault(bookmark) : false;
  }
  return renderer.preferAsDefault !== false;
}

export function getDefaultLinkSection({
  availableRenderers,
  preferredPreview,
  bookmark,
}: {
  availableRenderers: {
    id: string;
    preferAsDefault?: boolean | ((bookmark: ZBookmark) => boolean);
  }[];
  preferredPreview?: ZPreferredLinkPreview | null;
  bookmark?: ZBookmark | null;
}): string {
  const defaultRenderer = availableRenderers.find((renderer) =>
    prefersAsDefault(renderer, bookmark),
  );
  if (defaultRenderer) {
    return defaultRenderer.id;
  }

  if (preferredPreview === "screenshot") {
    return "screenshot";
  }
  if (preferredPreview === "overview") {
    return "overview";
  }
  return "cached";
}
