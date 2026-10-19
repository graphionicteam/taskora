"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  MessageSquare,
  Users,
  Bell,
  CheckCheck,
  Send,
  Plus,
  CheckSquare,
  Clock,
  Sparkles,
  ShieldAlert,
  Search,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Hash,
  ChevronRight,
  User,
  ArrowRight,
  Filter,
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import {
  sendChatMessage,
  assignTaskFromInbox,
  getOrCreateDirectConversation,
  createGroupConversation,
  getConversationMessages,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from "@/server/actions/inbox.actions";

function formatTimeString(dateVal: Date | string | null | undefined): string {
  if (!dateVal) return "";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "";
  const rawHours = d.getHours();
  const ampm = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  const hoursStr = hours.toString().padStart(2, "0");
  const minutes = d.getMinutes().toString().padStart(2, "0");
  return `${hoursStr}:${minutes} ${ampm}`;
}

interface MemberItem {
  id: string;
  role: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatarUrl: string | null;
  };
}

interface MessageItem {
  id: string;
  content: string;
  createdAt: Date | string;
  sender: {
    id: string;
    user: {
      name: string | null;
      email: string;
      avatarUrl: string | null;
    };
  };
  task?: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | string | null;
  } | null;
}

interface ConversationItem {
  id: string;
  title: string | null;
  isGroup: boolean;
  updatedAt: Date | string;
  participants: {
    member: MemberItem;
  }[];
  messages: {
    content: string;
    createdAt: Date | string;
    sender: {
      user: {
        name: string | null;
        email: string;
      };
    };
  }[];
}

interface NotificationItem {
  id: string;
  type: string;
  title: string;
  content: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date | string;
  actor?: {
    user: {
      name: string | null;
      email: string;
    };
  } | null;
}

interface InboxViewProps {
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  currentMemberId: string;
  currentUserName: string;
  currentUserRole: string;
  ownerMemberId: string | null;
  ownerName: string;
  initialConversations: ConversationItem[];
  members: MemberItem[];
  initialNotifications: NotificationItem[];
}

export const InboxView: React.FC<InboxViewProps> = ({
  workspace,
  currentMemberId,
  currentUserName,
  currentUserRole,
  ownerMemberId,
  ownerName,
  initialConversations,
  members,
  initialNotifications,
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [activeTab, setActiveTab] = useState<"chat" | "notifications">("chat");

  // Selected conversation
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(
    conversations.length > 0 ? conversations[0].id : null
  );

  // Active messages
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);

  // Modals & Forms
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newChatType, setNewChatType] = useState<"direct" | "group">("direct");
  const [groupTitle, setGroupTitle] = useState("");
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);

  // Task Assignment Modal
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskPriority, setTaskPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("MEDIUM");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [taskAssigneeIds, setTaskAssigneeIds] = useState<string[]>([]);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);
  const [taskSuccessMsg, setTaskSuccessMsg] = useState<string | null>(null);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  // Load messages when selected conversation changes & auto-poll
  useEffect(() => {
    if (!selectedConversationId) return;

    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) setLoadingMessages(true);
    });

    getConversationMessages(selectedConversationId)
      .then((data) => {
        if (isMounted) {
          setMessages(data as unknown as MessageItem[]);
          setLoadingMessages(false);
          scrollToBottom();
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setLoadingMessages(false);
      });

    // Auto-poll active conversation every 3 seconds
    const pollInterval = setInterval(() => {
      getConversationMessages(selectedConversationId)
        .then((data) => {
          if (!isMounted) return;
          setMessages((prev) => {
            if (data.length !== prev.length) {
              setTimeout(scrollToBottom, 60);
              return data as unknown as MessageItem[];
            }
            return prev;
          });
        })
        .catch(() => {});
    }, 3000);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
    };
  }, [selectedConversationId]);

  const activeConversation = conversations.find((c) => c.id === selectedConversationId);

  // Other participants (excluding current user)
  const getOtherParticipantNames = (c?: ConversationItem | null) => {
    if (!c) return "Chat";
    if (c.title) return c.title;
    const others = (c.participants || [])
      .filter((p) => p?.member?.id !== currentMemberId)
      .map((p) => p?.member?.user?.name || p?.member?.user?.email || "Teammate");
    return others.length > 0 ? others.join(", ") : "Direct Chat";
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!messageInput.trim() || !selectedConversationId || sendingMessage) return;

    const content = messageInput.trim();
    setMessageInput("");
    setSendingMessage(true);

    // Optimistic message append
    const tempMessage: MessageItem = {
      id: `temp-${Date.now()}`,
      content,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentMemberId,
        user: {
          name: currentUserName,
          email: "",
          avatarUrl: null,
        },
      },
    };
    setMessages((prev) => [...prev, tempMessage]);
    scrollToBottom();

    try {
      const res = await sendChatMessage({
        conversationId: selectedConversationId,
        content,
      });

      if (res.success && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempMessage.id ? (res.message as unknown as MessageItem) : m))
        );
      }
    } catch (err) {
      console.error(err);
      // Remove optimistic if failed
      setMessages((prev) => prev.filter((m) => m.id !== tempMessage.id));
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStartDirectChat = async (targetMemberId: string) => {
    try {
      const conversation = await getOrCreateDirectConversation(workspace.id, targetMemberId);
      if (conversation) {
        setConversations((prev) => {
          const exists = prev.some((c) => c.id === conversation.id);
          if (exists) return prev;
          return [conversation as unknown as ConversationItem, ...prev];
        });
        setSelectedConversationId(conversation.id);
        setShowNewChatModal(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateGroupChat = async () => {
    if (!groupTitle.trim() || selectedMemberIds.length === 0) return;

    try {
      const conversation = await createGroupConversation(
        workspace.id,
        groupTitle,
        selectedMemberIds
      );

      if (conversation) {
        setConversations((prev) => [conversation as unknown as ConversationItem, ...prev]);
        setSelectedConversationId(conversation.id);
        setShowNewChatModal(false);
        setGroupTitle("");
        setSelectedMemberIds([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim() || taskAssigneeIds.length === 0) return;

    setIsSubmittingTask(true);
    setTaskSuccessMsg(null);

    try {
      const res = await assignTaskFromInbox({
        workspaceId: workspace.id,
        title: taskTitle,
        description: taskDesc,
        priority: taskPriority,
        dueDate: taskDueDate,
        assigneeMemberIds: taskAssigneeIds,
        conversationId: selectedConversationId || undefined,
      });

      if (res.success) {
        setTaskSuccessMsg(
          `Task assigned to ${taskAssigneeIds.length} member(s)! Mayank Parmar (Owner) was automatically notified.`
        );
        setTaskTitle("");
        setTaskDesc("");
        setTaskAssigneeIds([]);

        // Refresh conversation messages
        if (selectedConversationId) {
          const updated = await getConversationMessages(selectedConversationId);
          setMessages(updated as unknown as MessageItem[]);
          scrollToBottom();
        }

        setTimeout(() => {
          setShowTaskModal(false);
          setTaskSuccessMsg(null);
        }, 1800);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingTask(false);
    }
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead(workspace.id, currentMemberId);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.isRead) {
      await markNotificationAsRead(notif.id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, isRead: true } : n))
      );
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="flex flex-col h-[calc(100dvh-175px)] md:h-[calc(100dvh-120px)] min-h-[480px] space-y-2.5 sm:space-y-3 pb-2 sm:pb-1">
      {/* Sleek, Compact Top Bar */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1 py-1">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                <MessageSquare className="w-5 h-5" />
              </span>
              Inbox & Team Chat
            </h1>
            <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            1-on-1 direct messages, group broadcasts, and instant task dispatching.
          </p>
        </div>

        {/* Tab switcher + New Chat Button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveTab("chat")}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                activeTab === "chat"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Messages
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("notifications")}
              className={cn(
                "relative px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5",
                activeTab === "notifications"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <Bell className="w-3.5 h-3.5" />
              Alerts
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white font-bold text-[10px]">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowNewChatModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            New Chat
          </button>
        </div>
      </div>

      {/* TAB 1: CHAT & DIRECT TASK ASSIGNMENT */}
      {activeTab === "chat" && (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden">
          {/* Conversation List Sidebar */}
          <Card className={cn(
            "p-3.5 border-slate-200 dark:border-slate-800 flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-slate-900 shadow-xs",
            selectedConversationId ? "hidden lg:flex lg:col-span-4" : "flex lg:col-span-4"
          )}>
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
              <span className="font-bold text-slate-900 dark:text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-600" />
                Conversations ({conversations.length})
              </span>
            </div>

            {/* Conversation search */}
            <div className="mt-2.5 relative shrink-0">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats, colleagues..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Chat List (scrollable) */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-1 mt-2.5 pr-1">
              {conversations.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <MessageSquare className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                  No conversations yet. Start a chat with any teammate!
                </div>
              ) : (
                conversations
                  .filter((c) =>
                    getOtherParticipantNames(c)
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase())
                  )
                  .map((c) => {
                    const isSelected = c.id === selectedConversationId;
                    const otherNames = getOtherParticipantNames(c);
                    const lastMsg = c.messages?.[0];

                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedConversationId(c.id)}
                        className={cn(
                          "w-full text-left p-3 rounded-xl transition-all flex items-start gap-3",
                          isSelected
                            ? "bg-indigo-50/90 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        )}
                      >
                        <div
                          className={cn(
                            "w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0",
                            c.isGroup
                              ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
                              : "bg-indigo-100 dark:bg-indigo-950/80 text-[#4F46E5] dark:text-indigo-300"
                          )}
                        >
                          {c.isGroup ? <Hash className="w-4 h-4" /> : (otherNames ? otherNames.slice(0, 2).toUpperCase() : "CH")}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                              {otherNames}
                            </span>
                            {c.isGroup && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 font-bold">
                                Group
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                            {lastMsg ? lastMsg.content : "No messages yet"}
                          </p>
                        </div>
                      </button>
                    );
                  })
              )}
            </div>
          </Card>

          {/* Active Chat Canvas */}
          <Card className={cn(
            "p-0 border-slate-200 dark:border-slate-800 flex flex-col h-full min-h-0 overflow-hidden bg-white dark:bg-slate-900 shadow-xs",
            selectedConversationId ? "flex lg:col-span-8" : "hidden lg:flex lg:col-span-8"
          )}>
            {activeConversation ? (
              <>
                {/* Chat Top Header (shrink-0) */}
                <div className="p-3 px-3 sm:px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70 shrink-0">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      onClick={() => setSelectedConversationId("")}
                      className="lg:hidden p-1.5 -ml-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0"
                      title="Back to conversations"
                      aria-label="Back to conversations"
                    >
                      <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>

                    <div
                      className={cn(
                        "w-8 h-8 sm:w-9 sm:h-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 shadow-xs",
                        activeConversation.isGroup
                          ? "bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300"
                          : "bg-indigo-100 dark:bg-indigo-950/80 text-[#4F46E5] dark:text-indigo-300"
                      )}
                    >
                      {activeConversation.isGroup ? (
                        <Hash className="w-4 h-4" />
                      ) : (
                        (getOtherParticipantNames(activeConversation) || "CH").slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-2 truncate">
                        <span className="truncate">{getOtherParticipantNames(activeConversation)}</span>
                        {activeConversation.isGroup ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                            {activeConversation.participants?.length || 0} Members
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-semibold">
                            Direct Message
                          </span>
                        )}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        {activeConversation.isGroup
                          ? "Team Discussion channel"
                          : "1-on-1 conversation with task synchronization"}
                      </p>
                    </div>
                  </div>

                  {/* Quick Action: Assign Task to Conversation Participants */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        const others = (activeConversation.participants || [])
                          .filter((p) => p?.member?.id !== currentMemberId)
                          .map((p) => p.member.id);
                        setTaskAssigneeIds(others.length > 0 ? others : [currentMemberId]);
                        setShowTaskModal(true);
                      }}
                      className="text-xs font-bold flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 shadow-xs"
                    >
                      <CheckSquare className="w-3.5 h-3.5" />
                      Assign Task
                    </Button>
                  </div>
                </div>

                {/* Message Bubble Feed (scrollable, flex-1 min-h-0) */}
                <div className="flex-1 min-h-0 p-4 md:p-6 overflow-y-auto space-y-3 bg-slate-50/30 dark:bg-slate-950/30">
                  {loadingMessages ? (
                    <div className="py-12 text-center text-xs text-slate-400">
                      Loading chat messages...
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="py-16 text-center text-xs text-slate-400 space-y-2">
                      <MessageSquare className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
                      <p className="font-medium text-slate-600 dark:text-slate-400">
                        No messages in this chat yet.
                      </p>
                      <p className="text-slate-400">
                        Type a message below or click &quot;Assign Task&quot; above to dispatch work.
                      </p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMe = m.sender.id === currentMemberId;
                      const senderName = m.sender.user.name || m.sender.user.email;

                      return (
                        <div
                          key={m.id}
                          className={cn("flex flex-col", isMe ? "items-end" : "items-start")}
                        >
                          <div className="flex items-center gap-2 mb-1 px-1">
                            <span className="text-[10px] font-bold text-slate-500">
                              {isMe ? "You" : senderName}
                            </span>
                            <span
                              suppressHydrationWarning
                              className="text-[10px] text-slate-400"
                            >
                              {formatTimeString(m.createdAt)}
                            </span>
                          </div>

                          <div
                            className={cn(
                              "max-w-md p-3.5 rounded-2xl text-xs md:text-sm shadow-xs",
                              isMe
                                ? "bg-indigo-600 text-white rounded-tr-none"
                                : "bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700 rounded-tl-none"
                            )}
                          >
                            <p className="whitespace-pre-wrap">{m.content}</p>

                            {/* Linked Task Card if message is a task dispatch */}
                            {m.task && (
                              <div className="mt-3 p-3 rounded-xl bg-black/10 dark:bg-black/20 border border-white/20 text-xs space-y-1.5">
                                <div className="flex items-center justify-between">
                                  <span className="font-bold flex items-center gap-1">
                                    <CheckSquare className="w-3.5 h-3.5" />
                                    {m.task.title}
                                  </span>
                                  <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-white/20">
                                    {m.task.priority}
                                  </span>
                                </div>
                                {m.task.dueDate && (
                                  <span className="text-[11px] opacity-80 block">
                                    Deadline: {new Date(m.task.dueDate).toLocaleDateString("en-US")}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input Bar (shrink-0, sticky at bottom, ALWAYS VISIBLE) */}
                <form
                  onSubmit={handleSendMessage}
                  className="p-2 sm:p-3 px-2.5 sm:px-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-1.5 sm:gap-2 shrink-0 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => {
                      const others = activeConversation.participants
                        .filter((p) => p.member.id !== currentMemberId)
                        .map((p) => p.member.id);
                      setTaskAssigneeIds(others.length > 0 ? others : [currentMemberId]);
                      setShowTaskModal(true);
                    }}
                    title="Dispatch Task"
                    className="h-9 px-2 sm:px-3 text-xs font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl flex items-center gap-1 shrink-0 transition-colors"
                  >
                    <CheckSquare className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="hidden sm:inline">Task</span>
                  </button>

                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={`Message ${getOtherParticipantNames(activeConversation)}...`}
                    className="flex-1 min-w-0 px-3 sm:px-4 py-2 text-xs md:text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={!messageInput.trim() || sendingMessage}
                    className="h-9 px-3 sm:px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                <MessageSquare className="w-12 h-12 text-slate-300 mb-3" />
                <h3 className="font-bold text-slate-700 dark:text-slate-200">No chat selected</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  Select an existing conversation from the list or click &quot;New Chat&quot; to start.
                </p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* TAB 2: UNIFIED NOTIFICATIONS CENTER */}
      {activeTab === "notifications" && (
        <Card className="p-6 border-slate-200 dark:border-slate-800 max-w-4xl mx-auto space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Bell className="w-5 h-5 text-indigo-600" />
                Activity & Alert Center
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                All task assignments, group announcements, and owner monitoring alerts.
              </p>
            </div>

            {unreadCount > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleMarkAllRead}
                className="text-xs font-semibold flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all as read
              </Button>
            )}
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="py-16 text-center text-xs text-slate-400">
                <Bell className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                No notifications right now. Everything is up to date!
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={cn(
                    "p-4 transition-colors rounded-xl flex items-start justify-between gap-4 cursor-pointer",
                    n.isRead
                      ? "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      : "bg-indigo-50/60 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                        n.type === "OWNER_ALERT"
                          ? "bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300"
                          : n.type.includes("TASK")
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300"
                          : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                      )}
                    >
                      {n.type === "OWNER_ALERT" ? (
                        <ShieldAlert className="w-4 h-4" />
                      ) : n.type.includes("TASK") ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <MessageSquare className="w-4 h-4" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 dark:text-white">
                          {n.title}
                        </span>
                        {n.type === "OWNER_ALERT" && (
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-purple-100 text-purple-800">
                            Owner Audit
                          </span>
                        )}
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {n.content}
                      </p>
                      <span
                        suppressHydrationWarning
                        className="text-[10px] text-slate-400 mt-1 block"
                      >
                        {formatTimeString(n.createdAt)}
                      </span>
                    </div>
                  </div>

                  {n.link && (
                    <a
                      href={n.link}
                      className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 shrink-0"
                    >
                      View <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>
      )}

      {/* MODAL 1: START NEW CHAT OR GROUP */}
      {showNewChatModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-md w-full p-6 border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Start New Chat / Discussion
              </h3>
              <button
                type="button"
                onClick={() => setShowNewChatModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <button
                type="button"
                onClick={() => setNewChatType("direct")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold",
                  newChatType === "direct"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                1-on-1 Direct Chat
              </button>
              <button
                type="button"
                onClick={() => setNewChatType("group")}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold",
                  newChatType === "group"
                    ? "bg-indigo-600 text-white"
                    : "text-slate-600 hover:bg-slate-100"
                )}
              >
                Team Group Channel (1-to-Many)
              </button>
            </div>

            {newChatType === "direct" ? (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <span className="text-xs text-slate-500 block mb-1">Select a colleague to chat:</span>
                {members
                  .filter((m) => m.id !== currentMemberId)
                  .map((m) => {
                    const isOwner = m.role === "OWNER" || m.user.name?.includes("Mayank");
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleStartDirectChat(m.id)}
                        className="w-full text-left p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-between transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-[#4F46E5] flex items-center justify-center font-bold text-xs">
                            {(m.user.name || m.user.email).slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-xs text-slate-900 dark:text-white block">
                              {m.user.name || m.user.email}
                            </span>
                            <span className="text-[10px] text-slate-400">{m.user.email}</span>
                          </div>
                        </div>

                        <span
                          className={cn(
                            "text-[10px] font-bold px-2 py-0.5 rounded",
                            isOwner ? "bg-purple-100 text-purple-800" : "bg-slate-100 text-slate-600"
                          )}
                        >
                          {isOwner ? "Owner" : "Employee"}
                        </span>
                      </button>
                    );
                  })}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Channel / Discussion Title
                  </label>
                  <input
                    type="text"
                    value={groupTitle}
                    onChange={(e) => setGroupTitle(e.target.value)}
                    placeholder="e.g., Client Deliverables, Design Review"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Select Participants (1-to-Many):
                  </label>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto border rounded-xl p-2 border-slate-200 dark:border-slate-700">
                    {members
                      .filter((m) => m.id !== currentMemberId)
                      .map((m) => {
                        const isChecked = selectedMemberIds.includes(m.id);
                        return (
                          <label
                            key={m.id}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                          >
                            <span className="font-medium text-slate-800 dark:text-slate-200">
                              {m.user.name || m.user.email}
                            </span>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMemberIds((prev) => [...prev, m.id]);
                                } else {
                                  setSelectedMemberIds((prev) => prev.filter((id) => id !== m.id));
                                }
                              }}
                              className="rounded text-indigo-600"
                            />
                          </label>
                        );
                      })}
                  </div>
                </div>

                <Button
                  onClick={handleCreateGroupChat}
                  disabled={!groupTitle.trim() || selectedMemberIds.length === 0}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                >
                  Create Group Channel
                </Button>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* MODAL 2: ASSIGN TASK (ONE-TO-ONE OR ONE-TO-MANY BROADCAST) */}
      {showTaskModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <Card className="max-w-lg w-full p-6 border-slate-200 dark:border-slate-800 space-y-4 shadow-2xl bg-white dark:bg-slate-900">
            <div className="flex items-center justify-between border-b pb-3 border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-indigo-600" />
                  Dispatch Task from Inbox
                </h3>
                <p className="text-[11px] text-slate-400">
                  Assign 1-on-1 to a single employee or broadcast 1-to-many across the team.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTaskModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none"
              >
                &times;
              </button>
            </div>

            {taskSuccessMsg ? (
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{taskSuccessMsg}</span>
              </div>
            ) : (
              <form onSubmit={handleAssignTask} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={taskTitle}
                    onChange={(e) => setTaskTitle(e.target.value)}
                    placeholder="e.g., Complete UI Sprint, Deliver Project Assets..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Description & Specifications
                  </label>
                  <textarea
                    rows={2}
                    value={taskDesc}
                    onChange={(e) => setTaskDesc(e.target.value)}
                    placeholder="Requirements, scope, or delivery instructions..."
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Priority Level
                    </label>
                    <select
                      value={taskPriority}
                      onChange={(e) =>
                        setTaskPriority(e.target.value as "LOW" | "MEDIUM" | "HIGH" | "URGENT")
                      }
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    >
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Target Due Date
                    </label>
                    <input
                      type="date"
                      value={taskDueDate}
                      onChange={(e) => setTaskDueDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                    />
                  </div>
                </div>

                {/* Assignees Selection (1:1 or 1:Many) */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Select Assignees ({taskAssigneeIds.length} Selected)
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = members.map((m) => m.id);
                        if (taskAssigneeIds.length === allIds.length) {
                          setTaskAssigneeIds([]);
                        } else {
                          setTaskAssigneeIds(allIds);
                        }
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                    >
                      {taskAssigneeIds.length === members.length ? "Deselect All" : "Select All (Broadcast)"}
                    </button>
                  </div>

                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-xl p-2 border-slate-200 dark:border-slate-700">
                    {members.map((m) => {
                      const isSelected = taskAssigneeIds.includes(m.id);
                      const isOwner = m.role === "OWNER" || m.user.name?.includes("Mayank");
                      return (
                        <label
                          key={m.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setTaskAssigneeIds((prev) => [...prev, m.id]);
                                } else {
                                  setTaskAssigneeIds((prev) =>
                                    prev.filter((id) => id !== m.id)
                                  );
                                }
                              }}
                              className="rounded text-indigo-600"
                            />
                            <span className="font-semibold text-slate-900 dark:text-white">
                              {m.user.name || m.user.email}
                            </span>
                          </div>

                          <span
                            className={cn(
                              "text-[10px] font-bold px-1.5 py-0.2 rounded",
                              isOwner
                                ? "bg-purple-100 text-purple-800"
                                : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {isOwner ? "Owner" : "Employee"}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Owner Guarantee Callout */}
                <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-200">
                  <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Owner Notification Guarantee:</strong>
                    <p className="text-[11px] opacity-90 mt-0.5">
                      Owner <strong>Mayank Parmar</strong> is automatically copied and sent an instant
                      audit notification whenever this task is dispatched.
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setShowTaskModal(false)}
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmittingTask || !taskTitle.trim() || taskAssigneeIds.length === 0}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                  >
                    {isSubmittingTask ? "Dispatching..." : `Assign Task to ${taskAssigneeIds.length} Member(s)`}
                  </Button>
                </div>
              </form>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};
