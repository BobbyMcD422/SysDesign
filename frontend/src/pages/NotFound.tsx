import Error from "@/assets/page-not-found.svg"
import { Link } from "react-router"
import { Button } from "@/components/ui/button"

export default function NotFound() {
    return(
        <div className="flex flex-col items-center justify-center gap-4">
            <img
                src={Error}
                alt="Page not found illustration"
                className="w-64 object-contain dark:brightness-[0.6]"
            />
            <h1 className="text-3xl">Page Not Found</h1>
            <Link to="/" className="text-slate-700 dark:text-blue-300">
                <Button variant="outline">Return Home</Button>
            </Link>
        </div>
    )
}
