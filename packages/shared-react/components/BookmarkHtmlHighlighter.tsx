import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { cn } from "@/lib/utils";
import { PopoverAnchor } from "@radix-ui/react-popover";
import { Check, Trash2 } from "lucide-react";

import {
  SUPPORTED_HIGHLIGHT_COLORS,
  ZHighlightColor,
} from "@karakeep/shared/types/highlights";

import { HIGHLIGHT_COLOR_MAP } from "./highlights";
import { Button } from "./ui/button";
import { Popover, PopoverContent } from "./ui/popover";
import { Textarea } from "./ui/textarea";

function clearDomSelection() {
  window.getSelection()?.removeAllRanges();
}

function isSelectionInside(container: Node | null) {
  if (!container) {
    return false;
  }
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || !selection.anchorNode) {
    return false;
  }
  return container.contains(selection.anchorNode);
}

interface HighlightFormProps {
  position: { x: number; y: number } | null;
  selectedHighlight: Highlight | null;
  onClose: () => void;
  onSave: (color: ZHighlightColor, note: string | null) => void;
  onDelete?: () => void;
  isMobile: boolean;
  autoFocusNote?: boolean;
}

const HighlightForm: React.FC<HighlightFormProps> = ({
  position,
  selectedHighlight,
  onClose,
  onSave,
  onDelete,
  isMobile,
  autoFocusNote = false,
}) => {
  const [selectedColor, setSelectedColor] = useState<ZHighlightColor>(
    selectedHighlight?.color || "yellow",
  );
  const [noteText, setNoteText] = useState(selectedHighlight?.note || "");
  const noteRef = useRef<HTMLTextAreaElement>(null);

  // Update state when selectedHighlight changes
  useEffect(() => {
    setSelectedColor(selectedHighlight?.color || "yellow");
    setNoteText(selectedHighlight?.note || "");
  }, [selectedHighlight]);

  // Readwise-style: pressing "n" focuses the note field, pressing "h"
  // (or Enter/Cmd+Enter) saves immediately. Don't steal focus by default
  // so single-key shortcuts keep working.
  useEffect(() => {
    if (position === null || !autoFocusNote) {
      return;
    }
    noteRef.current?.focus();
  }, [position, autoFocusNote, selectedHighlight]);

  useEffect(() => {
    if (position === null) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      const isTyping =
        tag === "textarea" ||
        tag === "input" ||
        target?.isContentEditable === true;
      const key = e.key.toLowerCase();

      if (isTyping) {
        // Cmd/Ctrl+Enter saves from the note field; Escape closes.
        if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
          e.preventDefault();
          onSave(selectedColor, noteText || null);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
        return;
      }

      if (key === "n") {
        e.preventDefault();
        noteRef.current?.focus();
      } else if (key === "h" || e.key === "Enter") {
        e.preventDefault();
        onSave(selectedColor, noteText || null);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (["1", "2", "3", "4"].includes(e.key)) {
        const idx = Number(e.key) - 1;
        const color = SUPPORTED_HIGHLIGHT_COLORS[idx];
        if (color) {
          e.preventDefault();
          setSelectedColor(color);
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [position, selectedColor, noteText, onSave, onClose]);

  const handleSave = () => {
    onSave(selectedColor, noteText || null);
  };

  return (
    <Popover
      open={position !== null}
      modal={isMobile}
      onOpenChange={(val) => {
        if (!val) {
          onClose();
        }
      }}
    >
      <PopoverAnchor
        className="fixed"
        style={{
          left: position?.x,
          top: position?.y,
        }}
      />
      <PopoverContent
        side={isMobile ? "bottom" : "top"}
        collisionPadding={16}
        className="z-[100] w-80 space-y-3 p-3"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div>
          <label className="mb-2 block text-sm font-medium">Color</label>
          <div className="flex items-center gap-1">
            {SUPPORTED_HIGHLIGHT_COLORS.map((color) => (
              <Button
                size="none"
                key={color}
                onClick={() => setSelectedColor(color)}
                variant="none"
                className={cn(
                  `size-8 rounded-full hover:border focus-visible:ring-0`,
                  HIGHLIGHT_COLOR_MAP.bg[color],
                )}
              >
                {selectedColor === color && (
                  <Check className="size-5 text-gray-600" />
                )}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">
            Note{" "}
            <span className="font-normal text-muted-foreground">
              (press{" "}
              <kbd className="rounded border bg-muted px-1 text-xs">n</kbd>)
            </span>
          </label>
          <Textarea
            ref={noteRef}
            placeholder="Add a note (optional)... Press ⌘/Ctrl+Enter to save"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="min-h-[80px] text-sm"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            <Button onClick={handleSave} size="sm">
              Save
            </Button>
            <Button onClick={onClose} variant="outline" size="sm">
              Cancel
            </Button>
          </div>
          {selectedHighlight && onDelete && (
            <Button
              size="sm"
              onClick={onDelete}
              variant="ghost"
              title="Delete highlight"
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export interface Highlight {
  id: string;
  startOffset: number;
  endOffset: number;
  color: ZHighlightColor;
  text: string | null;
  note?: string | null;
}

interface HTMLHighlighterProps {
  htmlContent: string;
  style?: React.CSSProperties;
  className?: string;
  highlights?: Highlight[];
  readOnly?: boolean;
  onHighlight?: (highlight: Highlight) => void;
  onUpdateHighlight?: (highlight: Highlight) => void;
  onDeleteHighlight?: (highlight: Highlight) => void;
}

const BookmarkHTMLHighlighter = forwardRef<
  HTMLDivElement,
  HTMLHighlighterProps
>(function BookmarkHTMLHighlighter(
  {
    htmlContent,
    className,
    style,
    highlights = [],
    readOnly = false,
    onHighlight,
    onUpdateHighlight,
    onDeleteHighlight,
  },
  ref,
) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Expose the content div ref to parent components
  useImperativeHandle(ref, () => contentRef.current!, []);

  const [menuPosition, setMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [pendingHighlight, setPendingHighlight] = useState<Highlight | null>(
    null,
  );
  const [selectedHighlight, setSelectedHighlight] = useState<Highlight | null>(
    null,
  );
  const [autoFocusNote, setAutoFocusNote] = useState(false);
  const isMobile = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }
    if (window.matchMedia("(pointer: coarse)").matches) {
      return true;
    }
    return /iPhone|iPod|iPad/i.test(navigator.userAgent);
  })[0];

  // Apply existing highlights when component mounts or highlights change
  useEffect(() => {
    if (!contentRef.current) return;

    // Clear existing highlights first
    const existingHighlights = contentRef.current.querySelectorAll(
      "span[data-highlight]",
    );
    existingHighlights.forEach((el) => {
      const parent = el.parentNode;
      if (parent) {
        while (el.firstChild) {
          parent.insertBefore(el.firstChild, el);
        }
        parent.removeChild(el);
      }
    });

    // Apply saved highlights, plus the in-progress one so phones can show it
    // without restoring the native text selection (which opens Copy/Translate).
    const toApply = pendingHighlight
      ? [...highlights, pendingHighlight]
      : highlights;
    toApply.forEach((highlight) => {
      applyHighlightByOffset(highlight);
    });
  });

  // Re-apply the selection when the pending range changes. Skip this on
  // touch devices: restoring the range re-opens the OS selection menu and
  // covers the highlight form.
  useEffect(() => {
    if (!pendingHighlight || isMobile) {
      return;
    }
    if (!contentRef.current) {
      return;
    }
    const ranges = getRangeFromHighlight(pendingHighlight);
    if (!ranges) {
      return;
    }
    const newRange = document.createRange();
    newRange.setStart(ranges[0].node, ranges[0].start);
    newRange.setEnd(
      ranges[ranges.length - 1].node,
      ranges[ranges.length - 1].end,
    );
    window.getSelection()?.removeAllRanges();
    window.getSelection()?.addRange(newRange);
  }, [pendingHighlight, isMobile]);

  // While the highlight form is open on a phone, keep dismissing article
  // selections so iOS/Android cannot resurrect Copy / Translate / Find.
  useEffect(() => {
    if (!isMobile || menuPosition === null || !contentRef.current) {
      return;
    }

    const article = contentRef.current;
    article.style.setProperty("-webkit-user-select", "none");
    article.style.setProperty("user-select", "none");

    const dismissArticleSelection = () => {
      if (isSelectionInside(article)) {
        clearDomSelection();
      }
    };

    dismissArticleSelection();
    const timeout = window.setTimeout(dismissArticleSelection, 100);
    document.addEventListener("selectionchange", dismissArticleSelection);
    return () => {
      article.style.removeProperty("-webkit-user-select");
      article.style.removeProperty("user-select");
      window.clearTimeout(timeout);
      document.removeEventListener("selectionchange", dismissArticleSelection);
    };
  }, [isMobile, menuPosition]);

  const handlePointerUp = (e: React.PointerEvent) => {
    if (readOnly) {
      return;
    }

    const selection = window.getSelection();

    // Check if we clicked on an existing highlight
    const target = e.target as HTMLElement;
    if (target.dataset.highlight) {
      const highlightId = target.dataset.highlightId;
      if (highlightId && highlights) {
        const highlight = highlights.find((h) => h.id === highlightId);
        if (!highlight) {
          return;
        }
        setSelectedHighlight(highlight);
        setMenuPosition({
          x: e.clientX,
          y: e.clientY,
        });
        return;
      }
    }

    if (!selection || selection.isCollapsed || !contentRef.current) {
      return;
    }

    const range = selection.getRangeAt(0);

    // Only process selections within our component
    if (!contentRef.current.contains(range.commonAncestorContainer)) {
      return;
    }

    // Position the menu based on device type
    const rect = range.getBoundingClientRect();
    setMenuPosition({
      x: rect.left + rect.width / 2, // Center the menu horizontally
      y: isMobile ? rect.bottom : rect.top, // Position below on mobile, above otherwise
    });

    // Store the highlight for later use
    setPendingHighlight(createHighlightFromRange(range, "yellow"));

    if (isMobile) {
      clearDomSelection();
    }
  };

  const handleSave = (color: ZHighlightColor, note: string | null) => {
    if (pendingHighlight) {
      pendingHighlight.color = color;
      pendingHighlight.note = note;
      onHighlight?.(pendingHighlight);
    } else if (selectedHighlight) {
      selectedHighlight.color = color;
      selectedHighlight.note = note;
      onUpdateHighlight?.(selectedHighlight);
    }
    closeForm();
  };

  const closeForm = () => {
    setMenuPosition(null);
    setPendingHighlight(null);
    setSelectedHighlight(null);
    setAutoFocusNote(false);
    window.getSelection()?.removeAllRanges();
  };

  // Readwise-style quick actions: with text selected (form closed), "h"
  // saves a highlight immediately and "n" opens the form with note focused.
  useEffect(() => {
    if (readOnly || menuPosition !== null) {
      return;
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (
        tag === "textarea" ||
        tag === "input" ||
        tag === "select" ||
        target?.isContentEditable === true
      ) {
        return;
      }
      const key = e.key.toLowerCase();
      if (key !== "h" && key !== "n") {
        return;
      }
      const selection = window.getSelection();
      if (
        !selection ||
        selection.isCollapsed ||
        selection.rangeCount === 0 ||
        !contentRef.current
      ) {
        return;
      }
      let range: Range;
      try {
        range = selection.getRangeAt(0);
      } catch {
        return;
      }
      if (!contentRef.current.contains(range.commonAncestorContainer)) {
        return;
      }
      const rect = range.getBoundingClientRect();
      const highlight = createHighlightFromRange(range, "yellow", key === "n");
      if (!highlight) {
        return;
      }
      e.preventDefault();
      if (key === "h") {
        highlight.note = null;
        onHighlight?.(highlight);
        if (isMobile) {
          clearDomSelection();
        }
        setPendingHighlight(null);
        setSelectedHighlight(null);
        setAutoFocusNote(false);
      } else {
        setPendingHighlight(highlight);
        setSelectedHighlight(null);
        setAutoFocusNote(true);
        setMenuPosition({
          x: rect.left + rect.width / 2,
          y: isMobile ? rect.bottom : rect.top,
        });
        if (isMobile) {
          clearDomSelection();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [readOnly, menuPosition, isMobile, onHighlight]);

  const handleDelete = () => {
    if (selectedHighlight && onDeleteHighlight) {
      onDeleteHighlight(selectedHighlight);
      closeForm();
    }
  };

  const getTextNodeOffset = (node: Node): number => {
    let offset = 0;
    const walker = document.createTreeWalker(
      contentRef.current!,
      NodeFilter.SHOW_TEXT,
      null,
    );

    while (walker.nextNode()) {
      if (walker.currentNode === node) {
        return offset;
      }
      offset += walker.currentNode.textContent?.length ?? 0;
    }
    return -1;
  };

  const createHighlightFromRange = (
    range: Range,
    color: ZHighlightColor,
    applyDom = true,
  ): Highlight | null => {
    if (!contentRef.current) return null;

    const startOffset =
      getTextNodeOffset(range.startContainer) + range.startOffset;
    const endOffset = getTextNodeOffset(range.endContainer) + range.endOffset;

    if (startOffset === -1 || endOffset === -1) return null;

    const highlight: Highlight = {
      id: "NOT_SET",
      startOffset,
      endOffset,
      color,
      text: range.toString(),
    };

    if (applyDom) {
      applyHighlightByOffset(highlight);
    }
    return highlight;
  };

  const getRangeFromHighlight = (highlight: Highlight) => {
    if (!contentRef.current) return;

    let currentOffset = 0;
    const walker = document.createTreeWalker(
      contentRef.current,
      NodeFilter.SHOW_TEXT,
      null,
    );

    const ranges: { node: Text; start: number; end: number }[] = [];

    // Find all text nodes that need highlighting
    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const nodeLength = node.length;
      const nodeStart = currentOffset;
      const nodeEnd = nodeStart + nodeLength;

      if (nodeStart < highlight.endOffset && nodeEnd > highlight.startOffset) {
        ranges.push({
          node,
          start: Math.max(0, highlight.startOffset - nodeStart),
          end: Math.min(nodeLength, highlight.endOffset - nodeStart),
        });
      }

      currentOffset += nodeLength;
    }
    return ranges;
  };

  const applyHighlightByOffset = (highlight: Highlight) => {
    const ranges = getRangeFromHighlight(highlight);
    if (!ranges) {
      return;
    }
    // Apply highlights to found ranges
    ranges.forEach(({ node, start, end }) => {
      if (start > 0) {
        node.splitText(start);
        node = node.nextSibling as Text;
        end -= start;
      }
      if (end < node.length) {
        node.splitText(end);
      }

      const span = document.createElement("span");
      span.classList.add(HIGHLIGHT_COLOR_MAP.bg[highlight.color]);
      span.classList.add("text-gray-600");
      span.dataset.highlight = "true";
      span.dataset.highlightId = highlight.id;
      node.parentNode?.insertBefore(span, node);
      span.appendChild(node);
    });
  };

  return (
    <div>
      <div
        role="presentation"
        ref={contentRef}
        dangerouslySetInnerHTML={{ __html: htmlContent }}
        onPointerUp={handlePointerUp}
        onContextMenu={(e) => {
          if (isMobile && !readOnly) {
            e.preventDefault();
          }
        }}
        className={cn(
          "prose prose-neutral max-w-none break-words [-webkit-touch-callout:none] dark:prose-invert [&_code]:break-all [&_img]:h-auto [&_img]:max-w-full [&_pre]:overflow-x-auto [&_table]:block [&_table]:overflow-x-auto",
          className,
        )}
        style={style}
      />
      <HighlightForm
        position={menuPosition}
        selectedHighlight={selectedHighlight || pendingHighlight}
        onClose={closeForm}
        onSave={handleSave}
        onDelete={selectedHighlight ? handleDelete : undefined}
        isMobile={isMobile}
        autoFocusNote={autoFocusNote}
      />
    </div>
  );
});

export default BookmarkHTMLHighlighter;
