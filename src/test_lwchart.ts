import { createChart, AreaSeries, ColorType } from "lightweight-charts";

const chart = createChart(document.createElement("div"), {});
const series = chart.addSeries(AreaSeries, {
    lineColor: '#2962FF',
    topColor: '#2962FF',
    bottomColor: 'rgba(41, 98, 255, 0.28)',
});
series.setData([
    { time: '2018-12-22', value: 32.51 },
    { time: '2018-12-23', value: 31.11 },
]);
