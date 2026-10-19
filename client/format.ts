import type { Profile } from "../shared/schema";
export const fullName = (p: Profile) => `${p.firstName} ${p.lastName}`;
export const initials = (name: string) =>
  name
    .split(" ")
    .map((v) => v[0])
    .slice(0, 2)
    .join("");
export const money = (p: Profile) =>
  p.income === null
    ? "Not provided"
    : p.currency === "INR"
      ? `₹${(p.income / 100000).toLocaleString("en-IN", { maximumFractionDigits: 1 })} lakh / year`
      : `${p.currency} ${p.income.toLocaleString()} / ${p.incomePeriod}`;
export const dateTime = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
export const shortDate = (value: string) =>
  new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
export const avatarTone = (id: string) =>
  ["rose", "sage", "peach", "lilac", "sand"][
    Array.from(id).reduce((n, c) => n + c.charCodeAt(0), 0) % 5
  ];
