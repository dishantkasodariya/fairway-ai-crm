"use client";

import React, { useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Calendar, Filter, TrendingUp } from "lucide-react";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/modules/core/components/ui/chart";
import { useTheme } from "@/modules/core/providers/ThemeContext";

export const chartAreaInteractiveTitle = "An interactive area chart";

const chartData = [
  { date: "2024-04-01", inquiries: 22, visits: 15 },
  { date: "2024-04-02", inquiries: 19, visits: 18 },
  { date: "2024-04-03", inquiries: 26, visits: 12 },
  { date: "2024-04-04", inquiries: 34, visits: 26 },
  { date: "2024-04-05", inquiries: 37, visits: 29 },
  { date: "2024-04-06", inquiries: 30, visits: 34 },
  { date: "2024-04-07", inquiries: 24, visits: 18 },
  { date: "2024-04-08", inquiries: 40, visits: 32 },
  { date: "2024-04-09", inquiries: 15, visits: 11 },
  { date: "2024-04-10", inquiries: 26, visits: 19 },
  { date: "2024-04-11", inquiries: 32, visits: 35 },
  { date: "2024-04-12", inquiries: 29, visits: 21 },
  { date: "2024-04-13", inquiries: 34, visits: 38 },
  { date: "2024-04-14", inquiries: 18, visits: 22 },
  { date: "2024-04-15", inquiries: 22, visits: 17 },
  { date: "2024-04-16", inquiries: 28, visits: 19 },
  { date: "2024-04-17", inquiries: 44, visits: 36 },
  { date: "2024-04-18", inquiries: 36, visits: 41 },
  { date: "2024-04-19", inquiries: 24, visits: 18 },
  { date: "2024-04-20", inquiries: 18, visits: 15 },
  { date: "2024-04-21", inquiries: 23, visits: 20 },
  { date: "2024-04-22", inquiries: 32, visits: 27 },
  { date: "2024-04-23", inquiries: 23, visits: 23 },
  { date: "2024-04-24", inquiries: 38, visits: 29 },
  { date: "2024-04-25", inquiries: 31, visits: 25 },
  { date: "2024-04-26", inquiries: 17, visits: 13 },
  { date: "2024-04-27", inquiries: 38, visits: 42 },
  { date: "2024-04-28", inquiries: 22, visits: 18 },
  { date: "2024-04-29", inquiries: 31, visits: 24 },
  { date: "2024-04-30", inquiries: 45, visits: 38 },
  { date: "2024-05-01", inquiries: 26, visits: 22 },
  { date: "2024-05-02", inquiries: 29, visits: 31 },
  { date: "2024-05-03", inquiries: 34, visits: 19 },
  { date: "2024-05-04", inquiries: 38, visits: 42 },
  { date: "2024-05-05", inquiries: 48, visits: 39 },
  { date: "2024-05-06", inquiries: 49, visits: 52 },
  { date: "2024-05-07", inquiries: 38, visits: 30 },
  { date: "2024-05-08", inquiries: 24, visits: 21 },
  { date: "2024-05-09", inquiries: 27, visits: 18 },
  { date: "2024-05-10", inquiries: 29, visits: 33 },
  { date: "2024-05-11", inquiries: 33, visits: 27 },
  { date: "2024-05-12", inquiries: 27, visits: 24 },
  { date: "2024-05-13", inquiries: 29, visits: 26 },
  { date: "2024-05-14", inquiries: 44, visits: 49 },
  { date: "2024-05-15", inquiries: 47, visits: 38 },
  { date: "2024-05-16", inquiries: 33, visits: 40 },
  { date: "2024-05-17", inquiries: 49, visits: 42 },
  { date: "2024-05-18", inquiries: 31, visits: 35 },
  { date: "2024-05-19", inquiries: 23, visits: 18 },
  { date: "2024-05-20", inquiries: 27, visits: 23 },
  { date: "2024-05-21", inquiries: 18, visits: 14 },
  { date: "2024-05-22", inquiries: 21, visits: 16 },
  { date: "2024-05-23", inquiries: 35, visits: 29 },
  { date: "2024-05-24", inquiries: 39, visits: 32 },
  { date: "2024-05-25", inquiries: 30, visits: 25 },
  { date: "2024-05-26", inquiries: 27, visits: 20 },
  { date: "2024-05-27", inquiries: 42, visits: 46 },
  { date: "2024-05-28", inquiries: 33, visits: 29 },
  { date: "2024-05-29", inquiries: 18, visits: 13 },
  { date: "2024-05-30", inquiries: 34, visits: 28 },
  { date: "2024-05-31", inquiries: 28, visits: 23 },
  { date: "2024-06-01", inquiries: 27, visits: 20 },
  { date: "2024-06-02", inquiries: 47, visits: 41 },
  { date: "2024-06-03", inquiries: 23, visits: 16 },
  { date: "2024-06-04", inquiries: 43, visits: 38 },
  { date: "2024-06-05", inquiries: 28, visits: 24 },
  { date: "2024-06-06", inquiries: 39, visits: 35 },
  { date: "2024-06-07", inquiries: 42, visits: 37 },
  { date: "2024-06-08", inquiries: 38, visits: 32 },
  { date: "2024-06-09", inquiries: 43, visits: 48 },
  { date: "2024-06-10", inquiries: 25, visits: 20 },
  { date: "2024-06-11", inquiries: 22, visits: 15 },
  { date: "2024-06-12", inquiries: 49, visits: 42 },
  { date: "2024-06-13", inquiries: 21, visits: 18 },
  { date: "2024-06-14", inquiries: 42, visits: 38 },
  { date: "2024-06-15", inquiries: 35, visits: 35 },
  { date: "2024-06-16", inquiries: 37, visits: 31 },
  { date: "2024-06-17", inquiries: 47, visits: 52 },
  { date: "2024-06-18", inquiries: 27, visits: 20 },
  { date: "2024-06-19", inquiries: 34, visits: 29 },
  { date: "2024-06-20", inquiries: 40, visits: 45 },
  { date: "2024-06-21", inquiries: 29, visits: 21 },
  { date: "2024-06-22", inquiries: 37, visits: 27 },
  { date: "2024-06-23", inquiries: 48, visits: 53 },
  { date: "2024-06-24", inquiries: 23, visits: 18 },
  { date: "2024-06-25", inquiries: 24, visits: 19 },
  { date: "2024-06-26", inquiries: 43, visits: 38 },
  { date: "2024-06-27", inquiries: 44, visits: 49 },
  { date: "2024-06-28", inquiries: 29, visits: 20 },
  { date: "2024-06-29", inquiries: 23, visits: 16 },
  { date: "2024-06-30", inquiries: 44, visits: 40 },
];

const chartConfig = {
  activity: {
    label: "Total Flow",
  },
  inquiries: {
    label: "Inquiries Logged",
    color: "#0F6B4F",
  },
  visits: {
    label: "Site Visits Done",
    color: "#6BBF3E",
  },
} satisfies ChartConfig;

export interface ChartAreaInteractiveProps {
  className?: string;
}

export const ChartAreaInteractive: React.FC<ChartAreaInteractiveProps> = ({ className = "" }) => {
  const [timeRange, setTimeRange] = useState<"90d" | "30d" | "7d">("90d");
  const { currentTheme } = useTheme();

  const primaryColor = currentTheme.shades[600];
  const accentColor = currentTheme.accentShades[500];

  const dynamicChartConfig = {
    activity: {
      label: "Total Flow",
    },
    inquiries: {
      label: "Inquiries Logged",
      color: primaryColor,
    },
    visits: {
      label: "Site Visits Done",
      color: accentColor,
    },
  } satisfies ChartConfig;

  const filteredData = React.useMemo(() => {
    const referenceDate = new Date("2024-06-30");
    let daysToSubtract = 90;
    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);
    return chartData.filter((item) => {
      const date = new Date(item.date);
      return date >= startDate;
    });
  }, [timeRange]);

  const totalInquiries = React.useMemo(
    () => filteredData.reduce((acc, curr) => acc + curr.inquiries, 0),
    [filteredData]
  );
  const totalVisits = React.useMemo(
    () => filteredData.reduce((acc, curr) => acc + curr.visits, 0),
    [filteredData]
  );

  return (
    <div className={`w-full rounded-card border border-border bg-surface shadow-subtle p-5 ${className}`}>
      {/* Chart Header with Interactive Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-md bg-fairway-50 text-fairway-700 border border-fairway-200">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-foreground">Inquiries & Site Visits Trajectory</h3>
          </div>
          <p className="text-xs text-foreground-muted mt-1">
            Interactive area trend of demand generation and client property inspections across key corridors
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Quick Metrics Badges */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-fairway-50 border border-fairway-200 text-fairway-800 font-semibold">
              <span className="w-2 h-2 rounded-full bg-fairway-600" />
              <span>{totalInquiries.toLocaleString()} Inquiries</span>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-50 border border-accent-200 text-accent-900 font-semibold">
              <span className="w-2 h-2 rounded-full bg-accent-500" />
              <span>{totalVisits.toLocaleString()} Site Visits</span>
            </div>
          </div>

          {/* Time Range Filter Buttons */}
          <div className="inline-flex rounded-md border border-border bg-surface-muted p-0.5 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTimeRange("90d")}
              className={`px-2.5 py-1 rounded transition-colors ${
                timeRange === "90d"
                  ? "bg-surface text-foreground font-semibold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Last 3 Months
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("30d")}
              className={`px-2.5 py-1 rounded transition-colors ${
                timeRange === "30d"
                  ? "bg-surface text-foreground font-semibold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Last 30 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("7d")}
              className={`px-2.5 py-1 rounded transition-colors ${
                timeRange === "7d"
                  ? "bg-surface text-foreground font-semibold shadow-xs"
                  : "text-foreground-muted hover:text-foreground"
              }`}
            >
              Last 7 Days
            </button>
          </div>
        </div>
      </div>

      {/* Chart Canvas */}
      <ChartContainer className="aspect-auto h-[280px] w-full" config={dynamicChartConfig}>
        <AreaChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="fillInquiries" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={primaryColor} stopOpacity={0.8} />
              <stop offset="95%" stopColor={primaryColor} stopOpacity={0.05} />
            </linearGradient>
            <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={accentColor} stopOpacity={0.8} />
              <stop offset="95%" stopColor={accentColor} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="#DDE5E1" opacity={0.6} />
          <XAxis
            axisLine={false}
            dataKey="date"
            minTickGap={timeRange === "7d" ? 1 : 24}
            tickFormatter={(value) => {
              const date = new Date(value);
              return date.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }}
            tickLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: "#66736C" }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            tickMargin={8}
            tick={{ fontSize: 11, fill: "#66736C" }}
          />
          <ChartTooltip
            content={
              <ChartTooltipContent
                indicator="dot"
                labelFormatter={(value) =>
                  new Date(value).toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                }
              />
            }
            cursor={{ stroke: primaryColor, strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            dataKey="visits"
            name="Site Visits Done"
            fill="url(#fillVisits)"
            stroke={accentColor}
            strokeWidth={2}
            type="natural"
          />
          <Area
            dataKey="inquiries"
            name="Inquiries Logged"
            fill="url(#fillInquiries)"
            stroke={primaryColor}
            strokeWidth={2}
            type="natural"
          />
          <ChartLegend content={<ChartLegendContent />} />
        </AreaChart>
      </ChartContainer>
    </div>
  );
};


export default ChartAreaInteractive;
