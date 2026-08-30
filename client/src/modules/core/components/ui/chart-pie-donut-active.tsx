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

// Default dataset matching reference specification
export const DEFAULT_DONUT_DATA: DonutDataItem[] = [
  { name: "Electronics", value: 38, fill: "#16201B", key: "electronics" },
  { name: "Clothing", value: 27, fill: "#4B5563", key: "clothing" },
  { name: "Home & Garden", value: 21, fill: "#9CA3AF", key: "home_garden" },
  { name: "Sports", value: 14, fill: "#D1D5DB", key: "sports" },
];

const chartConfig = {
  value: {
    label: "Percentage",
  },
  electronics: {
    label: "Electronics",
    color: "#16201B",
  },
  clothing: {
    label: "Clothing",
    color: "#4B5563",
  },
  home_garden: {
    label: "Home & Garden",
    color: "#9CA3AF",
  },
  sports: {
    label: "Sports",
    color: "#D1D5DB",
  },
} satisfies ChartConfig;

export const ChartPieDonutActive: React.FC<ChartPieDonutActiveProps> = ({
  data = DEFAULT_DONUT_DATA,
  title: cardTitle = "Industry & Sector Distribution",
  subtitle = "Hover over segments to inspect sector distribution & share",
  className,
  showCardWrapper = true,
}) => {
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const { currentTheme, isDark } = useTheme();

  const totalValue = useMemo(() => {
    return data.reduce((acc, item) => acc + item.value, 0);
  }, [data]);

  const computedData = useMemo(() => {
    const palette = [
      currentTheme.shades[700],
      currentTheme.shades[500],
      currentTheme.accentShades[500],
      currentTheme.accentShades[300],
      currentTheme.chartColors[2],
      currentTheme.chartColors[3],
    ];
    return data.map((item, idx) => {
      const pct = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
      return {
        ...item,
        percentage: item.percentage !== undefined ? item.percentage : pct,
        fill: item.fill && item.fill !== "#16201B" && item.fill !== "#4B5563" && item.fill !== "#9CA3AF" && item.fill !== "#D1D5DB"
          ? item.fill
          : palette[idx % palette.length],
      };
    });
  }, [data, totalValue, currentTheme]);

  const activeItem = computedData[activeIndex] || computedData[0];

  const content = (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-6 p-2", className)}>
      {/* Donut Chart with Active Center Title & Value */}
      <div className="relative w-full max-w-[240px] aspect-square flex items-center justify-center">
        <ChartContainer
          config={chartConfig}
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
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) - 3}
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
                          y={(viewBox.cy || 0) + 20}
                          className="text-[11px] font-semibold"
                          style={{
                            fill: isDark ? "#9CA3AF" : "#66736C",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          {activeItem ? activeItem.name : "Category"}
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
