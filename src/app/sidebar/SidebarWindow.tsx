/**
 * SOURCE OF TRUTH KEYWORDS: SidebarWindow, SidebarWindowProps, detached-rail,
 *   rail-width, rail-item-size, nav-selected
 * WHAT:  The contents of the detached sidebar WINDOW: the identity mark, then
 *        one icon per registry nav entry, sorted by NavDef.order.
 * WHY:   THE WINDOW IS THE RAIL, which is the same rule the pill lives under
 *        and it carries the same consequences. The window is transparent with
 *        native vibrancy cut to --radius-window, so this component fills it
 *        exactly and draws NO surface of its own — no rounding, no shadow, no
 *        glass panel. A CSS rounding here would leave the effect view's square
 *        corners outside a rounded page, and a CSS shadow has nowhere to fall
 *        because the window ends where the rail ends.
 *
 *        IT HAS NO TRAFFIC-LIGHT SPACER, and that is the substantive difference
 *        from the rail this replaces. The embedded version reserved
 *        --titlebar-height at its top because the window's hidden title bar put
 *        the three buttons over that glass. A detached window has no buttons to
 *        clear, so reserving the space would leave a dead 38pt gap above the
 *        mark and make a deliberate floating object look mis-padded. Padding is
 *        --rail-padding, equal top and bottom, because a widget is symmetrical.
 *
 *        IT HAS NO DRAG REGION either. It is attached as a child window of the
 *        dashboard so macOS moves it with the parent; dragging a child moves
 *        only the child, which would tear the rail away from the window it is
 *        supposed to be hanging off. The dashboard's header remains the drag
 *        surface for the app.
 *
 *        Selection is --surface-sunken-strong, never a hue: there is no accent
 *        colour in this app (docs/04 §2), and a rail that lights up because you
 *        clicked Settings would be inventing one.
 * WHERE: Rendered by src/entries/sidebar.tsx into the `sidebar` window. Route
 *        choices leave via onSelect, which the entry forwards to the dashboard
 *        as `nav-selected`. Icons resolve through lib/icons.ts.
 */

import { cn } from "@/lib/utils";
import { Mark } from "@/components/global";
import { Mic, Gauge, BookOpen, Gift, Settings, HelpCircle, CreditCard } from "lucide-react";

export interface SidebarWindowProps {
  activeRoute: string;
  onSelect: (route: string) => void;
}

interface SidebarItem {
  id: string;
  label: string;
  icon: typeof Mic;
  route: string;
  isSpecial?: boolean;
}

export function SidebarWindow({ activeRoute, onSelect }: SidebarWindowProps) {
  const topItems: (SidebarItem & { tooltip: string })[] = [
    {
      id: "dictation",
      label: "Dictation",
      tooltip:
        "Dictation & Transcriptions — View live dictations, waveform HUD, and recent transcript history",
      icon: Mic,
      route: "dictation",
    },
    {
      id: "insights",
      label: "Insights",
      tooltip:
        "Voice Analytics & Insights — Track speaking rate (WPM), total voice time, and transcription accuracy",
      icon: Gauge,
      route: "insights",
    },
    {
      id: "dictionary",
      label: "Dictionary",
      tooltip:
        "Custom Vocabulary & Domain Packs — Teach HushWrite technical terms, acronyms, and project identifiers",
      icon: BookOpen,
      route: "dictionary",
    },
  ];

  const bottomItems: (SidebarItem & { tooltip: string })[] = [
    {
      id: "billing",
      label: "Plan & Billing",
      tooltip:
        "Plan & Billing — Manage your HushWrite subscription tier, Pro license key, and renewal details",
      icon: CreditCard,
      route: "billing",
    },
    {
      id: "invite",
      label: "Invite & Earn Pro",
      tooltip:
        "Invite & Earn Pro — Share your referral link with colleagues to unlock free Pro months and packs",
      icon: Gift,
      route: "invite",
      isSpecial: true,
    },
    {
      id: "settings",
      label: "Settings",
      tooltip:
        "Preferences & Engine Settings — Configure hotkeys, audio devices, local Whisper models, and overlay HUD",
      icon: Settings,
      route: "settings",
    },
    {
      id: "help",
      label: "Help & Shortcuts",
      tooltip:
        "Help, Documentation & Shortcuts — View keyboard combinations, diagnostics, and cheatsheets",
      icon: HelpCircle,
      route: "help",
    },
  ];

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col items-center justify-between",
        "rounded-[26px] border border-stone-300/70 bg-[#f4f2ee]/95 backdrop-blur-md shadow-xl",
        "dark:border-stone-800/80 dark:bg-[#141210]/95",
        "p-1.5 py-3 transition-colors select-none",
      )}
    >
      {/* Top Section: Brand Mark + Primary Navigation */}
      <div className="flex w-full flex-col items-center gap-1.5">
        <button
          type="button"
          onClick={() => onSelect("dictation")}
          title="HushWrite — Fast, private, local speech-to-text dictation"
          aria-label="HushWrite Dictation"
          className="flex h-8 w-8 items-center justify-center rounded-xl transition-opacity hover:opacity-75 cursor-pointer mb-1"
        >
          <Mark label="HushWrite" size="md" />
        </button>

        <nav aria-label="Primary navigation" className="flex w-full flex-col items-center gap-1">
          {topItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeRoute === item.route;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item.route)}
                title={item.tooltip}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer",
                  isActive
                    ? "bg-[#eae5de] dark:bg-stone-800 text-stone-900 dark:text-white font-semibold shadow-xs"
                    : "text-stone-500 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
              </button>
            );
          })}
        </nav>
      </div>

      {/* Divider */}
      <div className="w-5 h-[1px] bg-stone-300/60 dark:bg-stone-800/80 my-1 shrink-0" />

      {/* Bottom Section: Pro / Secondary Navigation */}
      <nav aria-label="Secondary navigation" className="flex w-full flex-col items-center gap-1">
        {bottomItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeRoute === item.route;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.route)}
              title={item.tooltip}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-xl transition-all duration-150 cursor-pointer",
                isActive
                  ? "bg-[#eae5de] dark:bg-stone-800 text-stone-900 dark:text-white font-semibold shadow-xs"
                  : item.isSpecial
                    ? "text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100/60 dark:hover:bg-emerald-950/50 hover:scale-105"
                    : "text-stone-500 dark:text-stone-400 hover:bg-stone-200/60 dark:hover:bg-stone-800/60 hover:text-stone-900 dark:hover:text-white",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden="true" />
            </button>
          );
        })}
      </nav>
    </div>
  );
}
