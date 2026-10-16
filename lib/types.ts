export const ROLES = ["admin", "member", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export const STATUSES = ["todo", "in_progress", "done"] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ["low", "medium", "high"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  passwordHash: string;
  createdAt: string;
}

export type PublicUser = Omit<User, "passwordHash">;

export interface Session {
  tokenHash: string;
  userId: string;
  expiresAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: Status;
  priority: Priority;
  assigneeId: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Data {
  users: User[];
  sessions: Session[];
  tasks: Task[];
}

export const STATUS_LABELS: Record<Status, string> = {
  todo: "To do",
  in_progress: "In progress",
  done: "Done",
};

export function toPublicUser({ passwordHash: _omit, ...user }: User): PublicUser {
  return user;
}
