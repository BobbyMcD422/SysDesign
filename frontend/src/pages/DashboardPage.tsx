import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import {
  Archive,
  AlertCircle,
  BookOpen,
  Inbox,
  Loader2,
  Mail,
  MailOpen,
  PenLine,
  RefreshCcw,
  Reply,
  Search,
  Send,
  Shield,
  Star,
  Trash2,
} from "lucide-react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getClasses,
  getGmailMessages,
  sendEmail,
  updateGmailMessage,
} from "@/lib/api";
import type { ClassRecord, GmailMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

type MailFolder = "inbox" | "starred" | "sent" | "archive";

type ComposeForm = {
  recipients: string;
  subject: string;
  body: string;
  classId: string;
  classlist: string;
};

const folders: Array<{
  id: MailFolder;
  icon: typeof Inbox;
}> = [
  { id: "inbox", icon: Inbox },
  { id: "starred", icon: Star },
  { id: "sent", icon: Send },
  { id: "archive", icon: Archive },
];

const emptyComposeForm: ComposeForm = {
  recipients: "",
  subject: "",
  body: "",
  classId: "",
  classlist: "",
};

function getSenderName(message: GmailMessage, fallback: string) {
  const from = message.from_email ?? fallback;
  const match = from.match(/^"?([^"<]+)"?\s*</);
  return match?.[1]?.trim() || from;
}

function getSenderEmail(message: GmailMessage, fallback: string) {
  const from = message.from_email ?? "";
  const match = from.match(/<([^>]+)>/);
  return match?.[1]?.trim() || from || fallback;
}

function getMessageTime(message: GmailMessage, language: string) {
  const timestamp = message.internal_date
    ? Number(message.internal_date)
    : Date.parse(message.date ?? "");

  if (!Number.isFinite(timestamp)) {
    return "";
  }

  return new Intl.DateTimeFormat(language, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestamp));
}

function getRecipients(value: string) {
  return value
    .split(/[,\n;]/)
    .map((recipient) => recipient.trim())
    .filter(Boolean);
}

function getClassLabel(classRecord: ClassRecord) {
  return `${classRecord.name} (${classRecord.term})`;
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [activeFolder, setActiveFolder] = useState<MailFolder>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [classes, setClasses] = useState<ClassRecord[]>([]);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState<ComposeForm>(emptyComposeForm);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [actionStatus, setActionStatus] = useState<string | null>(null);
  const [pendingMessageAction, setPendingMessageAction] = useState<string | null>(
    null,
  );

  const loadMessages = async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const response = await getGmailMessages({
        folder: activeFolder,
        query,
        includeBody: true,
      });
      setMessages(response.messages);
      setSelectedId((currentId) => {
        if (response.messages.some((message) => message.id === currentId)) {
          return currentId;
        }
        return response.messages[0]?.id ?? null;
      });
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : t("dashboard.mail.errors.loadMessages"),
      );
      setMessages([]);
      setSelectedId(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadMessages();
  }, [activeFolder]);

  useEffect(() => {
    async function loadClasses() {
      setClassesError(null);

      try {
        const classRecords = await getClasses();
        setClasses(classRecords);
        setComposeForm((form) => ({
          ...form,
          classId: form.classId || (classRecords[0]?.class_id.toString() ?? ""),
          classlist:
            form.classlist || (classRecords[0] ? getClassLabel(classRecords[0]) : ""),
        }));
      } catch (error) {
        setClassesError(
          error instanceof Error
            ? error.message
            : t("dashboard.mail.errors.loadClasses"),
        );
      }
    }

    void loadClasses();
  }, []);

  const filteredMessages = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return messages;

    return messages.filter((message) =>
      [
        getSenderName(message, t("dashboard.mail.fallbacks.unknownSender")),
        getSenderEmail(message, t("dashboard.mail.fallbacks.noEmailAddress")),
        message.subject,
        message.snippet,
        message.body,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [messages, query, t]);

  const selectedMessage =
    filteredMessages.find((message) => message.id === selectedId) ??
    filteredMessages[0] ??
    null;

  const unreadCount = messages.filter((message) =>
    message.label_ids.includes("UNREAD"),
  ).length;
  const readCount = messages.length - unreadCount;

  function updateMessageLabels(
    messageId: string,
    addLabels: string[] = [],
    removeLabels: string[] = [],
  ) {
    setMessages((currentMessages) =>
      currentMessages.map((message) => {
        if (message.id !== messageId) return message;

        const nextLabels = new Set(message.label_ids);
        removeLabels.forEach((label) => nextLabels.delete(label));
        addLabels.forEach((label) => nextLabels.add(label));

        return {
          ...message,
          label_ids: Array.from(nextLabels),
        };
      }),
    );
  }

  function removeMessage(messageId: string) {
    setMessages((currentMessages) => {
      const nextMessages = currentMessages.filter(
        (message) => message.id !== messageId,
      );
      setSelectedId((currentId) => {
        if (currentId !== messageId) return currentId;
        return nextMessages[0]?.id ?? null;
      });
      return nextMessages;
    });
  }

  async function handleMessageAction(
    message: GmailMessage,
    action: "read" | "unread" | "star" | "unstar" | "archive" | "trash",
  ) {
    const pendingKey = `${message.id}-${action}`;
    setActionStatus(null);
    setPendingMessageAction(pendingKey);

    try {
      await updateGmailMessage(message.id, action);

      if (action === "read") {
        updateMessageLabels(message.id, [], ["UNREAD"]);
      } else if (action === "unread") {
        updateMessageLabels(message.id, ["UNREAD"]);
      } else if (action === "star") {
        updateMessageLabels(message.id, ["STARRED"]);
      } else if (action === "unstar") {
        if (activeFolder === "starred") {
          removeMessage(message.id);
        } else {
          updateMessageLabels(message.id, [], ["STARRED"]);
        }
      } else {
        removeMessage(message.id);
      }
    } catch (error) {
      setActionStatus(
        error instanceof Error
          ? error.message
          : t("dashboard.mail.errors.updateMessage"),
      );
    } finally {
      setPendingMessageAction(null);
    }
  }

  async function handleSelectMessage(message: GmailMessage) {
    setSelectedId(message.id);
    if (message.label_ids.includes("UNREAD")) {
      await handleMessageAction(message, "read");
    }
  }

  const handleComposeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSendStatus(null);

    const recipients = getRecipients(composeForm.recipients);
    if (recipients.length === 0 && !composeForm.classId) {
      setSendStatus(t("dashboard.mail.validation.recipientOrClass"));
      return;
    }
    if (!composeForm.classId) {
      setSendStatus(t("dashboard.mail.validation.classList"));
      return;
    }

    setIsSending(true);
    try {
      await sendEmail({
        recipients,
        subject: composeForm.subject,
        body: composeForm.body,
        class_id: Number(composeForm.classId),
        classlist: composeForm.classlist,
        prof: user ? `${user.fname} ${user.lname}` : null,
      });
      setComposeForm(emptyComposeForm);
      setComposeOpen(false);
      await loadMessages();
    } catch (error) {
      setSendStatus(
        error instanceof Error ? error.message : t("dashboard.mail.errors.sendEmail"),
      );
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-65px)] bg-zinc-50 text-zinc-950 dark:bg-zinc-950 dark:text-zinc-50">
      <div className="grid min-h-[calc(100vh-65px)] grid-cols-1 lg:grid-cols-[220px_minmax(300px,420px)_1fr]">
        <aside className="border-b border-zinc-200 bg-white px-4 py-4 dark:border-zinc-800 dark:bg-zinc-900 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between gap-3 lg:block">
            <div>
              <h1 className="text-xl font-semibold leading-tight">
                {t("dashboard.mail.title")}
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                {t("dashboard.mail.counts", { unreadCount, readCount })}
              </p>
            </div>
            <Button
              className="gap-2"
              title={t("dashboard.mail.actions.composeMessage")}
              onClick={() => {
                setSendStatus(null);
                setComposeOpen(true);
              }}
            >
              <PenLine className="size-4" />
              {t("dashboard.mail.actions.compose")}
            </Button>
          </div>

          <nav className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {folders.map((folder) => {
              const Icon = folder.icon;

              return (
                <button
                  key={folder.id}
                  type="button"
                  onClick={() => {
                    setActiveFolder(folder.id);
                    setSelectedId(null);
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
                    <span className="truncate">
                      {t(`dashboard.mail.folders.${folder.id}`)}
                    </span>
                  </span>
                </button>
              );
            })}

            {user?.role === "admin" ? (
              <>
                <Button
                  asChild
                  variant="outline"
                  className="col-span-2 mt-2 justify-start gap-2 lg:col-span-1"
                >
                  <Link to="/manage-users">
                    <Shield className="size-4" />
                    {t("manageUsers.title")}
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  className="col-span-2 justify-start gap-2 lg:col-span-1"
                >
                  <Link to="/manage-students">
                    <BookOpen className="size-4" />
                    {t("dashboard.mail.admin.manageClasses")}
                  </Link>
                </Button>
              </>
            ) : null}
          </nav>
        </aside>

        <section className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 lg:border-b-0 lg:border-r">
          <div className="space-y-3 border-b border-zinc-200 p-4 dark:border-zinc-800">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void loadMessages();
                }}
                placeholder={t("dashboard.mail.search.placeholder")}
                className="pl-8"
              />
            </div>
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => void loadMessages()}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCcw className="size-4" />
              )}
              {t("dashboard.mail.actions.refresh")}
            </Button>
          </div>

          <div className="max-h-[46vh] overflow-y-auto lg:max-h-[calc(100vh-190px)]">
            {loadError ? (
              <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                <AlertCircle className="mb-2 size-4" />
                {loadError}
              </div>
            ) : null}

            {actionStatus ? (
              <div className="m-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {actionStatus}
              </div>
            ) : null}

            {isLoading && messages.length === 0 ? (
              <div className="flex items-center justify-center gap-2 p-8 text-sm text-zinc-500 dark:text-zinc-400">
                <Loader2 className="size-4 animate-spin" />
                {t("dashboard.mail.states.loadingMessages")}
              </div>
            ) : null}

            {filteredMessages.map((message) => {
              const unread = message.label_ids.includes("UNREAD");
              const starred = message.label_ids.includes("STARRED");

              return (
                <button
                  key={message.id}
                  type="button"
                  onClick={() => void handleSelectMessage(message)}
                  className={cn(
                    "grid w-full gap-2 border-b border-zinc-200 p-4 text-left transition-colors dark:border-zinc-800",
                    selectedMessage?.id === message.id
                      ? "bg-zinc-100 dark:bg-zinc-800"
                      : "hover:bg-zinc-50 dark:hover:bg-zinc-800/70",
                  )}
                >
                  <span className="flex items-start justify-between gap-3">
                    <span className="min-w-0">
                      <span
                        className={cn(
                          "block truncate text-sm",
                          unread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {getSenderName(
                          message,
                          t("dashboard.mail.fallbacks.unknownSender"),
                        )}
                      </span>
                      <span className="block truncate text-xs text-zinc-500 dark:text-zinc-400">
                        {getSenderEmail(
                          message,
                          t("dashboard.mail.fallbacks.noEmailAddress"),
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">
                      {getMessageTime(message, i18n.language)}
                    </span>
                  </span>

                  <span className="flex items-center gap-2">
                    {unread ? (
                      <Mail className="size-4 shrink-0 text-sky-600" />
                    ) : (
                      <MailOpen className="size-4 shrink-0 text-zinc-400" />
                    )}
                    <span className="min-w-0 truncate text-sm font-medium">
                      {message.subject || t("dashboard.mail.fallbacks.noSubject")}
                    </span>
                  </span>

                  <span className="line-clamp-2 text-sm leading-5 text-zinc-600 dark:text-zinc-300">
                    {message.snippet ||
                      message.body ||
                      t("dashboard.mail.fallbacks.noPreview")}
                  </span>

                  <span className="flex items-center justify-between">
                    <span className="rounded-md border border-zinc-200 px-2 py-0.5 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
                      Gmail
                    </span>
                    {starred ? (
                      <Star className="size-4 fill-amber-400 text-amber-500" />
                    ) : null}
                  </span>
                </button>
              );
            })}

            {!isLoading && !loadError && filteredMessages.length === 0 ? (
              <div className="p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                {t("dashboard.mail.states.noMessages")}
              </div>
            ) : null}
          </div>
        </section>

        <article className="flex min-h-130 flex-col bg-zinc-50 dark:bg-zinc-950">
          {selectedMessage ? (
            <>
              <header className="border-b border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-sky-100 px-2 py-1 text-xs font-medium text-sky-800 dark:bg-sky-950 dark:text-sky-200">
                        Gmail
                      </span>
                      {selectedMessage.label_ids.includes("UNREAD") ? (
                        <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200">
                          {t("dashboard.mail.labels.new")}
                        </span>
                      ) : null}
                    </div>
                    <h2 className="mt-3 text-2xl font-semibold leading-tight">
                      {selectedMessage.subject ||
                        t("dashboard.mail.fallbacks.noSubject")}
                    </h2>
                    <p className="mt-2 truncate text-sm text-zinc-500 dark:text-zinc-400">
                      {getSenderName(
                        selectedMessage,
                        t("dashboard.mail.fallbacks.unknownSender"),
                      )}{" "}
                      &lt;
                      {getSenderEmail(
                        selectedMessage,
                        t("dashboard.mail.fallbacks.noEmailAddress"),
                      )}
                      &gt;
                    </p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={
                        selectedMessage.label_ids.includes("UNREAD")
                          ? t("dashboard.mail.actions.markRead")
                          : t("dashboard.mail.actions.markUnread")
                      }
                      disabled={pendingMessageAction?.startsWith(selectedMessage.id)}
                      onClick={() =>
                        void handleMessageAction(
                          selectedMessage,
                          selectedMessage.label_ids.includes("UNREAD")
                            ? "read"
                            : "unread",
                        )
                      }
                    >
                      {selectedMessage.label_ids.includes("UNREAD") ? (
                        <MailOpen className="size-4" />
                      ) : (
                        <Mail className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={t("dashboard.mail.actions.moveToTrash")}
                      disabled={pendingMessageAction?.startsWith(selectedMessage.id)}
                      onClick={() => void handleMessageAction(selectedMessage, "trash")}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </header>

              <div className="flex-1 px-5 py-6 md:px-8">
                <div className="max-w-3xl whitespace-pre-wrap text-sm leading-6 text-zinc-700 dark:text-zinc-300">
                  {selectedMessage.body ||
                    selectedMessage.snippet ||
                    t("dashboard.mail.fallbacks.noBody")}
                </div>
              </div>

              <footer className="border-t border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    className="gap-2"
                    onClick={() => {
                      setComposeForm({
                        recipients: getSenderEmail(
                          selectedMessage,
                          t("dashboard.mail.fallbacks.noEmailAddress"),
                        ),
                        subject: selectedMessage.subject?.startsWith("Re:")
                          ? selectedMessage.subject
                          : `Re: ${selectedMessage.subject || ""}`,
                        body: "",
                        classId:
                          composeForm.classId ||
                          (classes[0]?.class_id.toString() ?? ""),
                        classlist:
                          composeForm.classlist ||
                          (classes[0] ? getClassLabel(classes[0]) : ""),
                      });
                      setSendStatus(null);
                      setComposeOpen(true);
                    }}
                  >
                    <Reply className="size-4" />
                    {t("dashboard.mail.actions.reply")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    disabled={pendingMessageAction?.startsWith(selectedMessage.id)}
                    onClick={() =>
                      void handleMessageAction(selectedMessage, "archive")
                    }
                  >
                    <Archive className="size-4" />
                    {t("dashboard.mail.actions.archive")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    title={
                      selectedMessage.label_ids.includes("STARRED")
                        ? t("dashboard.mail.actions.removeStar")
                        : t("dashboard.mail.actions.starMessage")
                    }
                    disabled={pendingMessageAction?.startsWith(selectedMessage.id)}
                    onClick={() =>
                      void handleMessageAction(
                        selectedMessage,
                        selectedMessage.label_ids.includes("STARRED")
                          ? "unstar"
                          : "star",
                      )
                    }
                  >
                    <Star
                      className={cn(
                        "size-4",
                        selectedMessage.label_ids.includes("STARRED")
                          ? "fill-amber-400 text-amber-500"
                          : "text-zinc-500",
                      )}
                    />
                  </Button>
                </div>
              </footer>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
              {t("dashboard.mail.states.selectMessage")}
            </div>
          )}
        </article>
      </div>

      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-2xl bg-white dark:bg-zinc-900 dark:text-white">
          <DialogHeader>
            <DialogTitle>{t("dashboard.mail.compose.title")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.mail.compose.description")}
            </DialogDescription>
          </DialogHeader>

          <form className="grid gap-4" onSubmit={handleComposeSubmit}>
            <label className="grid gap-2 text-sm font-medium">
              {t("dashboard.mail.compose.additionalRecipients")}
              <Input
                value={composeForm.recipients}
                onChange={(event) =>
                  setComposeForm((form) => ({
                    ...form,
                    recipients: event.target.value,
                  }))
                }
                placeholder={t("dashboard.mail.compose.recipientsPlaceholder")}
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              {t("dashboard.mail.compose.classList")}
              <select
                value={composeForm.classId}
                onChange={(event) =>
                  setComposeForm((form) => {
                    const selectedClass = classes.find(
                      (classRecord) =>
                        classRecord.class_id.toString() === event.target.value,
                    );

                    return {
                      ...form,
                      classId: event.target.value,
                      classlist: selectedClass ? getClassLabel(selectedClass) : "",
                    };
                  })
                }
                className="h-8 w-full rounded-lg border border-zinc-200 bg-white px-2.5 text-sm outline-none transition-colors focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                required
                disabled={classes.length === 0}
              >
                <option value="">
                  {classes.length === 0
                    ? t("dashboard.mail.compose.noClasses")
                    : t("dashboard.mail.compose.selectClass")}
                </option>
                {classes.map((classRecord) => {
                  const label = getClassLabel(classRecord);
                  return (
                    <option
                      key={classRecord.class_id}
                      value={classRecord.class_id}
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>

            {classesError ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                {classesError}
              </div>
            ) : null}

            <label className="grid gap-2 text-sm font-medium">
              {t("dashboard.mail.compose.subject")}
              <Input
                value={composeForm.subject}
                onChange={(event) =>
                  setComposeForm((form) => ({
                    ...form,
                    subject: event.target.value,
                  }))
                }
                placeholder={t("dashboard.mail.compose.subjectPlaceholder")}
                required
              />
            </label>

            <label className="grid gap-2 text-sm font-medium">
              {t("dashboard.mail.compose.message")}
              <textarea
                value={composeForm.body}
                onChange={(event) =>
                  setComposeForm((form) => ({
                    ...form,
                    body: event.target.value,
                  }))
                }
                className="min-h-40 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none transition-colors placeholder:text-zinc-400 focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:focus:border-zinc-600"
                placeholder={t("dashboard.mail.compose.messagePlaceholder")}
                required
              />
            </label>

            {sendStatus ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                {sendStatus}
              </div>
            ) : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setComposeOpen(false)}
              >
                {t("dashboard.mail.actions.cancel")}
              </Button>
              <Button type="submit" className="gap-2" disabled={isSending}>
                {isSending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                {t("dashboard.mail.actions.sendEmail")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
