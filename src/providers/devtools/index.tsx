"use client";

import dynamic from "next/dynamic";
import React from "react";

const DevtoolsRuntime = dynamic(() => import("./runtime"), {
  ssr: false,
});

export const DevtoolsProvider = (props: React.PropsWithChildren) => {
  if (process.env.NODE_ENV === "production") {
    return <>{props.children}</>;
  }

  return <DevtoolsRuntime>{props.children}</DevtoolsRuntime>;
};
