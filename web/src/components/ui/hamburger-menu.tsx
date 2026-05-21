import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type HamburgerMenuProps = {
  children: React.ReactNode;
  contentClassName?: string;
  triggerClassName?: string;
  iconClassName?: string;
  align?: "start" | "center" | "end";
  sideOffset?: number;
  ariaLabel?: string;
};

export function HamburgerMenu({
  children,
  contentClassName,
  triggerClassName,
  iconClassName,
  align = "end",
  sideOffset = 4,
  ariaLabel = "Open menu",
}: HamburgerMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className={cn("shrink-0", triggerClassName)}
          aria-label={ariaLabel}
        >
          <MoreHorizontal className={cn("h-4 w-4", iconClassName)} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={align}
        sideOffset={sideOffset}
        className={contentClassName}
      >
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
