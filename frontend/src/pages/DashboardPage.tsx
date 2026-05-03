import { useMemo, useState } from "react";
import {
  Archive,
  Bell,
  Clock,
  Inbox,
  Mail,
  MailOpen,
  MoreHorizontal,
  Paperclip,
  PenLine,
  Reply,
  Search,
  Send,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type MailFolder = "inbox" | "starred" | "sent" | "archive";

type Email = {
  id: number;
  folder: MailFolder;
  sender: string;
  email: string;
  subject: string;
  preview: string;
  body: string;
  time: string;
  unread: boolean;
  starred: boolean;
  hasAttachment?: boolean;
  label: string;
};

const folders: Array<{
  id: MailFolder;
  label: string;
  icon: typeof Inbox;
}> = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "starred", label: "Starred", icon: Star },
  { id: "sent", label: "Sent", icon: Send },
  { id: "archive", label: "Archive", icon: Archive },
];

const emails: Email[] = [
  {
    id: 1,
    folder: "inbox",
    sender: "Maya Thompson",
    email: "maya.thompson@northline.edu",
    subject: "Updated advising schedule",
    preview: "The revised advising blocks are ready for review before Friday.",
    body: "The revised advising blocks are ready for review before Friday. I moved the two overloaded morning windows into the afternoon and left room for walk-ins during the registration rush.",
    time: "9:42 AM",
    unread: true,
    starred: true,
    hasAttachment: true,
    label: "Advising",
  },
  {
    id: 2,
    folder: "inbox",
    sender: "Registrar Office",
    email: "registrar@northline.edu",
    subject: "Enrollment exception requests",
    preview: "Three exception requests need department approval today.",
    body: "Three exception requests need department approval today. The students have uploaded the required documentation and are waiting on final review.",
    time: "8:16 AM",
    unread: true,
    starred: false,
    label: "Urgent",
  },
  {
    id: 3,
    folder: "inbox",
    sender: "Jon Bell",
    email: "jbell@northline.edu",
    subject: "Guest speaker confirmation",
    preview: "Dr. Carver confirmed the Wednesday lecture and sent the abstract.",
    body: "Dr. Carver confirmed the Wednesday lecture and sent the abstract. I added the event details to the shared calendar and drafted the announcement for students.",
    time: "Yesterday",
    unread: false,
    starred: false,
    hasAttachment: true,
    label: "Events",
  },
  {
    id: 4,
    folder: "sent",
    sender: "You",
    email: "admin@northline.edu",
    subject: "Re: Budget planning notes",
    preview: "I added the projected tutoring hours and revised the equipment line.",
    body: "I added the projected tutoring hours and revised the equipment line. The new total should line up with the revised department cap.",
    time: "Mon",
    unread: false,
    starred: false,
    label: "Finance",
  },
  {
    id: 5,
    folder: "archive",
    sender: "Campus IT",
    email: "it@northline.edu",
    subject: "Maintenance window completed",
    preview: "The planned database maintenance completed without incident.",
    body: "The planned database maintenance completed without incident. All services are back online, and monitoring has not detected any delayed jobs.",
    time: "Apr 28",
    unread: false,
    starred: false,
    label: "Systems",
  },
  {
    id: 6,
    folder: "inbox",
    sender: "Priya Shah",
    email: "priya.shah@northline.edu",
    subject: "Final review for student research list",
    preview: "Can you confirm the five students marked for presentation slots?",
    body: "Can you confirm the five students marked for presentation slots? I want to send the final program to printing by the end of the day.",
    time: "Apr 27",
    unread: false,
    starred: true,
    label: "Research",
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeFolder, setActiveFolder] = useState<MailFolder>("inbox");
  const [selectedId, setSelectedId] = useState(emails[0].id);
  const [query, setQuery] = useState("");

  const filteredEmails = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return emails.filter((email) => {
      const matchesFolder =
        activeFolder === "starred"
          ? email.starred
          : email.folder === activeFolder;

      const matchesQuery =
        normalizedQuery.length === 0 ||
        [email.sender, email.email, email.subject, email.preview, email.label]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      return matchesFolder && matchesQuery;
    });
  }, [activeFolder, query]);

  const selectedEmail =
    filteredEmails.find((email) => email.id === selectedId) ??
    filteredEmails[0] ??
    emails[0];

  const unreadCount = emails.filter(
    (email) => email.folder === "inbox" && email.unread,
  ).length;

  return (
    <div className="min-h-[calc(100vh-65px)] bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="grid min-h-[calc(100vh-65px)] grid-cols-1 lg:grid-cols-[220px_minmax(300px,420px)_1fr]">
        <aside className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between lg:block">
            <div>
              <h1 className="text-xl font-semibold leading-tight">Inbox</h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {unreadCount} unread messages
              </p>
            </div>
            <Button className="gap-2" title="Compose message">
              <PenLine className="size-4" />
              Compose
            </Button>
          </div>

          <nav className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {folders.map((folder) => {
              const Icon = folder.icon;
              const count =
                folder.id === "starred"
                  ? emails.filter((email) => email.starred).length
                  : emails.filter((email) => email.folder === folder.id).length;

              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setSelectedId(
                      emails.find((email) =>
                        folder.id === "starred"
                          ? email.starred
                          : email.folder === folder.id,
                      )?.id ?? emails[0].id,
                    );
                  }}
                  className={cn(
                    "flex h-9 items-center justify-between rounded-lg px-3 text-sm font-medium transition-colors",
                    activeFolder === folder.id
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:hover:text-white",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{folder.label}</span>
                  </span>
                  <span className="ml-2 text-xs opacity-75">{count}</span>
                </button>
              );
            })}

            {user?.role === "admin" ? (
              <Button
                asChild
                variant="outline"
                className="col-span-2 mt-2 justify-start gap-2 lg:col-span-1"
              >
                <Link to="/manage-users">
                  <Shield className="size-4" />
                  Manage Users
                </Link>
              </Button>
            ) : null}
          </nav>
        </aside>

        <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:border-b-0 lg:border-r">
          <div className="border-b border-zinc-200 p-4 dark:border-zinc-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search mail"
                className="pl-8"
              />
            </div>
          </div>

          <div className="max-h-[46vh] overflow-y-auto lg:max-h-[calc(100vh-138px)]">
            {filteredEmails.map((email) => (
              <button
                key={email.id}
                type="button"
                onClick={() => setSelectedId(email.id)}
                className={cn(
                  "grid w-full gap-2 border-b border-zinc-200 p-4 text-left transition-colors dark:border-zinc-800",
                  selectedEmail.id === email.id
                    ? "bg-zinc-100 dark:bg-zinc-800"
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-800/70",
                )}
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block truncate text-sm",
                        email.unread ? "font-semibold" : "font-medium",
                      )}
                    >
                      {email.sender}
                    </span>
                    <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                      {email.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                    {email.time}
                  </span>
                </span>

                <span className="flex items-center gap-2">
                  {email.unread ? (
                    <Mail className="size-4 shrink-0 text-sky-600" />
                  ) : (
                    <MailOpen className="size-4 shrink-0 text-zinc-400" />
                  )}
                  <span className="min-w-0 truncate text-sm font-medium">
                    {email.subject}
                  </span>
                </span>

                <span className="line-clamp-2 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
                  {email.preview}
                </span>

                <span className="flex items-center justify-between">
                  <span className="rounded-md border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                    {email.label}
                  </span>
                  {email.hasAttachment ? (
                    <Paperclip className="size-4 text-zinc-400" />
                  ) : null}
                </span>
              </button>
            ))}

            {filteredEmails.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                No messages found.
              </div>
            ) : null}
          </div>
        </section>

        <article className="flex min-h-130 flex-col bg-zinc-50 dark:bg-zinc-950">
          <header className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                    {selectedEmail.label}
                  </span>
                  {selectedEmail.unread ? (
                    <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                      New
                    </span>
                  ) : null}
                </div>
                <h2 className="mt-3 text-2xl font-semibold leading-tight">
                  {selectedEmail.subject}
                </h2>
                <p className="mt-2 truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {selectedEmail.sender} &lt;{selectedEmail.email}&gt;
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <Button variant="ghost" size="icon" title="Remind me">
                  <Bell className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Snooze">
                  <Clock className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" title="Delete">
                  <Trash2 className="size-4" />
                </Button>
                <Button variant="ghost" size="icon" title="More">
                  <MoreHorizontal className="size-4" />
                </Button>
              </div>
            </div>
          </header>

          <div className="flex-1 px-5 py-6 md:px-8">
            <div className="max-w-3xl space-y-5">
              <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                {selectedEmail.body}
              </p>
              <p className="text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                Please reply when you have a moment, and I will keep the thread
                updated with any changes from the department.
              </p>
            </div>
          </div>

          <footer className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-wrap items-center gap-2">
              <Button className="gap-2">
                <Reply className="size-4" />
                Reply
              </Button>
              <Button variant="outline" className="gap-2">
                <Archive className="size-4" />
                Archive
              </Button>
              <Button variant="ghost" size="icon" title="Star message">
                <Star
                  className={cn(
                    "size-4",
                    selectedEmail.starred
                      ? "fill-amber-400 text-amber-500"
                      : "text-zinc-500",
                  )}
                />
              </Button>
            </div>
          </footer>
        </article>
      </div>
    </div>
  );
}
