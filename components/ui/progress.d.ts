import * as React from "react";
import * as ProgressPrimitive from "@radix-ui/react-progress";

declare const Progress: React.ForwardRefExoticComponent<
  React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & 
  React.RefAttributes<React.ElementRef<typeof ProgressPrimitive.Root>>
>;

export { Progress };
