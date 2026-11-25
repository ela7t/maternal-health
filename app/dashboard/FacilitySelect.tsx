"use client";

import { useRouter } from "next/navigation";

export function FacilitySelect({
  facilities,
  selectedId,
}: {
  facilities: Array<{ id: number; name: string }>;
  selectedId: number | null;
}) {
  const router = useRouter();
  return (
    <select
      className="form-select"
      style={{ minHeight: "40px", padding: "0.375rem 0.75rem", fontSize: "0.875rem" }}
      value={selectedId ?? ""}
      onChange={(e) => {
        const val = e.target.value;
        router.push(val ? `/dashboard?facility_id=${val}` : "/dashboard");
      }}
    >
      <option value="">All Facilities</option>
      {facilities.map((f) => (
        <option key={f.id} value={f.id}>
          {f.name}
        </option>
      ))}
    </select>
  );
}
