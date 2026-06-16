import Link from "next/link";
import { Github, Twitter, Linkedin, Mail } from "lucide-react";
import { Logo } from "@/components/logo";
import { Separator } from "@/components/ui/separator";

const footerLinks = {
  product: [
    { label: "OCR Advisor", href: "/advisor" },
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
    <footer className="border-t border-border bg-muted/30">
      <div className="px-4 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Logo />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-muted-foreground">
              Document intelligence that recommends the right OCR tier — and proves it on your data.
              Built for accuracy, transparency, and scale.
            </p>
            <div className="mt-6 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="flex size-10 items-center justify-center rounded-lg border border-border bg-background transition-all hover:border-primary hover:bg-primary/5 hover:scale-110"
                >
                  <social.icon className="size-5 text-muted-foreground" />
                </a>
              ))}
            </div>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 lg:col-span-8">
            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Product</h3>
              <ul className="space-y-3">
                {footerLinks.product.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Company</h3>
              <ul className="space-y-3">
                {footerLinks.company.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-foreground">Legal</h3>
              <ul className="space-y-3">
                {footerLinks.legal.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        <Separator className="my-10" />

        <div className="flex flex-col items-center justify-between gap-4 text-sm text-muted-foreground sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Planet OCR. All rights reserved.</p>
          <div className="flex gap-6 text-xs">
            <span className="flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-green-500"></span>
              All systems operational
            </span>
            <span>Secure processing</span>
            <span>SOC 2 Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
