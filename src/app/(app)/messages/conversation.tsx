"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  Send,
  RefreshCw,
  CheckSquare,
  StickyNote,
  MessagesSquare,
} from "lucide-react";
import { CHANNEL_LABEL, type MsgThread } from "@/lib/messaging/types";
import {
  useMsgMessages,
  sendMessage,
  refreshThread,
  messageToTask,
  messageToNote,
} from "@/lib/store/messaging";

export function Conversation({
  thread,
  onBack,
}: {
  thread: MsgThread | null;
  onBack: () => void;
}) {
  const messages = useMsgMessages(thread?.id ?? null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  if (!thread) {
    return (
      <div className="hidden sm:flex flex-1 flex-col items-center justify-center gap-3 text-center px-6">
        <div
          className="grid place-items-center w-14 h-14 rounded-full"
          style={{
            background: "color-mix(in oklch, var(--terra) 12%, transparent)",
            color: "var(--terra)",
          }}
        >
          <MessagesSquare size={24} strokeWidth={1.6} />
        </div>
        <div className="text-[14px] font-medium text-[var(--ink)]">
          Select a conversation
        </div>
        <div className="text-[12.5px] text-[var(--muted)] max-w-[220px] leading-relaxed">
          Pick a thread on the left to read and reply.
        </div>
      </div>
    );
  }

  async function onSend() {
    const body = text.trim();
    if (!body || !thread) return;
    setSending(true);
    try {
      await sendMessage(thread.id, body);
      setText("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      toast.error(
        msg === "not_connected"
          ? `${CHANNEL_LABEL[thread.channel]} isn't connected yet`
          : "Couldn't send",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--line)]">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="sm:hidden grid place-items-center w-8 h-8 rounded-md text-[var(--muted)] hover:bg-[var(--paper-2)] transition"
        >
          <ArrowLeft size={16} />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-semibold text-[var(--ink)] truncate">
            {thread.title}
          </div>
          <div className="text-[11px] text-[var(--muted)]">
            {CHANNEL_LABEL[thread.channel]}
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refreshThread(thread.id)}
          aria-label="Refresh"
          title="Refresh"
          className="grid place-items-center w-8 h-8 rounded-md text-[var(--muted)] hover:bg-[var(--paper-2)] transition"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-2">
        {messages === undefined ? null : messages.length === 0 ? (
          <p className="text-center text-[12px] text-[var(--muted)] mt-8">
            No messages loaded yet.
          </p>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={`group flex ${m.fromMe ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`relative max-w-[78%] rounded-[14px] px-3 py-2 text-[13.5px] leading-snug ${
                  m.fromMe
                    ? "bg-[var(--terra)] text-white"
                    : "bg-[var(--paper-2)] text-[var(--ink)]"
                }`}
              >
                {!m.fromMe && (
                  <div className="text-[10.5px] font-semibold text-[var(--muted)] mb-0.5">
                    {m.author}
                  </div>
                )}
                <div className="whitespace-pre-wrap break-words">{m.body}</div>
                <div
                  className={`text-[9.5px] mt-1 ${
                    m.fromMe ? "text-white/70" : "text-[var(--muted-2)]"
                  }`}
                >
                  {new Date(m.ts).toLocaleTimeString(undefined, {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </div>

                {/* Capture actions */}
                <div className="absolute -top-2.5 right-1 opacity-0 group-hover:opacity-100 transition flex gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      void messageToTask(m, thread);
                      toast.success("Added to tasks");
                    }}
                    title="Make a task"
                    aria-label="Make a task"
                    className="grid place-items-center w-6 h-6 rounded-md border border-[var(--line-2)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--terra)] transition"
                  >
                    <CheckSquare size={12} />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void messageToNote(m, thread);
                      toast.success("Saved as note");
                    }}
                    title="Save as note"
                    aria-label="Save as note"
                    className="grid place-items-center w-6 h-6 rounded-md border border-[var(--line-2)] bg-[var(--paper)] text-[var(--muted)] hover:text-[var(--terra)] transition"
                  >
                    <StickyNote size={12} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer */}
      <div className="border-t border-[var(--line)] p-3 flex items-end gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void onSend();
            }
          }}
          rows={1}
          placeholder={`Reply on ${CHANNEL_LABEL[thread.channel]}…`}
          className="flex-1 resize-none max-h-32 rounded-[12px] bg-[var(--paper-2)] border border-[var(--line)] px-3 py-2 text-[13.5px] text-[var(--ink)] placeholder:text-[var(--muted-2)] focus:outline-none focus:border-[var(--terra)] transition"
        />
        <button
          type="button"
          onClick={() => void onSend()}
          disabled={sending || !text.trim()}
          className="life-btn life-btn-primary life-btn-sm shrink-0"
        >
          <Send size={14} />
          Send
        </button>
      </div>
    </>
  );
}
