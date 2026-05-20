import type { Metadata } from "next";
import { FilesClient } from "./files-client";

export const metadata: Metadata = { title: "Files · Life OS" };

export default function FilesPage() {
  return <FilesClient />;
}
