import Link from "next/link";
import { Github, Twitter, Linkedin, Mail, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import { iconBox, rh } from "@/lib/remote-hub";
import { cn } from "@/lib/utils";

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
    <footer className="border-t border-border bg-background">
      <div className="px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Top CTA strip */}
          <div className={cn(rh.card, "mb-12 p-6 sm:p-8")}>
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-4 sm:items-center">
                <div className={iconBox("lg")}>
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <h3 className={rh.h2}>Not sure which tier fits you?</h3>
                  <p className="text-sm text-muted-foreground">
                    Chat with the AI advisor and get a personalised recommendation in minutes.
                  </p>
                </div>
              </div>
              <Link
                href="/advisor"
                className={cn(buttonVariants({ size: "default" }), "group shrink-0 gap-2")}
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
                    className="flex size-10 items-center justify-center rounded-xl border border-border bg-card transition-colors hover:border-foreground/20 hover:bg-muted"
                  >
                    <social.icon className="size-4 text-muted-foreground" />
                  </a>
                ))}
              </div>
            </div>

            <div className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
              <FooterColumn title="Product" links={footerLinks.product} />
              <FooterColumn title="Company" links={footerLinks.company} />
              <FooterColumn title="Legal" links={footerLinks.legal} />
            </div>
          </div>

          <Separator className="my-10" />

          <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
            <p>&copy; {new Date().getFullYear()} Planet OCR. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
              <span className={rh.statusLive}>
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
                </span>
                All systems operational
              </span>
              <span className={rh.badge}>
                <ShieldCheck className="size-3.5" />
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
  links,
}: {
  title: string;
  links: { label: string; href: string }[];
}) {
  return (
    <div>
      <h3 className={cn(rh.label, "mb-4")}>{title}</h3>
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
