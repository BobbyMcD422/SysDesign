import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { BulkUserUploadForm } from "@/components/BulkUserUploadForm";
import { CreateUserForm } from "@/components/CreateUserForm";
import { UserCard } from "@/components/UserCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type User = {
  id: number;
  fname: string;
  lname: string;
  email: string;
  role: string;
};

export default function AdminPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<User[]>([]);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    async function loadUsers() {
      const res = await fetch("http://localhost:8000/api/users/", {
        credentials: "include",
      });
      const data = await res.json();
      setUsers(data);
    }

    loadUsers();
  }, []);

  const renderedUsers = users.map((user) => (
    <UserCard
      key={user.id}
      user={user}
      onDeleted={(userId) =>
        setUsers((prev) => prev.filter((existingUser) => existingUser.id !== userId))
      }
    />
  ));

  return (
    <div className="p-4 leading-4 space-y-2">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">{t("manageUsers.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("manageUsers.subtitle")}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="text-green-600 dark:text-green-500"
            >
              {t("manageUsers.addUser")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md dark:bg-zinc-800 dark:text-white">
            <DialogHeader>
              <DialogTitle>{t("manageUsers.dialog.title")}</DialogTitle>
              <DialogDescription>
                {t("manageUsers.dialog.description")}
              </DialogDescription>
            </DialogHeader>
            <CreateUserForm
              onCreated={(newUser) => setUsers((prev) => [...prev, newUser])}
              onClose={() => setOpen(false)}
            />
          </DialogContent>
        </Dialog>

        <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              {t("manageUsers.bulk.button")}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg dark:bg-zinc-800 dark:text-white">
            <DialogHeader>
              <DialogTitle>{t("manageUsers.bulk.title")}</DialogTitle>
              <DialogDescription>
                {t("manageUsers.bulk.description")}
              </DialogDescription>
            </DialogHeader>
            <BulkUserUploadForm
              onCreated={(newUsers) =>
                setUsers((prev) => [...prev, ...newUsers])
              }
              onClose={() => setBulkOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>
      {renderedUsers}
    </div>
  );
}
