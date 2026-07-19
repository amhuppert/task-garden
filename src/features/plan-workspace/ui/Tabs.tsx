import * as RadixTabs from "@radix-ui/react-tabs";
import type { ReactNode, Ref } from "react";

/**
 * Tabbed interface primitive implementing the APG Tabs pattern: a labelled
 * tablist whose tabs carry roving tabindex, arrow-key/Home/End navigation,
 * `aria-selected`, and id linkage to their tabpanels. Fully controlled —
 * both call sites drive the active tab from store state. Tab chrome beyond
 * the shared inactive/active text treatment is supplied per site via
 * `listClassName` descendant selectors keyed on `data-state`.
 */
type TabsProps = {
  value: string;
  onValueChange: (value: string) => void;
  tabs: { value: string; label: ReactNode }[];
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  listClassName?: string;
};

export function Tabs({
  value,
  onValueChange,
  tabs,
  ariaLabel,
  children,
  className,
  listClassName,
}: TabsProps) {
  return (
    <RadixTabs.Root
      value={value}
      onValueChange={onValueChange}
      className={className}
    >
      <RadixTabs.List aria-label={ariaLabel} className={listClassName}>
        {tabs.map((tab) => (
          <RadixTabs.Trigger
            key={tab.value}
            value={tab.value}
            className="flex-1 text-muted-foreground transition-colors hover:text-foreground data-[state=active]:text-foreground"
          >
            {tab.label}
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
      {children}
    </RadixTabs.Root>
  );
}

/**
 * The tabpanel half of the Tabs primitive. The panel element stays mounted
 * (hidden while inactive, so each tab's aria-controls reference stays valid);
 * only its children unmount when the tab is inactive. Focusable so keyboard
 * users can move from the tablist into the panel content. `scrollRef`
 * exposes the panel element for caller-side scroll management
 * (PlanWorkspacePage's scroll-reset on tab switch) — because every panel
 * element mounts, each panel needs its own ref.
 */
type TabPanelProps = {
  value: string;
  children: ReactNode;
  className?: string;
  scrollRef?: Ref<HTMLDivElement>;
};

export function TabPanel({
  value,
  children,
  className,
  scrollRef,
}: TabPanelProps) {
  return (
    <RadixTabs.Content ref={scrollRef} value={value} className={className}>
      {children}
    </RadixTabs.Content>
  );
}
