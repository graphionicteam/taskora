"use server";

import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { getActiveWorkspaceContext, getWorkspaceActiveMembers } from "@/lib/workspace";
import { revalidatePath } from "next/cache";

/**
 * Finds the workspace owner member (e.g., Mayank Parmar).
 */
export async function getWorkspaceOwner(workspaceId: string) {
  const owner = await db.workspaceMember.findFirst({
    where: {
      workspaceId,
      status: "ACTIVE",
      role: "OWNER",
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      },
    },
  });

  return owner;
}

/**
 * Helper to dispatch notification to an individual member.
 */
export async function createNotification(data: {
  workspaceId: string;
  recipientId: string;
  actorId?: string;
  type: string;
  title: string;
  content: string;
  link?: string;
}) {
  return db.notification.create({
    data: {
      workspaceId: data.workspaceId,
      recipientId: data.recipientId,
      actorId: data.actorId,
      type: data.type,
      title: data.title,
      content: data.content,
      link: data.link || "/inbox",
    },
  });
}

/**
 * Helper to dispatch notification to assignees AND always ensure Owner (Mayank Parmar) is notified.
 */
export async function notifyAssigneesAndOwner(params: {
  workspaceId: string;
  actorId: string;
  actorName: string;
  taskTitle: string;
  assigneeMemberIds: string[];
  isBroadcast: boolean;
  taskId: string;
}) {
  const { workspaceId, actorId, actorName, taskTitle, assigneeMemberIds, isBroadcast, taskId } = params;

  // 1. Notify each assigned member
  const assigneePromises = assigneeMemberIds
    .filter((id) => id !== actorId)
    .map((memberId) =>
      createNotification({
        workspaceId,
        recipientId: memberId,
        actorId,
        type: isBroadcast ? "TASK_BROADCAST" : "TASK_ASSIGNED",
        title: isBroadcast ? "New Team Task Broadcast" : "New Task Assigned to You",
        content: `${actorName} assigned you: "${taskTitle}"`,
        link: `/tasks?selected=${taskId}`,
      })
    );

  // 2. Fetch owner of the workspace (e.g. Mayank Parmar)
  const owner = await getWorkspaceOwner(workspaceId);

  // 3. Guarantee owner ALWAYS gets notified for audit & oversight
  if (owner) {
    if (owner.id !== actorId) {
      assigneePromises.push(
        createNotification({
          workspaceId,
          recipientId: owner.id,
          actorId,
          type: "OWNER_ALERT",
          title: isBroadcast ? "Team Broadcast Alert (Owner)" : "Task Assignment Alert (Owner)",
          content: `${actorName} assigned "${taskTitle}" to ${assigneeMemberIds.length} member(s).`,
          link: `/tasks?selected=${taskId}`,
        })
      );
    } else {
      assigneePromises.push(
        createNotification({
          workspaceId,
          recipientId: owner.id,
          actorId,
          type: "OWNER_ALERT",
          title: isBroadcast ? "Team Broadcast Dispatched" : "Task Assignment Dispatched",
          content: `You assigned "${taskTitle}" to ${assigneeMemberIds.length} member(s).`,
          link: `/tasks?selected=${taskId}`,
        })
      );
    }
  }

  await Promise.all(assigneePromises);
}

/**
 * Fetches all conversations, members, and notifications for the current active workspace.
 */
export async function getInboxData(workspaceId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wsContext = await getActiveWorkspaceContext(session.user.id, workspaceId);
  if (!wsContext) throw new Error("Workspace membership not found");

  const currentMemberId = wsContext.member.id;

  const [conversations, members, notifications] = await Promise.all([
    db.conversation.findMany({
      where: {
        workspaceId,
        participants: {
          some: {
            memberId: currentMemberId,
          },
        },
      },
      include: {
        participants: {
          include: {
            member: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatarUrl: true,
                  },
                },
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            sender: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    }),

    getWorkspaceActiveMembers(workspaceId),

    db.notification.findMany({
      where: {
        workspaceId,
        recipientId: currentMemberId,
      },
      include: {
        actor: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const owner = members.find((m) => m.role === "OWNER");

  return {
    currentMemberId,
    currentUserRole: wsContext.role,
    ownerMemberId: owner?.id || null,
    ownerName: owner?.user?.name || "Mayank Parmar",
    conversations,
    members,
    notifications,
  };
}

/**
 * Retrieves or creates a 1-on-1 direct message conversation between two members.
 */
export async function getOrCreateDirectConversation(workspaceId: string, targetMemberId: string) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wsContext = await getActiveWorkspaceContext(session.user.id, workspaceId);
  if (!wsContext) throw new Error("Workspace membership not found");

  const currentMemberId = wsContext.member.id;

  // Search for existing 1-on-1 conversation
  const existing = await db.conversation.findFirst({
    where: {
      workspaceId,
      isGroup: false,
      AND: [
        { participants: { some: { memberId: currentMemberId } } },
        { participants: { some: { memberId: targetMemberId } } },
      ],
    },
    include: {
      participants: {
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (existing) {
    return existing;
  }

  // Create new 1-on-1 conversation
  const created = await db.conversation.create({
    data: {
      workspaceId,
      isGroup: false,
      participants: {
        create: [
          { memberId: currentMemberId },
          { memberId: targetMemberId },
        ],
      },
    },
    include: {
      participants: {
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  revalidatePath("/inbox");
  return created;
}

/**
 * Creates a group / broadcast discussion conversation (one-to-many).
 */
export async function createGroupConversation(
  workspaceId: string,
  title: string,
  memberIds: string[]
) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wsContext = await getActiveWorkspaceContext(session.user.id, workspaceId);
  if (!wsContext) throw new Error("Workspace membership not found");

  const currentMemberId = wsContext.member.id;
  const allParticipantIds = Array.from(new Set([currentMemberId, ...memberIds]));

  const conversation = await db.conversation.create({
    data: {
      workspaceId,
      title: title.trim() || "Team Discussion",
      isGroup: true,
      participants: {
        create: allParticipantIds.map((memberId) => ({ memberId })),
      },
    },
    include: {
      participants: {
        include: {
          member: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // Notify members about new group channel
  const owner = await getWorkspaceOwner(workspaceId);
  const notifyList = allParticipantIds.filter((id) => id !== currentMemberId);

  // If owner is not current creator, make sure owner is notified
  if (owner && owner.id !== currentMemberId && !notifyList.includes(owner.id)) {
    notifyList.push(owner.id);
  }

  const actorName = session.user.name || "A team member";

  await Promise.all(
    notifyList.map((id) =>
      createNotification({
        workspaceId,
        recipientId: id,
        actorId: currentMemberId,
        type: "GROUP_CREATED",
        title: "New Team Discussion Created",
        content: `${actorName} created the group "${title}"`,
        link: `/inbox?c=${conversation.id}`,
      })
    )
  );

  revalidatePath("/inbox");
  return conversation;
}

/**
 * Fetches all messages for a specific conversation.
 */
export async function getConversationMessages(conversationId: string) {
  return db.message.findMany({
    where: { conversationId },
    include: {
      sender: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      task: {
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          assignee: {
            select: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          assignments: {
            include: {
              member: {
                include: {
                  user: {
                    select: {
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * Sends a chat message in a conversation and triggers owner alerts.
 */
export async function sendChatMessage(data: {
  conversationId: string;
  content: string;
  taskId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const conversation = await db.conversation.findUnique({
    where: { id: data.conversationId },
    include: {
      participants: true,
    },
  });

  if (!conversation) throw new Error("Conversation not found");

  const wsContext = await getActiveWorkspaceContext(session.user.id, conversation.workspaceId);
  if (!wsContext) throw new Error("Workspace membership not found");

  const currentMemberId = wsContext.member.id;
  const currentUserName = session.user.name || session.user.email?.split("@")[0] || "User";

  const message = await db.message.create({
    data: {
      conversationId: data.conversationId,
      senderId: currentMemberId,
      content: data.content.trim(),
      taskId: data.taskId || null,
    },
    include: {
      sender: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
      },
      task: true,
    },
  });

  // Update conversation last active timestamp
  await db.conversation.update({
    where: { id: data.conversationId },
    data: { updatedAt: new Date() },
  });

  // Fetch Owner Mayank Parmar
  const owner = await getWorkspaceOwner(conversation.workspaceId);

  // Notify other participants in the conversation
  const otherParticipants = conversation.participants.filter(
    (p) => p.memberId !== currentMemberId
  );

  const notificationsToSend = otherParticipants.map((p) =>
    createNotification({
      workspaceId: conversation.workspaceId,
      recipientId: p.memberId,
      actorId: currentMemberId,
      type: "CHAT_MESSAGE",
      title: conversation.isGroup
        ? `Message in ${conversation.title || "Group"}`
        : `Direct message from ${currentUserName}`,
      content: data.content.length > 80 ? `${data.content.slice(0, 80)}...` : data.content,
      link: `/inbox?c=${conversation.id}`,
    })
  );

  // OWNER NOTIFICATION RULE:
  // If the owner is not the sender and was not in the participants list, notify the owner!
  if (owner && owner.id !== currentMemberId && !otherParticipants.some((p) => p.memberId === owner.id)) {
    notificationsToSend.push(
      createNotification({
        workspaceId: conversation.workspaceId,
        recipientId: owner.id,
        actorId: currentMemberId,
        type: "OWNER_ALERT",
        title: `Chat Activity: ${currentUserName}`,
        content: `New chat message: "${data.content.slice(0, 60)}..."`,
        link: `/inbox?c=${conversation.id}`,
      })
    );
  }

  await Promise.all(notificationsToSend);

  revalidatePath("/inbox");
  return { success: true, message };
}

/**
 * Assigns a task (One-to-One or One-to-Many) from the Inbox and notifies assignees & Owner Mayank Parmar.
 */
export async function assignTaskFromInbox(data: {
  workspaceId: string;
  title: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  dueDate?: string;
  assigneeMemberIds: string[]; // Supports 1 or multiple members
  conversationId?: string; // If called from within a chat
}) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const wsContext = await getActiveWorkspaceContext(session.user.id, data.workspaceId);
  if (!wsContext) throw new Error("Workspace membership not found");

  const currentMemberId = wsContext.member.id;
  const actorName = session.user.name || "A team member";

  if (!data.title || data.title.trim().length === 0) {
    throw new Error("Task title is required");
  }

  if (!data.assigneeMemberIds || data.assigneeMemberIds.length === 0) {
    throw new Error("At least one assignee must be selected");
  }

  const primaryAssigneeId = data.assigneeMemberIds[0];
  const isBroadcast = data.assigneeMemberIds.length > 1;

  // 1. Create the Task in DB
  const task = await db.task.create({
    data: {
      workspaceId: data.workspaceId,
      creatorId: session.user.id,
      title: data.title.trim(),
      description: data.description?.trim() || null,
      priority: data.priority || "MEDIUM",
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      assigneeId: primaryAssigneeId,
      assignments: {
        create: data.assigneeMemberIds.map((memberId) => ({ memberId })),
      },
    },
    include: {
      assignments: {
        include: {
          member: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      },
    },
  });

  // 2. If inside a conversation, post a task announcement message into the chat
  if (data.conversationId) {
    const assignedNames = task.assignments
      .map((a) => a.member.user.name || a.member.user.email)
      .join(", ");

    await db.message.create({
      data: {
        conversationId: data.conversationId,
        senderId: currentMemberId,
        content: `📋 Assigned task: "${task.title}" to ${assignedNames}`,
        taskId: task.id,
      },
    });

    await db.conversation.update({
      where: { id: data.conversationId },
      data: { updatedAt: new Date() },
    });
  }

  // 3. Dispatch notifications to all assignees AND always to Owner Mayank Parmar
  await notifyAssigneesAndOwner({
    workspaceId: data.workspaceId,
    actorId: currentMemberId,
    actorName,
    taskTitle: task.title,
    assigneeMemberIds: data.assigneeMemberIds,
    isBroadcast,
    taskId: task.id,
  });

  revalidatePath("/inbox");
  revalidatePath("/tasks");

  return { success: true, task };
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationAsRead(notificationId: string) {
  const updated = await db.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });

  revalidatePath("/inbox");
  return { success: true, notification: updated };
}

/**
 * Mark all notifications as read for current member.
 */
export async function markAllNotificationsAsRead(workspaceId: string, memberId: string) {
  await db.notification.updateMany({
    where: {
      workspaceId,
      recipientId: memberId,
      isRead: false,
    },
    data: { isRead: true },
  });

  revalidatePath("/inbox");
  return { success: true };
}
