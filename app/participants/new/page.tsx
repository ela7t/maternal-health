import Link from "next/link";
import prisma from "@/lib/prisma";
import { RegisterMotherForm } from "./RegisterMotherForm";
import { gregorianToEthiopian } from "@/lib/ethiopianCalendar";

export const dynamic = "force-dynamic";

export default async function RegisterMotherPage() {
  const facilities = await prisma.facility.findMany({
    orderBy: { name: "asc" },
  });

  const todayEth = gregorianToEthiopian(new Date());

  return (
    <div className="row justify-content-center">
      <div className="col-lg-9 col-xl-8">
        {/* Breadcrumb / Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <Link
              href="/participants"
              className="text-secondary small text-decoration-none d-flex align-items-center gap-1 mb-1"
            >
              <i className="bi bi-arrow-left"></i> Back to Mothers Registry
            </Link>
            <h3 className="fw-bold mb-0 text-slate-900">Register Pregnant Mother</h3>
          </div>
          <span className="badge bg-light text-dark border px-3 py-2 small">
            <i className="bi bi-hospital text-teal me-1" style={{ color: "var(--app-primary)" }}></i> Wolkite & Jimma Protocol
          </span>
        </div>

        <div className="card-custom p-4 p-md-5">
          <RegisterMotherForm facilities={facilities} todayEth={todayEth} />
        </div>
      </div>
    </div>
  );
}
