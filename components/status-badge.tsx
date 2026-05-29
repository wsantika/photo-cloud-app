type StatusBadgeProps = {
  status: "pending" | "active" | "completed" | "cancelled";
};

const statusStyles: Record<StatusBadgeProps["status"], string> = {
  completed: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  cancelled: "bg-red-100 text-red-700",
  pending: "bg-gray-100 text-gray-700",
};

const statusLabels: Record<StatusBadgeProps["status"], string> = {
  completed: "Completed",
  active: "Active",
  cancelled: "Cancelled",
  pending: "Pending",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}
