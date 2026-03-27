export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#edeef3] dark:bg-[#0f172a]">
      {children}
    </div>
  );
}
