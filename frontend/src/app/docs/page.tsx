"use client";

import { useEffect, useState } from "react";
import { ApiDocsContent } from "@/components/ApiDocsContent";
import { isLoggedIn } from "@/lib/api";

export default function ApiDocsPage() {
  const [shell, setShell] = useState<"marketing" | "workspace">("marketing");

  useEffect(() => {
    setShell(isLoggedIn() ? "workspace" : "marketing");
  }, []);

  return <ApiDocsContent shell={shell} />;
}
