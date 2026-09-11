"use client";

import React, { useState, useMemo } from "react";
import { Pie, PieChart, Sector, Label, Cell } from "recharts";
import type { PieSectorDataItem } from "recharts/types/polar/Pie";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/modules/core/components/ui/chart";
import { useTheme } from "@/modules/core/providers/ThemeContext";
import { Card, CardHeader, CardTitle } from "@/modules/core/components/ui/Card";
import { cn } from "@/modules/core/lib/utils";

import { StorageService } from "@/modules/core/services/storageService";

export const chartPieDonutTitle = "A donut chart with an active sector";

export interface DonutDataItem {
  name: string;
  value: number;
  fill?: string;
  percentage?: number;
  key?: string;
}

export interface ChartPieDonutActiveProps {
  data?: DonutDataItem[];
  title?: string;
  subtitle?: string;
  className?: string;
  showCardWrapper?: boolean;
}

// Generate real-time industry category distribution from actual CRM inquiries
export const generateRealtimeIndustryData = (): DonutDataItem[] => {
  const inquiries = StorageService.getInquiries();
  const counts: Record<string, number> = {};

  inquiries.forEach((inq) => {
    const ind = inq.industry?.trim() || "3PL & Logistics";
    counts[ind] = (counts[ind] || 0) + 1;
  });

  const total = Object.values(counts).reduce((acc, c) => acc + c, 0);

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({
      name,
      value: count,
      key: name.toLowerCase().replace(/[^a-z0-9]/g, "_"),
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
};

export const ChartPieDonutActive: React.FC<ChartPieDonutActiveProps> = ({
  data,
  title: cardTitle = "Tenant Demand by Industry Category",
  subtitle = "Real-time sector distribution and market share from active inquiries",
  className,
  showCardWrapper = true,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const { currentTheme, isDark } = useTheme();

  const sourceData = useMemo(() => {
    if (data && data.length > 0) return data;
    return generateRealtimeIndustryData();
  }, [data]);

  const totalValue = useMemo(() => {
    return sourceData.reduce((acc, item) => acc + item.value, 0);
  }, [sourceData]);

  const computedData = useMemo(() => {
    const palette = [
      currentTheme.shades[700],
      currentTheme.shades[500],
      currentTheme.accentShades[500],
      currentTheme.accentShades[300],
      currentTheme.chartColors[2],
      currentTheme.chartColors[3],
    ];
    return sourceData.map((item, idx) => {
      const pct = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
      return {
        ...item,
        percentage: item.percentage !== undefined ? item.percentage : pct,
        fill: item.fill && item.fill !== "#16201B" && item.fill !== "#4B5563" && item.fill !== "#9CA3AF" && item.fill !== "#D1D5DB"
          ? item.fill
          : palette[idx % palette.length],
      };
    });
  }, [sourceData, totalValue, currentTheme]);

  const dynamicChartConfig = useMemo(() => {
    const cfg: ChartConfig = {
      value: { label: "Inquiries" },
    };
    computedData.forEach((item) => {
      if (item.key) {
        cfg[item.key] = {
          label: item.name,
          color: item.fill,
        };
      }
    });
    return cfg;
  }, [computedData]);

  const activeItem = computedData[activeIndex] || computedData[0];

  const content = (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-6 p-2", className)}>
      {/* Donut Chart with Active Center Title & Value */}
      <div className="relative w-full max-w-[240px] aspect-square flex items-center justify-center">
        <ChartContainer
          config={dynamicChartConfig}
          className="mx-auto aspect-square w-full max-h-[240px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(val, _name, item) => (
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: item.payload?.fill }}
                      />
                      <span className="font-semibold text-foreground">{item.payload?.name}:</span>
                      <span className="font-bold text-foreground">
                        {item.payload?.percentage ?? val}%
                      </span>
                    </div>
                  )}
                />
              }
            />
            <Pie
              data={computedData}
              dataKey="value"
              nameKey="name"
              innerRadius={62}
              outerRadius={88}
              paddingAngle={3}
              activeIndex={activeIndex}
              activeShape={({ outerRadius = 0, innerRadius = 0, ...props }: PieSectorDataItem) => (
                <Sector
                  {...props}
                  innerRadius={innerRadius - 2}
                  outerRadius={outerRadius + 8}
                  stroke="none"
                />
              )}
              onMouseEnter={(_, index) => setActiveIndex(index)}
            >
              {computedData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.fill}
                  className="transition-all duration-300 cursor-pointer outline-none"
                  style={{
                    opacity: activeIndex === index ? 1 : 0.85,
                  }}
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                    const fullName = activeItem ? activeItem.name : "Total Share";
                    const shortName =
                      fullName.length > 14
                        ? fullName.slice(0, 12) + "…"
                        : fullName;

                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="central"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 7}
                          className="font-black tracking-tight"
                          style={{
                            fill: isDark ? "#F9FAFB" : "#16201B",
                            fontWeight: 800,
                            fontSize: "1.75rem",
                            fontFamily: "inherit",
                          }}
                        >
                          {activeItem ? `${activeItem.percentage}%` : "0%"}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 16}
                          className="text-[11px] font-bold"
                          style={{
                            fill: isDark ? "#9CA3AF" : "#66736C",
                            fontSize: "0.7rem",
                            fontWeight: 600,
                            letterSpacing: "0.02em",
                          }}
                        >
                          {shortName}
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
                position="center"
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </div>

      {/* Side Legend with Vertical Indicators and Percentage Values */}
      <div className="flex-1 w-full flex flex-col justify-center space-y-2.5">
        {computedData.map((item, idx) => {
          const isActive = activeIndex === idx;
          return (
            <div
              key={item.name}
              onMouseEnter={() => setActiveIndex(idx)}
              className={cn(
                "flex items-center justify-between p-2 rounded-lg transition-all duration-150 cursor-pointer select-none group",
                isActive
                  ? "bg-surface-muted/90 shadow-xs border border-border font-semibold text-foreground"
                  : "hover:bg-surface-muted/50 border border-transparent text-foreground-muted hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Vertical Pill Indicator */}
                <div
                  className="w-1.5 h-6 rounded-full transition-all duration-200 shrink-0"
                  style={{
                    backgroundColor: item.fill,
                    transform: isActive ? "scaleY(1.15)" : "scaleY(1)",
                  }}
                />
                <span
                  className={cn(
                    "text-xs truncate transition-colors",
                    isActive
                      ? "font-bold text-foreground"
                      : "font-medium text-foreground-muted group-hover:text-foreground"
                  )}
                >
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 pl-3 shrink-0">
                <span
                  className={cn(
                    "text-sm font-sans tracking-tight transition-all",
                    isActive
                      ? "font-extrabold text-foreground"
                      : "font-semibold text-foreground-muted"
                  )}
                >
                  {item.percentage}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );


  if (!showCardWrapper) {
    return content;
  }

  return (
    <Card className="bg-surface shadow-subtle border border-border">
      <CardHeader className="pb-2">
        <div>
          <CardTitle className="text-base font-bold text-foreground tracking-tight">
            {cardTitle}
          </CardTitle>
          {subtitle && (
            <p className="text-xs text-foreground-muted mt-0.5">{subtitle}</p>
          )}
        </div>
      </CardHeader>
      <div className="p-4 pt-1">{content}</div>
    </Card>
  );
};

export default ChartPieDonutActive;
