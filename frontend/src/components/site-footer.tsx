import Link from "next/link";
import { Github, Twitter, Linkedin, Mail, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/logo";

const footerLinks = {
  product: [
    { label: "OCR Advisor", href: "/advisor" },
    { label: "API Docs",    href: "/docs" },
    { label: "Pricing",     href: "/pricing" },
    { label: "Testing",     href: "/testing" },
    { label: "Dashboard",   href: "/dashboard" },
  ],
  company: [
    { label: "About",    href: "#" },
    { label: "Blog",     href: "#" },
    { label: "Careers",  href: "#" },
    { label: "Contact",  href: "#" },
  ],
  legal: [
    { label: "Privacy Policy",   href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Security",         href: "#" },
    { label: "Compliance",       href: "#" },
  ],
};

const socialLinks = [
  { icon: Github,   href: "#",                            label: "GitHub" },
  { icon: Twitter,  href: "#",                            label: "Twitter" },
  { icon: Linkedin, href: "#",                            label: "LinkedIn" },
  { icon: Mail,     href: "mailto:hello@planetocr.com",  label: "Email" },
];

export function SiteFooter() {
  return (
    <footer
      className="border-t"
      style={{ borderColor: "rgb(var(--border))", background: "rgb(var(--surface-1))" }}
    >
      <div className="mx-auto max-w-[1080px] px-6 py-14">
        <div className="grid gap-12 lg:grid-cols-12">
          {/* Brand col */}
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-5 max-w-xs text-sm leading-relaxed" style={{ color: "rgb(var(--text-2))" }}>
              Document intelligence that routes to the best OCR engine — on your actual data.
              Built for accuracy, transparency, and scale.
            </p>
            <div className="mt-6 flex gap-2.5">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex size-9 items-center justify-center rounded-lg border border-[rgb(var(--border-strong))] text-[rgb(var(--text-2))] transition-colors hover:border-[rgb(var(--teal))] hover:text-[rgb(var(--teal))]"
                >
                  <social.icon className="size-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          <div className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
            {Object.entries(footerLinks).map(([key, links]) => (
              <div key={key}>
                <h3 className="mb-4 font-mono text-[10px] uppercase tracking-[1px]" style={{ color: "rgb(var(--teal))" }}>
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </h3>
                <ul className="space-y-2.5">
                  {links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-sm text-[rgb(var(--text-2))] transition-colors hover:text-[rgb(var(--text-1))]"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom strip */}
        <div
          className="mt-10 flex flex-col items-center justify-between gap-3 border-t pt-8 text-sm sm:flex-row"
          style={{ borderColor: "rgb(var(--border))", color: "rgb(var(--text-3))" }}
        >
          <p>&copy; {new Date().getFullYear()} Planet OCR. All rights reserved.</p>
          <div className="flex flex-wrap items-center gap-3 font-mono text-[11px]">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{
                background: "rgb(var(--green-bg))",
                color: "rgb(var(--green))",
                border: "0.5px solid rgb(var(--green-border))",
              }}
            >
              <span className="size-1.5 rounded-full animate-pulse" style={{ background: "rgb(var(--green))" }} />
              All systems operational
            </span>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1"
              style={{
                background: "rgb(var(--surface-2))",
                color: "rgb(var(--text-2))",
                border: "0.5px solid rgb(var(--border-strong))",
              }}
            >
              <ShieldCheck className="size-3" style={{ color: "rgb(var(--teal))" }} />
              SOC 2 Certified
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
