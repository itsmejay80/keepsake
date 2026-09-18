"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSidebarCollapse } from "@/components/shared/sidebar/SidebarCollapse";
import SidebarItem from "@/components/shared/sidebar/SidebarItem";
import { Button, ButtonWithTooltip } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTriggerChevron,
} from "@/components/ui/collapsible";
import { toast } from "@/components/ui/sonner";
import { BOOKMARK_DRAG_MIME } from "@/lib/bookmark-drag";
import { useTranslation } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import { ClipboardList, MoreHorizontal, Plus, Star, Users } from "lucide-react";

import type { ZBookmarkList } from "@karakeep/shared/types/lists";
import {
  augmentBookmarkListsWithInitialData,
  useAddBookmarkToList,
  useBookmarkLists,
} from "@karakeep/shared-react/hooks/lists";
import { ZBookmarkListTreeNode } from "@karakeep/shared/utils/listUtils";

import { CollapsibleBookmarkLists } from "../lists/CollapsibleBookmarkLists";
import { EditListModal } from "../lists/EditListModal";
import { ListOptions } from "../lists/ListOptions";
import { InvitationNotificationBadge } from "./InvitationNotificationBadge";

function useDropTarget(listId: string, listName: string) {
  const { mutateAsync: addToList } = useAddBookmarkToList();
  const [dropHighlight, setDropHighlight] = useState(false);
  const dragCounterRef = useRef(0);
  const { t } = useTranslation();

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(BOOKMARK_DRAG_MIME)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  }, []);

  const onDragEnter = useCallback((e: React.DragEvent) => {
    if (e.dataTransfer.types.includes(BOOKMARK_DRAG_MIME)) {
      e.preventDefault();
      dragCounterRef.current++;
      setDropHighlight(true);
    }
  }, []);

  const onDragLeave = useCallback(() => {
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setDropHighlight(false);
    }
  }, []);

  const onDrop = useCallback(
    async (e: React.DragEvent) => {
      dragCounterRef.current = 0;
      setDropHighlight(false);
      const bookmarkId = e.dataTransfer.getData(BOOKMARK_DRAG_MIME);
      if (!bookmarkId) return;
      e.preventDefault();
      try {
        await addToList({ bookmarkId, listId });
        toast({
          description: t("lists.add_to_list_success", {
            list: listName,
            defaultValue: `Added to "${listName}"`,
          }),
        });
      } catch {
        toast({
          description: t("common.something_went_wrong", {
            defaultValue: "Something went wrong",
          }),
          variant: "destructive",
        });
      }
    },
    [addToList, listId, listName, t],
  );

  return { dropHighlight, onDragOver, onDragEnter, onDragLeave, onDrop };
}

function DroppableListSidebarItem({
  node,
  level,
  open,
  numBookmarks,
  selectedListId,
  setSelectedListId,
}: {
  node: ZBookmarkListTreeNode;
  level: number;
  open: boolean;
  numBookmarks?: number;
  selectedListId: string | null;
  setSelectedListId: (id: string | null) => void;
}) {
  const canDrop =
    node.item.type === "manual" &&
    (node.item.userRole === "owner" || node.item.userRole === "editor");
  const { dropHighlight, onDragOver, onDragEnter, onDragLeave, onDrop } =
    useDropTarget(node.item.id, node.item.name);

  return (
    <SidebarItem
      collapseButton={
        node.children.length > 0 ? (
          <CollapsibleTriggerChevron className="size-4" open={open} />
        ) : (
          <span className="size-4" />
        )
      }
      logo={
        <span className="flex">
          <span className="text-lg"> {node.item.icon}</span>
        </span>
      }
      name={node.item.name}
      path={`/dashboard/lists/${node.item.id}`}
      className="group"
      right={
        <ListOptions
          onOpenChange={(isOpen) => {
            if (isOpen) {
              setSelectedListId(node.item.id);
            } else {
              setSelectedListId(null);
            }
          }}
          list={node.item}
        >
          <Button size="none" variant="ghost" className="relative">
            <MoreHorizontal
              className={cn(
                "absolute inset-0 m-auto size-4 opacity-0 transition-opacity duration-100 group-hover:opacity-100",
                selectedListId == node.item.id ? "opacity-100" : "opacity-0",
              )}
            />
            <span
              className={cn(
                "px-2.5 text-xs font-light text-muted-foreground opacity-100 transition-opacity duration-100 group-hover:opacity-0",
                selectedListId == node.item.id || numBookmarks === undefined
                  ? "opacity-0"
                  : "opacity-100",
              )}
            >
              {numBookmarks}
            </span>
          </Button>
        </ListOptions>
      }
      linkClassName="py-0.5 px-1"
      style={{ marginLeft: `${level * 1}rem` }}
      dropHighlight={canDrop && dropHighlight}
      onDragOver={canDrop ? onDragOver : undefined}
      onDragEnter={canDrop ? onDragEnter : undefined}
      onDragLeave={canDrop ? onDragLeave : undefined}
      onDrop={canDrop ? onDrop : undefined}
    />
  );
}

export default function AllLists({
  initialData,
}: {
  initialData: { lists: ZBookmarkList[] };
}) {
  const { t } = useTranslation();
  const pathName = usePathname();
  const isNodeOpen = useCallback(
    (node: ZBookmarkListTreeNode) => pathName.includes(node.item.id),
    [pathName],
  );

  const [selectedListId, setSelectedListId] = useState<string | null>(null);

  // Fetch live lists data
  const { data: listsData } = useBookmarkLists(undefined, {
    initialData: { lists: initialData.lists },
  });
  const lists = augmentBookmarkListsWithInitialData(
    listsData,
    initialData.lists,
  );

  // Check if any shared list is currently being viewed
  const isViewingSharedList = useMemo(() => {
    return lists.data.some(
      (list) => list.userRole !== "owner" && pathName.includes(list.id),
    );
  }, [lists.data, pathName]);

  // Check if there are any shared lists
  const hasSharedLists = useMemo(() => {
    return lists.data.some((list) => list.userRole !== "owner");
  }, [lists.data]);

  const [sharedListsOpen, setSharedListsOpen] = useState(isViewingSharedList);
  const { collapsed } = useSidebarCollapse();

  // Auto-open shared lists if viewing one
  useEffect(() => {
    if (isViewingSharedList && !sharedListsOpen) {
      setSharedListsOpen(true);
    }
  }, [isViewingSharedList, sharedListsOpen]);

  const createListLabel = t("lists.create_list", {
    defaultValue: "Create list",
  });

  return (
    <ul className="sidebar-scrollbar max-h-full min-h-0 flex-1 gap-y-2 overflow-auto text-sm">
      <li className="flex overflow-hidden">
        <EditListModal>
          <ButtonWithTooltip
            type="button"
            tooltip={createListLabel}
            variant="ghost"
            size="none"
            className="flex min-h-10 w-full min-w-0 items-center justify-start gap-x-2.5 rounded-xl px-2.5 py-1.5 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          >
            <Plus className="size-[18px] shrink-0" strokeWidth={1.5} />
            <span
              className={cn(
                "sidebar-fade min-w-0 truncate whitespace-nowrap text-xs font-semibold",
                collapsed ? "pointer-events-none w-0 opacity-0" : "opacity-100",
              )}
            >
              Lists
            </span>
          </ButtonWithTooltip>
        </EditListModal>
      </li>
      <SidebarItem
        logo={<ClipboardList className="size-[18px]" strokeWidth={1.5} />}
        name={t("lists.all_lists")}
        path={`/dashboard/lists`}
        right={<InvitationNotificationBadge />}
      />
      <SidebarItem
        logo={<Star className="size-[18px]" strokeWidth={1.5} />}
        name={t("lists.favourites")}
        path={`/dashboard/favourites`}
      />

      <div
        className={cn(
          "sidebar-fold grid",
          collapsed
            ? "pointer-events-none grid-rows-[0fr] opacity-0"
            : "grid-rows-[1fr] opacity-100",
        )}
      >
        <div className="overflow-hidden" aria-hidden={collapsed}>
          {/* Owned Lists */}
          <CollapsibleBookmarkLists
            listsData={lists}
            filter={(node) => node.item.userRole === "owner"}
            isOpenFunc={isNodeOpen}
            render={({ node, level, open, numBookmarks }) => (
              <DroppableListSidebarItem
                node={node}
                level={level}
                open={open}
                numBookmarks={numBookmarks}
                selectedListId={selectedListId}
                setSelectedListId={setSelectedListId}
              />
            )}
          />

          {/* Shared Lists */}
          {hasSharedLists && (
            <Collapsible
              open={sharedListsOpen}
              onOpenChange={setSharedListsOpen}
            >
              <SidebarItem
                collapseButton={
                  <CollapsibleTriggerChevron
                    className="size-4"
                    open={sharedListsOpen}
                  />
                }
                logo={<Users className="size-[18px]" strokeWidth={1.5} />}
                name={t("lists.shared_lists")}
                path="#"
                linkClassName="py-0.5 px-1"
              />
              <CollapsibleContent>
                <CollapsibleBookmarkLists
                  listsData={lists}
                  filter={(node) => node.item.userRole !== "owner"}
                  isOpenFunc={isNodeOpen}
                  indentOffset={1}
                  render={({ node, level, open, numBookmarks }) => (
                    <DroppableListSidebarItem
                      node={node}
                      level={level}
                      open={open}
                      numBookmarks={numBookmarks}
                      selectedListId={selectedListId}
                      setSelectedListId={setSelectedListId}
                    />
                  )}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
        </div>
      </div>
    </ul>
  );
}
