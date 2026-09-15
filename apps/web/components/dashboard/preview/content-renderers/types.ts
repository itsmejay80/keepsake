import { ZBookmark } from "@karakeep/shared/types/bookmarks";

export interface ContentRenderer {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  canRender: (bookmark: ZBookmark) => boolean;
  component: React.ComponentType<{ bookmark: ZBookmark }>;
  priority?: number;
  /** When false, the renderer is offered in the dropdown but is not the default view. */
  preferAsDefault?: boolean | ((bookmark: ZBookmark) => boolean);
}

export interface ContentRendererRegistry {
  register: (renderer: ContentRenderer) => void;
  getRenderers: (bookmark: ZBookmark) => ContentRenderer[];
  getAllRenderers: () => ContentRenderer[];
}
