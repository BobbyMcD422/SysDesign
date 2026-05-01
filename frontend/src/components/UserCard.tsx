import { AlertDialogDestructive } from "./AlertDialogDestructive";
import { useAuth } from "@/lib/auth-context";
import { useTranslation } from "react-i18next";

type User = {
  id: number;
  fname: string;
  lname: string;
  email: string;
  role: string;
};

export function UserCard({
  user,
  onDeleted,
}: {
  user: User;
  onDeleted: (userId: number) => void;
}) {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const isCurrentUser = currentUser?.id === user.id;

  return (
    <div className="rounded-lg border p-4 shadow-sm space-y-2.5">
      <div className="items-center flex justify-between">
        <h2 className="font-semibold">
          {user.fname} {user.lname}
        </h2>
        <AlertDialogDestructive
          user={user}
          onDeleted={onDeleted}
          disabled={isCurrentUser}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {t("manageUsers.card.email")}: {user.email}
      </p>
      <p className="text-sm">
        {t("manageUsers.card.role")}: {user.role}
      </p>
      {isCurrentUser ? (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {t("manageUsers.card.selfDeleteDisabled")}
        </p>
      ) : null}
    </div>
  );
}
