"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CalendarClock,
  MessageSquareText,
  Send,
} from "lucide-react";

export function NavLinks() {
  const pathname = usePathname();

  const isOverview = pathname === "/";
  const isParticipants =
    pathname.startsWith("/participants") || pathname.startsWith("/mothers");
  const isAppointments =
    pathname.startsWith("/appointments") || pathname.startsWith("/visits");
  const isMessages = pathname.startsWith("/messages");
  const isOutbox =
    pathname.startsWith("/outbox") || pathname.startsWith("/activity");

  const items = [
    { href: "/", label: "Today & overview", active: isOverview, Icon: LayoutDashboard },
    { href: "/participants", label: "Mothers registry", active: isParticipants, Icon: Users },
    { href: "/appointments", label: "Clinical visits", active: isAppointments, Icon: CalendarClock },
    { href: "/messages", label: "Message bank (78)", active: isMessages, Icon: MessageSquareText },
    { href: "/outbox", label: "SMS activity log", active: isOutbox, Icon: Send },
  ];

  return (
    <nav className="main-navbar" aria-label="Primary clinical navigation">
      <div className="nav-scroll-row">
        <ul className="nav-list">
          {items.map(({ href, label, active, Icon }) => (
            <li key={href}>
              <Link className={`nav-link-item ${active ? "active" : ""}`} href={href}>
                <Icon size={16} strokeWidth={2} />
                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>

        <div className="nav-calendar-badge d-none d-lg-flex">
          Dual calendar: <strong>ዓ.ም (E.C.) &amp; G.C.</strong>
        </div>
      </div>
    </nav>
  );
}
