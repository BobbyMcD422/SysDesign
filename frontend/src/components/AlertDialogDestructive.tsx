import { Trash2Icon } from "lucide-react"
import { Trash } from "lucide-react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

type User = {
  id: number
  fname: string
  lname: string
  email: string
  role: string
}

type AlertDialogDestructiveProps = {
  user: User
  onDeleted: (userId: number) => void
  disabled?: boolean
}

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000"

export function AlertDialogDestructive({
  user,
  onDeleted,
  disabled = false,
}: AlertDialogDestructiveProps) {
  async function handleDeleteUser() {
    const res = await fetch(`${API_BASE_URL}/api/users/${user.id}`, {
      method: "DELETE",
      credentials: "include",
    })

    if (!res.ok) {
      const errorData = await res.json().catch(() => null)
      throw new Error(errorData?.detail || "Failed to delete instructor")
    }

    onDeleted(user.id)
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="destructive"
          className="text-red-500"
          disabled={disabled}
          title={disabled ? "You cannot delete your own account" : "Delete instructor"}
        >
          <Trash size="15px"/>
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent size="sm" className="bg-gray-200 dark:bg-zinc-800 dark:text-white">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive">
            <Trash2Icon />
          </AlertDialogMedia>
          <AlertDialogTitle>Delete Instructor?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete {user.fname} {user.lname}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel variant="outline">Cancel</AlertDialogCancel>
          <AlertDialogAction 
            variant="destructive" 
            className="text-red-500"
            onClick={() => void handleDeleteUser()}
            >
              Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
