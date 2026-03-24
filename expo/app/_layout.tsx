import { AppProviders } from "@/src/providers/AppProviders";
import { Slot } from "expo-router";
import React from "react";

export default function Layout() {
  // const pathname = usePathname();

  return (
    <AppProviders>
      {/* <AnimatedLayout key={pathname}> */}
      <Slot />
      {/* </AnimatedLayout> */}
    </AppProviders>
  );
}
// test
// test2
