"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks() {
  const pathname = usePathname();

  const isOverview = pathname === "/";
  const isParticipants = pathname.startsWith("/participants") || pathname.startsWith("/mothers");
  const isAppointments = pathname.startsWith("/appointments") || pathname.startsWith("/visits");
  const isMessages = pathname.startsWith("/messages");
  const isOutbox = pathname.startsWith("/outbox") || pathname.startsWith("/activity");

  return (
    <nav className="main-navbar navbar navbar-expand-md navbar-dark">
      <div className="container-fluid px-0">
        <div className="collapse navbar-collapse show" id="mnhNav">
          <ul className="navbar-nav me-auto">
            <li className="nav-item">
              <Link className={`nav-link ${isOverview ? "active" : ""}`} href="/">
                <i className="bi bi-grid-1x2-fill me-1"></i> Overview
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isParticipants ? "active" : ""}`} href="/participants">
                <i className="bi bi-people-fill me-1"></i> Mothers Registry
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isAppointments ? "active" : ""}`} href="/appointments">
                <i className="bi bi-calendar-week-fill me-1"></i> Clinical Visits
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isMessages ? "active" : ""}`} href="/messages">
                <i className="bi bi-chat-heart-fill me-1"></i> Message Bank (78)
              </Link>
            </li>
            <li className="nav-item">
              <Link className={`nav-link ${isOutbox ? "active" : ""}`} href="/outbox">
                <i className="bi bi-send-check-fill me-1"></i> SMS Activity Log
              </Link>
            </li>
          </ul>

          <div className="d-flex align-items-center py-2 text-slate-300 small">
            <span className="text-light opacity-75">
              Dual Calendar: <strong>ዓ.ም (E.C.) &amp; G.C.</strong>
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
