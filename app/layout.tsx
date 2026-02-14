import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#0f0f0f] text-white antialiased flex flex-col min-h-screen">

        {/* NAVBAR */}
        <header className="border-b border-white/10">
          <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="text-xl font-semibold tracking-tight">
              YOUR News
            </div>

            <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
              <a className="hover:text-white transition cursor-pointer">Customization</a>
              <a className="hover:text-white transition cursor-pointer">Settings</a>
              <a className="hover:text-white transition cursor-pointer">Preferences</a>
            </nav>

            <div className="text-white/70 cursor-pointer">🔍</div>
          </div>
        </header>

        {/* PAGE CONTENT */}
        <main className="flex-1">
          {children}
        </main>

        {/* FOOTER */}
        <footer className="border-t border-white/10 mt-20">
          <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-12 text-sm text-white/60">

            {/* Brand */}
            <div className="space-y-4">
              <h3 className="text-white font-semibold text-lg">
                YOUR News
              </h3>
              <p className="leading-relaxed">
                AI-powered personalized news intelligence.
                Designed to eliminate noise and deliver
                structured signal across your preferred channels.
              </p>

              <div className="flex gap-4 text-white/50">
                <span className="hover:text-white cursor-pointer">Twitter</span>
                <span className="hover:text-white cursor-pointer">LinkedIn</span>
                <span className="hover:text-white cursor-pointer">GitHub</span>
              </div>
            </div>

            {/* Product */}
            <div className="space-y-4">
              <h4 className="text-white font-medium">Product</h4>
              <ul className="space-y-2">
                <li className="hover:text-white cursor-pointer">Agent Studio</li>
                <li className="hover:text-white cursor-pointer">Feed Engine</li>
                <li className="hover:text-white cursor-pointer">Voice Delivery</li>
                <li className="hover:text-white cursor-pointer">Channels</li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <h4 className="text-white font-medium">Company</h4>
              <ul className="space-y-2">
                <li className="hover:text-white cursor-pointer">About</li>
                <li className="hover:text-white cursor-pointer">Leadership</li>
                <li className="hover:text-white cursor-pointer">Careers</li>
                <li className="hover:text-white cursor-pointer">Contact</li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="text-white font-medium">Contact</h4>
              <ul className="space-y-2">
                <li>support@yournews.ai</li>
                <li>press@yournews.ai</li>
                <li>+91 00000 00000</li>
              </ul>
            </div>

          </div>

          {/* Bottom Strip */}
          <div className="border-t border-white/10 py-6 text-center text-xs text-white/40">
            © {new Date().getFullYear()} YOUR News. All rights reserved.
          </div>
        </footer>

      </body>
    </html>
  );
}
