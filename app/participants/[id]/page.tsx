import Link from "next/link";
import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import {
  calculateGestationalAge,
  calculatePostnatalAge,
  formatEthiopianDate,
  gregorianToEthiopian,
} from "@/lib/ethiopianCalendar";
import { ParticipantActions } from "./ParticipantActions";

export const dynamic = "force-dynamic";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ParticipantShowPage({ params }: Props) {
  const { id } = await params;

  const numId = parseInt(id, 10);
  if (isNaN(numId)) {
    notFound();
  }

  const participant = await prisma.participant.findUnique({
    where: { id: numId },
    include: {
      facility: true,
      phones: true,
      pregnancies: {
        orderBy: { id: "desc" },
        include: { babies: true },
      },
      appointments: {
        orderBy: { scheduledFor: "desc" },
      },
      outboxMessages: {
        orderBy: { scheduledAt: "desc" },
        take: 20,
      },
    },
  });

  if (!participant) {
    notFound();
  }

  const pregnancy = participant.pregnancies[0];
  const primaryPhone =
    participant.phones.find((p) => p.isPrimary) || participant.phones[0];

  let gaInfo = null;
  let eddEth = null;
  if (pregnancy?.eddDate) {
    gaInfo = calculateGestationalAge(pregnancy.eddDate);
    const eth = gregorianToEthiopian(pregnancy.eddDate);
    eddEth = {
      formatted_am: formatEthiopianDate(eth, "am"),
      formatted_en: formatEthiopianDate(eth, "en"),
      month_name_en: eth.month,
    };
  }

  return (
    <>
      {/* Patient Header */}
      <div className="card-custom p-4 mb-4">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3">
          <div className="d-flex align-items-center gap-3">
            <div className="patient-avatar fs-4" style={{ width: 52, height: 52 }}>
              {participant.fullName ? participant.fullName.charAt(0) : "M"}
            </div>
            <div>
              <div className="d-flex align-items-center gap-2">
                <h3 className="fw-bold mb-0 text-slate-900">{participant.fullName}</h3>
                <span className="badge bg-light text-secondary border font-monospace">
                  {participant.publicCode}
                </span>
              </div>
              <div className="text-secondary small mt-1">
                <i className="bi bi-geo-alt me-1"></i> {participant.facility.name} &bull;{" "}
                {participant.kebele} &bull; Enrolled:{" "}
                {participant.enrolledAt.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>

          {/* Clinical State & Action Buttons */}
          <div className="d-flex align-items-center gap-2">
            <ParticipantActions
              participantId={String(participant.id)}
              status={participant.status}
              facilityName={participant.facility.name}
            />
            <Link
              href="/participants"
              className="btn btn-outline-secondary btn-sm d-flex align-items-center gap-1"
            >
              <i className="bi bi-arrow-left"></i> Registry
            </Link>
          </div>
        </div>

        {/* Longitudinal Maternity Stepper */}
        <div className="mt-4 pt-3 border-top">
          <div className="stepper-container">
            <div
              className={`step-item ${gaInfo && gaInfo.trimester >= 1 ? "completed" : ""}`}
            >
              <span className="step-dot">1</span>
              <span className="step-label">
                1st Trimester
                <br />
                <small className="text-muted">(1–13 wks)</small>
              </span>
            </div>
            <div
              className={`step-item ${
                gaInfo && gaInfo.trimester === 2
                  ? "active"
                  : gaInfo && gaInfo.trimester > 2 || participant.status === "postnatal"
                  ? "completed"
                  : ""
              }`}
            >
              <span className="step-dot">2</span>
              <span className="step-label">
                2nd Trimester
                <br />
                <small className="text-muted">(14–27 wks)</small>
              </span>
            </div>
            <div
              className={`step-item ${
                gaInfo && gaInfo.trimester === 3 && participant.status === "active_pregnant"
                  ? "active"
                  : ["postnatal", "completed"].includes(participant.status)
                  ? "completed"
                  : ""
              }`}
            >
              <span className="step-dot">3</span>
              <span className="step-label">
                3rd Trimester
                <br />
                <small className="text-muted">(28–40 wks)</small>
              </span>
            </div>
            <div
              className={`step-item ${
                participant.status === "postnatal"
                  ? "active"
                  : participant.status === "completed"
                  ? "completed"
                  : ""
              }`}
            >
              <span className="step-dot">
                <i className="bi bi-heart-pulse-fill"></i>
              </span>
              <span className="step-label">
                Postnatal Care
                <br />
                <small className="text-muted">(Day 1–42)</small>
              </span>
            </div>
            <div
              className={`step-item ${participant.status === "completed" ? "completed" : ""}`}
            >
              <span className="step-dot">
                <i className="bi bi-check-lg"></i>
              </span>
              <span className="step-label">
                Graduated
                <br />
                <small className="text-muted">(6 Weeks)</small>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Clinical Obstetric Card + Contact Card */}
      <div className="row g-4 mb-4">
        {/* Clinical Obstetric Card */}
        <div className="col-lg-7">
          <div className="card-custom p-4 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
              <i
                className="bi bi-clipboard2-pulse text-teal"
                style={{ color: "var(--app-primary)" }}
              ></i>
              <span>Obstetric & Gestational Profile</span>
            </h5>

            {pregnancy ? (
              <div className="row g-3">
                <div className="col-sm-6">
                  <div className="p-3 rounded border bg-light">
                    <span className="text-secondary small fw-medium">Estimated Due Date (GC)</span>
                    <div className="fs-4 fw-bold text-slate-900 mt-1">
                      {pregnancy.eddDate
                        ? pregnancy.eddDate.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                    <small className="text-muted">Calculated via Naegele&apos;s rule (LMP + 280d)</small>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="p-3 rounded border bg-light">
                    <span className="text-secondary small fw-medium">EDD in Ethiopian Calendar (ዓ.ም)</span>
                    <div
                      className="fs-4 fw-bold text-teal mt-1"
                      style={{ color: "var(--app-primary)" }}
                    >
                      {eddEth?.formatted_am || "—"}
                    </div>
                    <small className="text-muted">({eddEth?.formatted_en || "—"})</small>
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="p-3 rounded border bg-light">
                    <span className="text-secondary small fw-medium">Gestational Age Status</span>
                    {gaInfo ? (
                      <>
                        <div className="fs-5 fw-bold text-primary mt-1">{gaInfo.formatted}</div>
                        <span className="badge bg-primary-subtle text-primary border border-primary-subtle small mt-1">
                          Trimester {gaInfo.trimester} Active
                        </span>
                      </>
                    ) : (
                      <div className="text-muted mt-1">—</div>
                    )}
                  </div>
                </div>

                <div className="col-sm-6">
                  <div className="p-3 rounded border bg-light">
                    <span className="text-secondary small fw-medium">Clinical Risk Assessment</span>
                    <div className="fs-5 fw-bold text-slate-900 mt-1 text-capitalize">
                      {pregnancy.riskStatus || "Standard"} Risk
                    </div>
                    <small className="text-muted">
                      Dating Method: {(pregnancy.datingMethod || "lmp").toUpperCase()}
                    </small>
                  </div>
                </div>

                {pregnancy.deliveredAt && (
                  <div className="col-12">
                    <div className="p-3 rounded border border-success-subtle bg-success-subtle bg-opacity-25">
                      <div className="d-flex align-items-center gap-2 text-success fw-bold">
                        <i className="bi bi-gift-fill fs-5"></i> Delivery Event Confirmed
                      </div>
                      <div className="mt-1 text-dark small">
                        Delivered on{" "}
                        <strong>
                          {pregnancy.deliveredAt.toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </strong>{" "}
                        at <strong>{pregnancy.deliveryPlace || "Facility"}</strong>.
                      </div>
                      {pregnancy.babies.map((baby) => (
                        <div key={baby.id} className="badge bg-success text-white mt-2 px-3 py-1 me-2">
                          <i className="bi bi-person-heart me-1"></i> {baby.name || "Baby"} (
                          {baby.babyCode})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-muted small">No active pregnancy registered.</div>
            )}
          </div>
        </div>

        {/* Contact & Message Configuration Card */}
        <div className="col-lg-5">
          <div className="card-custom p-4 h-100">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark">
              <i
                className="bi bi-telephone text-teal"
                style={{ color: "var(--app-primary)" }}
              ></i>
              <span>Contact & Automated Delivery</span>
            </h5>

            <ul className="list-unstyled mb-0">
              <li className="p-3 rounded border bg-light mb-3">
                <span className="text-secondary small fw-medium">Delivery Phone Number</span>
                <div className="fs-5 fw-bold text-slate-900 mt-1">
                  {primaryPhone ? primaryPhone.numberE164 : "No phone recorded"}
                </div>
                <div className="d-flex gap-2 mt-2">
                  <span className="badge bg-white text-dark border small text-capitalize">
                    Device Owner: {primaryPhone?.ownerType || "Unknown"}
                  </span>
                  <span className="badge bg-white text-success border small">
                    <i className="bi bi-shield-check"></i> Non-diagnostic SMS
                  </span>
                </div>
              </li>

              <li className="p-3 rounded border bg-light mb-3">
                <span className="text-secondary small fw-medium">Language & Message Tone</span>
                <div className="fw-bold text-dark mt-1">
                  {participant.preferredLanguage === "am"
                    ? "Amharic (አማርኛ)"
                    : participant.preferredLanguage === "gurage"
                    ? "Gurage"
                    : "English"}
                </div>
                <div className="text-muted small mt-1">
                  Tone:{" "}
                  {participant.studyArm === "intervention_gain"
                    ? "Gain-framed (Encouraging benefits)"
                    : "Loss-framed (Risk awareness)"}
                </div>
              </li>

              <li className="p-3 rounded border bg-light">
                <span className="text-secondary small fw-medium">Assigned Health Facility</span>
                <div className="fw-bold text-dark mt-1">{participant.facility.name}</div>
                <small className="text-secondary">
                  {participant.facility.woreda}, {participant.facility.zone} Zone
                </small>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Tables: Checkups & Dispatched SMS History */}
      <div className="card-custom overflow-hidden mb-4">
        <div className="card-header-clean bg-light">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-calendar-check text-teal" style={{ color: "var(--app-primary)" }}></i>
            <span className="fw-bold text-dark">Checkups & Visits ({participant.appointments.length})</span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>Visit Type</th>
                <th>Scheduled Date</th>
                <th>Status</th>
                <th>Recorded By</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {participant.appointments.map((apt) => (
                <tr key={apt.id}>
                  <td>
                    <span className="badge bg-light text-dark border">{apt.kind.toUpperCase()}</span>
                  </td>
                  <td className="fw-bold text-slate-900">
                    {apt.scheduledFor.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td>
                    {apt.status === "attended" && (
                      <span className="badge-clinical postnatal">
                        <i className="bi bi-check2"></i> Attended
                      </span>
                    )}
                    {apt.status === "missed" && (
                      <span className="badge-clinical missed">
                        <i className="bi bi-exclamation-triangle"></i> Missed
                      </span>
                    )}
                    {apt.status === "rescheduled" && (
                      <span className="badge-clinical opted-out">
                        <i className="bi bi-arrow-repeat"></i> Rescheduled
                      </span>
                    )}
                    {apt.status === "scheduled" && (
                      <span className="badge-clinical pregnant">
                        <i className="bi bi-clock"></i> Scheduled
                      </span>
                    )}
                  </td>
                  <td className="text-secondary small">{apt.recordedBy || "System"}</td>
                  <td className="text-secondary small">{apt.notes || "Routine Checkup"}</td>
                </tr>
              ))}
              {participant.appointments.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center text-muted py-4">
                    No visits scheduled yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dispatched SMS History */}
      <div className="card-custom overflow-hidden mb-4">
        <div className="card-header-clean bg-light">
          <div className="d-flex align-items-center gap-2">
            <i className="bi bi-chat-left-text text-teal" style={{ color: "var(--app-primary)" }}></i>
            <span className="fw-bold text-dark">
              Dispatched SMS Log ({participant.outboxMessages.length})
            </span>
          </div>
        </div>

        <div className="table-responsive">
          <table className="table table-custom">
            <thead>
              <tr>
                <th>SMS Content</th>
                <th>Segments</th>
                <th>Status</th>
                <th>Sent Time</th>
              </tr>
            </thead>
            <tbody>
              {participant.outboxMessages.map((msg) => (
                <tr key={msg.id}>
                  <td style={{ maxWidth: 480 }}>
                    <div className="small text-dark">{msg.messageContent}</div>
                  </td>
                  <td>
                    <span className="badge bg-light text-dark border small">
                      {msg.segments} seg
                    </span>
                  </td>
                  <td>
                    {["sent", "delivered", "submitted"].includes(msg.status) && (
                      <span className="badge-clinical postnatal">
                        <i className="bi bi-check2"></i> Delivered
                      </span>
                    )}
                    {msg.status === "pending" && (
                      <span className="badge-clinical opted-out">Queued</span>
                    )}
                    {msg.status === "cancelled" && (
                      <span className="badge-clinical completed">Cancelled</span>
                    )}
                    {msg.status === "failed" && (
                      <span className="badge-clinical missed">Failed</span>
                    )}
                  </td>
                  <td className="text-secondary small">
                    {(msg.sentAt || msg.scheduledAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
              {participant.outboxMessages.length === 0 && (
                <tr>
                  <td colSpan={4} className="text-center text-muted py-4">
                    No automated messages dispatched yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
