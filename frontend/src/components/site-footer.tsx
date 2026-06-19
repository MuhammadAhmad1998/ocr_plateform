import Link from "next/link";
import { Github, Twitter, Linkedin, Mail, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  product: [
    { label: "OCR Advisor", href: "/advisor" },
    { label: "API Docs", href: "/docs" },
    { label: "Pricing", href: "/pricing" },
    { label: "Testing", href: "/testing" },
    { label: "Dashboard", href: "/dashboard" },
  ],
  company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
    { label: "Contact", href: "#" },
  ],
  legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "Security", href: "#" },
    { label: "Compliance", href: "#" },
  ],
};

const socialLinks = [
  { icon: Github, href: "#", label: "GitHub" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Linkedin, href: "#", label: "LinkedIn" },
  { icon: Mail, href: "mailto:hello@planetocr.com", label: "Email" },
];

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden border-t border-border/60 bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="pointer-events-none absolute -left-32 top-0 size-96 rounded-full bg-indigo-500/8 blur-3xl" />
      <div className="pointer-events-none absolute -right-32 bottom-0 size-96 rounded-full bg-fuchsia-500/8 blur-3xl" />

      <div className="relative px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Top CTA strip */}
          <div className="mb-12 overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-6 shadow-sm backdrop-blur sm:p-8">
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-4 sm:items-center">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 via-fuchsia-500 to-amber-500 text-white shadow-lg shadow-fuchsia-500/30">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    Not sure which tier fits you?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Chat with the AI advisor and get a personalised recommendation in minutes.
                  </p>
                </div>
              </div>
              <Link
                href="/advisor"
                className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-bold text-background shadow-md transition-all hover:scale-[1.02] hover:opacity-90"
              >
                Try Advisor
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>

          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <Logo />
              <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
                Document intelligence that recommends the right OCR tier — and proves it on
                your data. Built for accuracy, transparency, and scale.
              </p>
              <div className="mt-6 flex gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.label}
                    href={social.href}
                    aria-label={social.label}
                    className="group flex size-10 items-center justify-center rounded-xl border border-border/70 bg-background/60 backdrop-blur transition-all hover:-translate-y-0.5 hover:border-fuchsia-500/50 hover:bg-fuchsia-500/5 hover:shadow-md"
                  >
                    <social.icon className="size-4 text-muted-foreground transition-colors group-hover:text-fuchsia-500" />
                  </a>
                ))}
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
              <FooterColumn
                title="Product"
                accent="text-indigo-600 dark:text-indigo-400"
                links={footerLinks.product}
              />
              <FooterColumn
                title="Company"
                accent="text-fuchsia-600 dark:text-fuchsia-400"
                links={footerLinks.company}
              />
              <FooterColumn
                title="Legal"
                accent="text-amber-600 dark:text-amber-400"
                links={footerLinks.legal}
              />
            </div>
          </div>

          <Separator className="my-10" />

          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>&copy; {new Date().getFullYear()} Planet OCR. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-500" />
                </span>
                All systems operational
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 font-semibold backdrop-blur">
                <ShieldCheck className="size-3.5 text-cyan-500" />
                SOC 2 Certified
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({
  title,
  accent,
  links,
}: {
  title: string;
  accent: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className={`mb-4 text-xs font-extrabold uppercase tracking-wider ${accent}`}>
        {title}
      </h3>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.label}>
            <Link
              href={link.href}
              className="group inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <span className="transition-transform group-hover:translate-x-0.5">
                {link.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
