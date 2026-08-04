import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { useSession } from "@/lib/session";
import { MessagesInbox } from "@/components/chat/MessagesInbox";

export const Route = createFileRoute("/_authenticated/worker/messages")({
  head: () => ({ meta: [{ title: "Messages — EventOrbit AI" }, { name: "robots", content: "noindex" }] }),
  component: MessagesPage,
});

function MessagesPage() {
  const { user } = useSession();
  return (
    <div className="space-y-6">
      <h1 className="flex items-center gap-2 text-2xl md:text-3xl font-bold tracking-tight">
        <MessageCircle className="h-7 w-7 text-brand-violet" /> Messages
      </h1>
      {user?.id && <MessagesInbox userId={user.id} />}
    </div>
  );
}
