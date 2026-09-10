"use client";

import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { formatCurrency } from "@/lib/utils";

export function RevenueTrendChart({ data }: { data: { date: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2554ea" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2554ea" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#e4e9f1" />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
        <YAxis
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "#64748b" }}
          tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : v)}
          width={40}
        />
        <Tooltip
          formatter={(value) => [formatCurrency(Number(value)), "Revenue"]}
          contentStyle={{
            borderRadius: 12,
            border: "1px solid #e4e9f1",
            boxShadow: "0 12px 32px -8px rgb(15 23 42 / 0.18)",
            fontSize: 12,
          }}
        />
        <Area type="monotone" dataKey="amount" stroke="#2554ea" strokeWidth={2} fill="url(#revenueFill)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
