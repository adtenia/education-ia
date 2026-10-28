import { redirect } from "next/navigation";
import { createClient } from "../../utils/supabase/server";
import ControlPreparation from "../../components/ControlPreparation";

export const dynamic = "force-dynamic";

export default async function PrepareControlPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?redirect=/preparer-controle");

  const { data: courses } = await supabase.from("cours")
    .select("id,title,detected_subject,detected_chapter")
    .eq("user_id", user.id).order("created_at", { ascending: false });

  return (
    <main className="min-h-screen bg-[#fbfaff] px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <ControlPreparation courses={courses || []} schoolClass={typeof user.user_metadata?.school_class === "string" ? user.user_metadata.school_class : null} />
      </div>
    </main>
  );
}
