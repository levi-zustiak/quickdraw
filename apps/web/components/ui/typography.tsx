import * as React from "react";

import { cn } from "@/lib/utils";

function H1({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="h1"
      className={cn(
        "font-sans text-[36px] font-semibold tracking-[-0.01em] leading-[1.05] text-qd-ink",
        className,
      )}
      {...props}
    />
  );
}

function H2({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      data-slot="h2"
      className={cn(
        "font-sans text-[22px] font-semibold tracking-[-0.005em] leading-[1.1] text-qd-ink",
        className,
      )}
      {...props}
    />
  );
}

function H3({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="h3"
      className={cn(
        "font-sans text-[16px] font-semibold tracking-[-0.005em] leading-[1.2] text-qd-ink",
        className,
      )}
      {...props}
    />
  );
}

function H4({ className, ...props }: React.ComponentProps<"h4">) {
  return (
    <h4
      data-slot="h4"
      className={cn(
        "font-sans text-[14px] font-semibold leading-[1.2] text-qd-ink",
        className,
      )}
      {...props}
    />
  );
}

function Display({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      data-slot="display"
      className={cn(
        "font-sans text-[64px] font-semibold tracking-[-0.02em] leading-none text-qd-ink",
        className,
      )}
      {...props}
    />
  );
}

function P({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="p"
      className={cn(
        "font-sans text-[14px] text-qd-ink-2 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

function Lead({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="lead"
      className={cn(
        "font-sans text-[16px] text-qd-ink-2 leading-relaxed",
        className,
      )}
      {...props}
    />
  );
}

function Small({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="small"
      className={cn(
        "font-sans text-[13px] text-qd-ink-2 leading-[1.55]",
        className,
      )}
      {...props}
    />
  );
}

function Detail({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="detail"
      className={cn(
        "font-mono text-[10px] tracking-[0.12em] uppercase text-qd-ink-3",
        className,
      )}
      {...props}
    />
  );
}

function Muted({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="muted"
      className={cn(
        "font-mono text-[11px] tracking-[0.04em] text-qd-ink-3 m-0",
        className,
      )}
      {...props}
    />
  );
}

export { Display, H1, H2, H3, H4, P, Lead, Small, Detail, Muted };
