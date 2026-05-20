/**
 * Map a file extension or MIME type to a visual category. Used by the Files
 * page and the file detail card to pick an icon + tint without enumerating
 * every possible MIME type at the callsite.
 */
import {
  FileText,
  FileType,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  FileImage,
  FileAudio,
  FileVideo,
  File as FileIcon,
} from "lucide-react";

export type FileCategory =
  | "pdf"
  | "word"
  | "spreadsheet"
  | "presentation"
  | "text"
  | "markdown"
  | "code"
  | "archive"
  | "image"
  | "audio"
  | "video"
  | "other";

export type FileMeta = {
  category: FileCategory;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  tint: string;
};

const EXT_TO_CATEGORY: Record<string, FileCategory> = {
  pdf: "pdf",
  doc: "word",
  docx: "word",
  odt: "word",
  rtf: "word",
  xls: "spreadsheet",
  xlsx: "spreadsheet",
  csv: "spreadsheet",
  ods: "spreadsheet",
  ppt: "presentation",
  pptx: "presentation",
  odp: "presentation",
  txt: "text",
  log: "text",
  md: "markdown",
  markdown: "markdown",
  json: "code",
  js: "code",
  ts: "code",
  tsx: "code",
  jsx: "code",
  py: "code",
  rb: "code",
  go: "code",
  rs: "code",
  java: "code",
  c: "code",
  cpp: "code",
  h: "code",
  html: "code",
  css: "code",
  yaml: "code",
  yml: "code",
  toml: "code",
  zip: "archive",
  rar: "archive",
  "7z": "archive",
  tar: "archive",
  gz: "archive",
  jpg: "image",
  jpeg: "image",
  png: "image",
  gif: "image",
  webp: "image",
  svg: "image",
  heic: "image",
  mp3: "audio",
  wav: "audio",
  m4a: "audio",
  ogg: "audio",
  flac: "audio",
  mp4: "video",
  mov: "video",
  webm: "video",
  mkv: "video",
  avi: "video",
};

const CATEGORY_META: Record<FileCategory, Omit<FileMeta, "category">> = {
  pdf: { label: "PDF", icon: FileType, tint: "#ef8b8b" },
  word: { label: "Word", icon: FileText, tint: "#6aa9ef" },
  spreadsheet: { label: "Sheet", icon: FileSpreadsheet, tint: "#6dc8a1" },
  presentation: { label: "Slides", icon: FileType, tint: "#f0a868" },
  text: { label: "Text", icon: FileText, tint: "#c8c6c0" },
  markdown: { label: "Markdown", icon: FileText, tint: "#d4a866" },
  code: { label: "Code", icon: FileCode, tint: "#b58dee" },
  archive: { label: "Archive", icon: FileArchive, tint: "#c79bff" },
  image: { label: "Image", icon: FileImage, tint: "#6dc8d8" },
  audio: { label: "Audio", icon: FileAudio, tint: "#e57f9f" },
  video: { label: "Video", icon: FileVideo, tint: "#f1c27d" },
  other: { label: "File", icon: FileIcon, tint: "var(--kind-file)" },
};

export function fileMetaFromName(name: string | null | undefined): FileMeta {
  if (!name) return { category: "other", ...CATEGORY_META.other };
  const dot = name.lastIndexOf(".");
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : "";
  const category = EXT_TO_CATEGORY[ext] ?? "other";
  return { category, ...CATEGORY_META[category] };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}
