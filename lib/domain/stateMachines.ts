export class DomainError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "DomainError";
    this.statusCode = statusCode;
  }
}

export type ParticipantStatus = "active_pregnant" | "postnatal" | "completed" | "opted_out" | "loss";
export type AppointmentStatus = "scheduled" | "missed" | "attended" | "rescheduled" | "cancelled";
export type OutboxStatus = "pending" | "queued" | "submitted" | "sent" | "delivered" | "failed" | "cancelled";
export type TemplateApprovalStatus = "draft" | "in_review" | "approved" | "retired";

const PARTICIPANT_TRANSITIONS: Record<ParticipantStatus, ParticipantStatus[]> = {
  active_pregnant: ["postnatal", "completed", "opted_out", "loss"],
  postnatal: ["completed", "opted_out", "loss"],
  completed: [],
  opted_out: [],
  loss: [],
};

const APPOINTMENT_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["attended", "missed", "rescheduled", "cancelled"],
  missed: ["attended", "rescheduled", "cancelled"],
  attended: [],
  rescheduled: [],
  cancelled: [],
};

const OUTBOX_TRANSITIONS: Record<OutboxStatus, OutboxStatus[]> = {
  pending: ["queued", "submitted", "sent", "delivered", "failed", "cancelled"],
  queued: ["submitted", "sent", "delivered", "failed", "cancelled"],
  submitted: ["sent", "delivered", "failed"],
  sent: ["delivered", "failed"],
  delivered: [],
  failed: ["queued"],
  cancelled: [],
};

const TEMPLATE_TRANSITIONS: Record<TemplateApprovalStatus, TemplateApprovalStatus[]> = {
  draft: ["in_review", "retired"],
  in_review: ["approved", "draft", "retired"],
  approved: ["retired"],
  retired: [],
};

function assertTransition<T extends string>(
  entity: string,
  from: string,
  to: T,
  table: Record<T, T[]>
): void {
  const allowed = table[from as T];
  if (!allowed || !allowed.includes(to)) {
    throw new DomainError(
      `Invalid ${entity} state transition: "${from}" -> "${to}".`,
      409
    );
  }
}

export function assertParticipantTransition(from: string, to: ParticipantStatus): void {
  assertTransition("participant", from, to, PARTICIPANT_TRANSITIONS);
}

export function assertAppointmentTransition(from: string, to: AppointmentStatus): void {
  assertTransition("appointment", from, to, APPOINTMENT_TRANSITIONS);
}

export function assertOutboxTransition(from: string, to: OutboxStatus): boolean {
  const allowed = OUTBOX_TRANSITIONS[from as OutboxStatus];
  return Boolean(allowed && allowed.includes(to));
}

export function assertTemplateTransition(from: string, to: TemplateApprovalStatus): void {
  assertTransition("template", from, to, TEMPLATE_TRANSITIONS);
}
