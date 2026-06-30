type ProfileAvatarProps = {
  email?: string | null;
  size?: "small" | "large";
};

export default function ProfileAvatar({ email, size = "small" }: ProfileAvatarProps) {
  const initial = email?.charAt(0).toUpperCase() ?? "U";

  const sizeClass =
    size === "large"
      ? "h-28 w-28 text-5xl"
      : "h-14 w-14 text-xl";

  return (
    <div
      className={`${sizeClass} flex items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 font-black text-white shadow-lg shadow-violet-500/30`}
    >
      {initial}
    </div>
  );
}