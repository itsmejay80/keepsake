import { useTranslation } from "@/lib/i18n/server";
import { TFunction } from "i18next";

import SidebarFrame from "./SidebarFrame";
import SidebarItem from "./SidebarItem";
import { TSidebarItem } from "./TSidebarItem";

export default async function Sidebar({
  items,
  extraSections,
}: {
  items: (t: TFunction) => TSidebarItem[];
  extraSections?: React.ReactNode;
}) {
  // oxlint-disable-next-line rules-of-hooks
  const { t } = await useTranslation();

  return (
    <SidebarFrame>
      <div>
        <ul className="space-y-1 text-sm">
          {items(t).map((item) => (
            <SidebarItem
              key={item.name}
              logo={item.icon}
              name={item.name}
              path={item.path}
            />
          ))}
        </ul>
      </div>
      {extraSections ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          {extraSections}
        </div>
      ) : null}
    </SidebarFrame>
  );
}
