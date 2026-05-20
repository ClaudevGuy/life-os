/**
 * Tiny zero-dep markdown renderer for body text.
 * Handles: # / ## / ### headings, **bold**, *italic*, `code`, > quote,
 * - / 1. lists, [link](url), and [[wiki links]] that route to /items/<id|title>.
 */
import React from "react";
import Link from "next/link";

function inline(s: string): React.ReactNode[] {
  const tokens: React.ReactNode[] = [];
  const regex =
    /(\[\[[^\]]+\]\]|\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = regex.exec(s))) {
    if (match.index > lastIndex) tokens.push(s.slice(lastIndex, match.index));
    const tok = match[0];
    if (tok.startsWith("[[")) {
      const target = tok.slice(2, -2).trim();
      tokens.push(
        <Link
          key={key++}
          href={`/links/${encodeURIComponent(target)}`}
          className="rounded px-1 -mx-0.5 bg-[var(--accent-glow)] text-[var(--accent)] hover:bg-[var(--accent-soft)] transition no-underline"
        >
          {target}
        </Link>,
      );
    } else if (tok.startsWith("**")) {
      tokens.push(
        <strong key={key++} className="text-[var(--text)]">
          {tok.slice(2, -2)}
        </strong>,
      );
    } else if (tok.startsWith("`")) {
      tokens.push(
        <code
          key={key++}
          className="font-mono text-[12px] bg-[var(--bg-rail)] border border-[var(--border-soft)] rounded px-1 py-0.5 text-[var(--accent)]"
        >
          {tok.slice(1, -1)}
        </code>,
      );
    } else if (tok.startsWith("[")) {
      const m = /^\[([^\]]+)\]\(([^)]+)\)$/.exec(tok);
      if (m) {
        tokens.push(
          <a
            key={key++}
            href={m[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[var(--accent)] decoration-1 underline-offset-2 text-[var(--text)] hover:text-[var(--accent)]"
          >
            {m[1]}
          </a>,
        );
      }
    } else if (tok.startsWith("*")) {
      tokens.push(
        <em key={key++} className="italic">
          {tok.slice(1, -1)}
        </em>,
      );
    }
    lastIndex = match.index + tok.length;
  }
  if (lastIndex < s.length) tokens.push(s.slice(lastIndex));
  return tokens;
}

export function Markdown({ children }: { children: string }) {
  const lines = children.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={key++} className="text-base font-semibold mt-6 mb-2 text-[var(--text)]">
          {inline(line.slice(4))}
        </h3>,
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={key++} className="text-lg font-semibold mt-7 mb-2 text-[var(--text)]">
          {inline(line.slice(3))}
        </h2>,
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={key++} className="text-xl font-semibold mt-8 mb-3 tracking-tight text-[var(--text)]">
          {inline(line.slice(2))}
        </h1>,
      );
      i++;
      continue;
    }
    // Pipe table: header row | --- | data rows...
    if (/^\s*\|.+\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s\-:|]+\|\s*$/.test(lines[i + 1])) {
      const headers = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((s) => s.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && /^\s*\|.+\|\s*$/.test(lines[i])) {
        rows.push(
          lines[i]
            .trim()
            .slice(1, -1)
            .split("|")
            .map((s) => s.trim()),
        );
        i++;
      }
      blocks.push(
        <table key={key++} className="life-md-table">
          <thead>
            <tr>
              {headers.map((h, j) => (
                <th key={j}>{inline(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, j) => (
              <tr key={j}>
                {row.map((c, k) => (
                  <td key={k}>{inline(c)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>,
      );
      continue;
    }
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i].startsWith("> ")) {
        buf.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <blockquote
          key={key++}
          className="border-l-2 border-[var(--accent)] pl-4 my-4 italic text-[var(--text-muted)]"
        >
          {buf.map((b, j) => (
            <div key={j}>{inline(b)}</div>
          ))}
        </blockquote>,
      );
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol key={key++} className="list-decimal pl-5 space-y-1 my-3 text-[var(--text-muted)]">
          {items.map((it, j) => (
            <li key={j} className="pl-1">
              {inline(it)}
            </li>
          ))}
        </ol>,
      );
      continue;
    }
    if (/^[-*]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        items.push(lines[i].slice(2));
        i++;
      }
      blocks.push(
        <ul key={key++} className="space-y-1 my-3">
          {items.map((it, j) => (
            <li key={j} className="text-[var(--text-muted)] pl-4 relative">
              <span className="absolute left-0 top-2.5 w-1 h-1 rounded-full bg-[var(--accent)]" />
              {inline(it)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }
    const para: string[] = [line];
    i++;
    while (i < lines.length && lines[i].trim() && !/^[#>-]|^\d+\.\s/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="my-3 text-[var(--text-muted)] leading-relaxed">
        {para.flatMap((l, j) =>
          j === 0
            ? inline(l)
            : [<br key={`br-${j}`} />, ...inline(l)],
        )}
      </p>,
    );
  }

  return <div className="text-[14px]">{blocks}</div>;
}
