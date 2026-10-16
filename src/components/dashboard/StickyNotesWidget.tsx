"use client";

import React, { useState, useEffect } from "react";
import {
  StickyNote,
  Plus,
  Trash2,
  Calendar,
  CheckCircle2,
  Circle,
  Pin,
  Lock,
  Sparkles,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface StickyNoteItem {
  id: string;
  content: string;
  isTomorrow: boolean;
  isDone: boolean;
  isPinned: boolean;
  color: "yellow" | "green" | "pink" | "blue" | "purple" | "orange";
  createdAt: string;
}

const COLOR_STYLES = {
  yellow: {
    bg: "bg-[#FEF9C3] dark:bg-[#713F12]/30",
    border: "border-[#FDE047] dark:border-[#A16207]",
    text: "text-slate-900 dark:text-amber-100",
    accent: "bg-[#FACC15] text-amber-950",
    badge: "bg-amber-200/80 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200",
  },
  green: {
    bg: "bg-[#DCFCE7] dark:bg-[#14532D]/30",
    border: "border-[#86EFAC] dark:border-[#15803D]",
    text: "text-slate-900 dark:text-emerald-100",
    accent: "bg-[#4ADE80] text-emerald-950",
    badge: "bg-emerald-200/80 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-200",
  },
  pink: {
    bg: "bg-[#FCE7F3] dark:bg-[#831843]/30",
    border: "border-[#F472B6] dark:border-[#9D174D]",
    text: "text-slate-900 dark:text-pink-100",
    accent: "bg-[#EC4899] text-white",
    badge: "bg-pink-200/80 text-pink-900 dark:bg-pink-900/60 dark:text-pink-200",
  },
  blue: {
    bg: "bg-[#E0F2FE] dark:bg-[#0C4A6E]/30",
    border: "border-[#7DD3FC] dark:border-[#0369A1]",
    text: "text-slate-900 dark:text-sky-100",
    accent: "bg-[#38BDF8] text-sky-950",
    badge: "bg-sky-200/80 text-sky-900 dark:bg-sky-900/60 dark:text-sky-200",
  },
  purple: {
    bg: "bg-[#F3E8FF] dark:bg-[#581C87]/30",
    border: "border-[#D8B4FE] dark:border-[#7E22CE]",
    text: "text-slate-900 dark:text-purple-100",
    accent: "bg-[#C084FC] text-purple-950",
    badge: "bg-purple-200/80 text-purple-900 dark:bg-purple-900/60 dark:text-purple-200",
  },
  orange: {
    bg: "bg-[#FFEDD5] dark:bg-[#7C2D12]/30",
    border: "border-[#FDBA74] dark:border-[#C2410C]",
    text: "text-slate-900 dark:text-orange-100",
    accent: "bg-[#FB923C] text-orange-950",
    badge: "bg-orange-200/80 text-orange-900 dark:bg-orange-900/60 dark:text-orange-200",
  },
};

interface StickyNotesWidgetProps {
  currentMemberId: string;
  currentUserName: string;
}

export const StickyNotesWidget: React.FC<StickyNotesWidgetProps> = ({
  currentMemberId,
  currentUserName,
}) => {
  const storageKey = `taskora_sticky_notes_${currentMemberId || "guest"}`;

  const [notes, setNotes] = useState<StickyNoteItem[]>([]);
  const [newContent, setNewContent] = useState("");
  const [isTomorrow, setIsTomorrow] = useState(false);
  const [selectedColor, setSelectedColor] = useState<StickyNoteItem["color"]>("yellow");
  const [filter, setFilter] = useState<"all" | "tomorrow" | "active" | "done">("all");
  const [isExpanded, setIsExpanded] = useState(true);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setNotes(JSON.parse(saved));
      } else {
        // Initial welcome notes for demo
        const defaultNotes: StickyNoteItem[] = [
          {
            id: "note-1",
            content: "Review morning push requests & check client WhatsApp brief.",
            isTomorrow: false,
            isDone: false,
            isPinned: true,
            color: "yellow",
            createdAt: new Date().toISOString(),
          },
          {
            id: "note-2",
            content: "Tomorrow: Prepare reel caption draft for Mayank Parmar review.",
            isTomorrow: true,
            isDone: false,
            isPinned: false,
            color: "pink",
            createdAt: new Date().toISOString(),
          },
        ];
        setNotes(defaultNotes);
        localStorage.setItem(storageKey, JSON.stringify(defaultNotes));
      }
    } catch (e) {
      console.error("Failed to load sticky notes:", e);
    }
  }, [storageKey]);

  // Save to localStorage whenever notes change
  const saveNotes = (updated: StickyNoteItem[]) => {
    setNotes(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to save sticky notes:", e);
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    const newNote: StickyNoteItem = {
      id: `sticky-${Date.now()}`,
      content: newContent.trim(),
      isTomorrow,
      isDone: false,
      isPinned: false,
      color: selectedColor,
      createdAt: new Date().toISOString(),
    };

    const updated = [newNote, ...notes];
    saveNotes(updated);
    setNewContent("");
    setIsTomorrow(false);
  };

  const handleToggleDone = (id: string) => {
    const updated = notes.map((n) =>
      n.id === id ? { ...n, isDone: !n.isDone } : n
    );
    saveNotes(updated);
  };

  const handleTogglePin = (id: string) => {
    const updated = notes.map((n) =>
      n.id === id ? { ...n, isPinned: !n.isPinned } : n
    );
    saveNotes(updated);
  };

  const handleDelete = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    saveNotes(updated);
  };

  const filteredNotes = notes
    .filter((n) => {
      if (filter === "tomorrow") return n.isTomorrow;
      if (filter === "active") return !n.isDone;
      if (filter === "done") return n.isDone;
      return true;
    })
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const tomorrowCount = notes.filter((n) => n.isTomorrow && !n.isDone).length;

  return (
    <div className="rounded-2xl border border-amber-200/80 dark:border-amber-900/60 bg-gradient-to-br from-amber-50/50 via-surface to-yellow-50/30 dark:from-amber-950/20 dark:via-surface dark:to-yellow-950/10 p-5 shadow-xs transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-200/60 dark:border-amber-900/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-400 text-amber-950 flex items-center justify-center font-bold shadow-2xs">
            <StickyNote className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Personal Sticky Notes & Tomorrow Tasks
              </h3>
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Lock className="w-2.5 h-2.5" />
                Only visible to you ({currentUserName.split(" ")[0] || "You"})
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Quick scratchpad for tomorrow&apos;s personal reminders and private notes.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter pills */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-0.5 rounded-lg border border-slate-200/70 dark:border-slate-700/70">
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={cn(
                "px-2.5 py-1 text-2xs font-semibold rounded-md transition-all cursor-pointer",
                filter === "all"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              All ({notes.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter("tomorrow")}
              className={cn(
                "px-2.5 py-1 text-2xs font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1",
                filter === "tomorrow"
                  ? "bg-amber-400 text-amber-950 font-bold shadow-2xs"
                  : "text-amber-700 dark:text-amber-400 hover:bg-amber-100/60 dark:hover:bg-amber-950/40"
              )}
            >
              <Calendar className="w-3 h-3" />
              Tomorrow {tomorrowCount > 0 && `(${tomorrowCount})`}
            </button>
            <button
              type="button"
              onClick={() => setFilter("active")}
              className={cn(
                "px-2.5 py-1 text-2xs font-semibold rounded-md transition-all cursor-pointer",
                filter === "active"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                  : "text-slate-500 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              Active
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title={isExpanded ? "Collapse notes" : "Expand notes"}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main expanded content */}
      {isExpanded && (
        <div className="pt-4 space-y-4">
          {/* Quick Add Sticky Note Bar */}
          <form
            onSubmit={handleAddNote}
            className="p-3 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-amber-200/70 dark:border-amber-900/50 shadow-2xs space-y-2.5"
          >
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="✍️ Write a quick personal reminder or tomorrow's task..."
                className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-surface text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
              />

              <div className="flex items-center gap-2 shrink-0">
                {/* For Tomorrow toggle */}
                <button
                  type="button"
                  onClick={() => setIsTomorrow((prev) => !prev)}
                  className={cn(
                    "h-8 px-2.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-all cursor-pointer",
                    isTomorrow
                      ? "bg-amber-400 border-amber-500 text-amber-950 shadow-2xs"
                      : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100"
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>For Tomorrow</span>
                </button>

                {/* Color Pickers */}
                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                  {(["yellow", "green", "pink", "blue", "purple", "orange"] as const).map(
                    (c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setSelectedColor(c)}
                        className={cn(
                          "w-4 h-4 rounded-full transition-transform cursor-pointer",
                          c === "yellow" && "bg-yellow-400",
                          c === "green" && "bg-emerald-400",
                          c === "pink" && "bg-pink-400",
                          c === "blue" && "bg-sky-400",
                          c === "purple" && "bg-purple-400",
                          c === "orange" && "bg-orange-400",
                          selectedColor === c && "ring-2 ring-slate-900 dark:ring-white scale-110"
                        )}
                        title={`Select ${c} sticky note`}
                      />
                    )
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!newContent.trim()}
                  className="h-8 px-3 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-2xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              </div>
            </div>
          </form>

          {/* Sticky Notes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredNotes.length === 0 ? (
              <div className="col-span-full py-8 text-center text-slate-400">
                <StickyNote className="w-8 h-8 mx-auto mb-2 opacity-40 text-amber-500" />
                <p className="text-xs font-semibold">No sticky notes found.</p>
                <p className="text-2xs text-slate-400 mt-0.5">
                  Type above to jot down a private task or tomorrow reminder!
                </p>
              </div>
            ) : (
              filteredNotes.map((note) => {
                const style = COLOR_STYLES[note.color] || COLOR_STYLES.yellow;
                return (
                  <div
                    key={note.id}
                    className={cn(
                      "group relative rounded-xl border p-3.5 flex flex-col justify-between transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md",
                      style.bg,
                      style.border,
                      style.text,
                      note.isDone && "opacity-60 saturate-50"
                    )}
                  >
                    {/* Top action row */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        {note.isTomorrow && (
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded-md text-[10px] font-bold flex items-center gap-1 shrink-0",
                              style.badge
                            )}
                          >
                            <Calendar className="w-2.5 h-2.5" />
                            Tomorrow
                          </span>
                        )}
                        {note.isPinned && (
                          <Pin className="w-3 h-3 text-amber-700 dark:text-amber-400 fill-amber-700 dark:fill-amber-400 shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => handleTogglePin(note.id)}
                          className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                          title={note.isPinned ? "Unpin note" : "Pin note"}
                        >
                          <Pin
                            className={cn(
                              "w-3 h-3",
                              note.isPinned && "fill-current text-amber-700 dark:text-amber-400"
                            )}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(note.id)}
                          className="p-1 rounded hover:bg-rose-500/20 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                          title="Delete note"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 my-1">
                      <p
                        className={cn(
                          "text-xs font-medium leading-relaxed select-text",
                          note.isDone && "line-through opacity-75"
                        )}
                      >
                        {note.content}
                      </p>
                    </div>

                    {/* Footer completion checkbox */}
                    <div className="mt-2.5 pt-2 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-2xs">
                      <button
                        type="button"
                        onClick={() => handleToggleDone(note.id)}
                        className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white cursor-pointer transition-colors"
                      >
                        {note.isDone ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-slate-400" />
                        )}
                        <span>{note.isDone ? "Done" : "Mark done"}</span>
                      </button>

                      <span className="text-[10px] text-slate-400 opacity-70">
                        {new Date(note.createdAt).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
