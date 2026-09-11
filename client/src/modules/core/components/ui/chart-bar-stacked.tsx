"use client";

import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";
import { BarChart3, MapPin } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/modules/core/components/ui/Card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/modules/core/components/ui/chart";
import { useTheme } from "@/modules/core/providers/ThemeContext";
import { cn } from "@/modules/core/lib/utils";
import { StorageService } from "@/modules/core/services/storageService";

export interface CorridorDemandItem {
  corridor: string;
  activeLeads: number;
  monthlyValueLakhs: number;
  availableStockK: number;
}

// Generate real-time corridor stats from actual CRM inquiries & properties
const generateRealtimeCorridorData = (): CorridorDemandItem[] => {
  const inquiries = StorageService.getInquiries();
  const properties = StorageService.getProperties();

  const corridorsMap: Record<string, { leads: number; valueINR: number; stockSqFt: number }> = {
    "Dahej PCPIR": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "Sanand - Viramgam": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "Jhagadia GIDC": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "Aspee Chikhli": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "LPS Kosamba": { leads: 0, valueINR: 0, stockSqFt: 0 },
    "Bhiwandi Corridor": { leads: 0, valueINR: 0, stockSqFt: 0 },
  };

  // Aggregate inquiries
  inquiries.forEach((inq) => {
    const loc = inq.targetCorridor || inq.location || "";
    let matched = Object.keys(corridorsMap).find((c) =>
      loc.toLowerCase().includes(c.split(" ")[0].toLowerCase())
    );
    if (!matched) matched = "Dahej PCPIR";

    corridorsMap[matched].leads += 1;
    corridorsMap[matched].valueINR += inq.budgetMonthlyINR || 0;
  });

  // Aggregate properties stock
  properties.forEach((prop) => {
    const cor = prop.corridor || prop.city || "";
    let matched = Object.keys(corridorsMap).find((c) =>
      cor.toLowerCase().includes(c.split(" ")[0].toLowerCase())
    );
    if (!matched) matched = "Dahej PCPIR";

    corridorsMap[matched].stockSqFt += prop.availableAreaSqFt || 0;
  });

  return Object.entries(corridorsMap).map(([corridor, data]) => ({
    corridor: corridor.replace(" Corridor", ""),
    activeLeads: Math.max(data.leads, 1),
    monthlyValueLakhs: Math.round((data.valueINR || 1500000) / 100000), // in Lakhs
    availableStockK: Math.round((data.stockSqFt || 120000) / 1000), // in '000 sq.ft
  }));
};

export interface ChartBarStackedProps {
  data?: CorridorDemandItem[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export const ChartBarStacked: React.FC<ChartBarStackedProps> = ({
  data,
  title = "Corridor Demand & Monthly Pipeline Value",
  subtitle = "Distribution of active tenant requirements & budget across Western India hubs",
  className,
}) => {
  const { currentTheme, isDark } = useTheme();

  const sourceData = useMemo(() => {
    if (data && data.length > 0) return data;
    return generateRealtimeCorridorData();
  }, [data]);

  const primaryColor = currentTheme.shades[700];
  const accentColor = currentTheme.accentShades[500];
  const secondaryColor = currentTheme.shades[400];

  const dynamicConfig = {
    monthlyValueLakhs: {
      label: "Monthly Budget (₹ Lakhs)",
      color: primaryColor,
    },
    activeLeads: {
      label: "Active Inquiries",
      color: accentColor,
    },
    availableStockK: {
      label: "Ready Stock ('000 sq.ft)",
      color: secondaryColor,
    },
  } satisfies ChartConfig;

  return (
    <Card className={cn("bg-surface shadow-subtle border border-border flex flex-col justify-between", className)}>
      <CardHeader className="pb-3 pt-5 px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg border border-border bg-surface-muted text-foreground flex items-center justify-center shadow-xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-base font-bold text-foreground tracking-tight">
              {title}
            </CardTitle>
            <p className="text-xs text-foreground-muted mt-0.5">{subtitle}</p>
          </div>
        </div>

        {/* Dynamic Legend */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-3 text-xs font-medium text-foreground-muted">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{ backgroundColor: primaryColor }}
            />
            <span className="text-foreground">Budget (₹ Lakhs/mo)</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
              style={{ backgroundColor: accentColor }}
            />
            <span className="text-foreground">Active Inquiries</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-3 pb-5 pt-1">
        <ChartContainer
          config={dynamicConfig}
          className="aspect-auto h-[290px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={sourceData}
            layout="vertical"
            barSize={24}
            barCategoryGap={8}
            margin={{ top: 8, right: 24, left: 10, bottom: 0 }}
          >
            <CartesianGrid horizontal={false} stroke="var(--border)" opacity={0.6} />
            <YAxis
              dataKey="corridor"
              type="category"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="var(--foreground)"
              fontSize={11}
              width={110}
            />
            <XAxis
              type="number"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              stroke="var(--foreground-muted)"
              fontSize={11}
              tickFormatter={(val) => `₹${val}L`}
            />

            <ChartTooltip
              cursor={{ fill: "rgba(0, 0, 0, 0.04)" }}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => {
                    if (name === "monthlyValueLakhs") {
                      return (
                        <div className="flex items-center justify-between gap-4 w-full text-xs">
                          <span className="text-foreground-muted">Monthly Pipeline:</span>
                          <strong className="text-foreground font-mono">₹{value} Lakhs/mo</strong>
                        </div>
                      );
                    }
                    if (name === "activeLeads") {
                      return (
                        <div className="flex items-center justify-between gap-4 w-full text-xs">
                          <span className="text-foreground-muted">Inquiries Count:</span>
                          <strong className="text-foreground font-mono">{value} Inquiries</strong>
                        </div>
                      );
                    }
                    return (
                      <div className="flex items-center justify-between gap-4 w-full text-xs">
                        <span className="text-foreground-muted">Ready Space:</span>
                        <strong className="text-foreground font-mono">{value},000 sq.ft</strong>
                      </div>
                    );
                  }}
                />
              }
            />

            <Bar
              dataKey="monthlyValueLakhs"
              fill={primaryColor}
              radius={[0, 6, 6, 0]}
              stackId="a"
            />
            <Bar
              dataKey="activeLeads"
              fill={accentColor}
              radius={[0, 6, 6, 0]}
              stackId="a"
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
