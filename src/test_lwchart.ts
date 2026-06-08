import { AreaSeries, createChart } from "lightweight-charts";

const chart = createChart(document.createElement("div"), {});
const series = chart.addSeries(AreaSeries, {
  lineColor: "var(--chart-2)",
  topColor: "var(--chart-2)",
  bottomColor: "var(--surface-subtle)",
});
series.setData([
  { time: "2018-12-22", value: 32.51 },
  { time: "2018-12-23", value: 31.11 },
]);
