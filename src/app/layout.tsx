import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'English Reading Lab',
  description: '词书驱动的每日英语阅读生成与词汇巩固系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">
        <div className="flex flex-col min-h-screen">
          <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
              <a href="/" className="flex items-center gap-2">
                <span className="text-xl font-bold text-[var(--color-primary)]">
                  English Reading Lab
                </span>
              </a>
              <nav className="flex items-center gap-1">
                <NavLink href="/" label="首页" />
                <NavLink href="/today" label="今日阅读" />
                <NavLink href="/vocab" label="词书" />
                <NavLink href="/review" label="复习" />
                <NavLink href="/history" label="历史" />
                <NavLink href="/settings" label="设置" />
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="px-3 py-2 text-sm text-gray-600 hover:text-[var(--color-primary)] hover:bg-green-50 rounded-md transition-colors"
    >
      {label}
    </a>
  );
}
