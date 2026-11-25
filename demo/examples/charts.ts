// 从 charts.html 搬来的图表演示与接线（D3 内联化）。壳由 report.html 提供。
// 左侧分类菜单由 shell.ts Charts 分组渲染。See: wiki/requirements/REQ-005-charts.md
  import "../../src/report/chart/index.js";

  // ── Series data（data 是 DOM property，attribute 不生效，需 JS 设置）──
  const s = (id) => document.getElementById(id);
  s("s-bar-online").data = [{ label: "Jan", value: 4200 }, { label: "Feb", value: 5100 }, { label: "Mar", value: 4800 }, { label: "Apr", value: 6200 }, { label: "May", value: 5900 }, { label: "Jun", value: 7400 }];
  s("s-bar-retail").data = [{ label: "Jan", value: 3100 }, { label: "Feb", value: 2900 }, { label: "Mar", value: 3500 }, { label: "Apr", value: 3300 }, { label: "May", value: 4100 }, { label: "Jun", value: 3900 }];
  s("s-bar-wholesale").data = [{ label: "Jan", value: 1800 }, { label: "Feb", value: 2200 }, { label: "Mar", value: 1900 }, { label: "Apr", value: 2600 }, { label: "May", value: 2400 }, { label: "Jun", value: 3100 }];
  s("s-mixed-rev").data = [{ label: "Q1", value: 48000 }, { label: "Q2", value: 56000 }, { label: "Q3", value: 62000 }, { label: "Q4", value: 71000 }];
  s("s-mixed-growth").data = [{ label: "Q1", value: 0.08 }, { label: "Q2", value: 0.14 }, { label: "Q3", value: 0.1 }, { label: "Q4", value: 0.18 }];
  s("s-line-desktop").data = [12, 18, 16, 24, 22, 30, 28, 36];
  s("s-line-mobile").data = [8, 10, 14, 12, 20, 18, 26, 32];
  s("s-area-store").data = [40, 55, 48, 62, 58, 70];
  s("s-area-play").data = [30, 35, 42, 38, 50, 46];
  s("s-pie").data = [{ label: "Organic", value: 45 }, { label: "Paid", value: 25 }, { label: "Social", value: 18 }, { label: "Referral", value: 12 }];
  s("s-donut").data = [{ label: "Engineering", value: 320 }, { label: "Marketing", value: 180 }, { label: "Operations", value: 120 }, { label: "Sales", value: 90 }, { label: "Support", value: 60 }];
  s("s-cpu").data = [22, 18, 25, 30, 28, 35, 32, 40, 38, 45, 42, 50, 48, 44, 52, 49];
  s("s-lat").data = [120, 95, 110, 88, 130, 105, 92, 118, 100, 140, 122, 98, 108, 84, 116];
  // ── Radar：label 即轴名，两个系列的轴顺序必须一致（标签取第一个可见系列）──
  s("s-radar-shop").data = [
    { label: "营业额", value: 128000 }, { label: "出杯量", value: 820 }, { label: "客单价", value: 32.5 },
    { label: "实收率", value: 0.86 }, { label: "复购率", value: 0.42 }, { label: "达成率", value: 1.08 },
  ];
  s("s-radar-region").data = [
    { label: "营业额", value: 96000 }, { label: "出杯量", value: 640 }, { label: "客单价", value: 30 },
    { label: "实收率", value: 0.79 }, { label: "复购率", value: 0.35 }, { label: "达成率", value: 0.96 },
  ];
  // 单系列：分母 = 全图最大值（这里的 92），最外圈不是满分
  s("s-radar-score").data = [
    { label: "服务", value: 92 }, { label: "出杯速度", value: 78 }, { label: "卫生", value: 85 },
    { label: "陈列", value: 66 }, { label: "客诉处理", value: 88 },
  ];

  // ── Map demo（geojson / values 是 DOM property，attribute 不生效，需 JS 设置）──
  const mapEl = document.getElementById("cht-map");
  mapEl.geojson = {
    type: "FeatureCollection",
    features: [
      { type: "Feature", properties: { id: "north", name: "North" }, geometry: { type: "Polygon", coordinates: [[[0, 0], [0, 50], [50, 50], [50, 0], [0, 0]]] } },
      { type: "Feature", properties: { id: "east", name: "East" }, geometry: { type: "Polygon", coordinates: [[[55, 0], [55, 50], [105, 50], [105, 0], [55, 0]]] } },
      { type: "Feature", properties: { id: "south", name: "South" }, geometry: { type: "Polygon", coordinates: [[[0, 55], [0, 105], [50, 105], [50, 55], [0, 55]]] } },
      { type: "Feature", properties: { id: "west", name: "West" }, geometry: { type: "Polygon", coordinates: [[[55, 55], [55, 105], [105, 105], [105, 55], [55, 55]]] } },
      { type: "Feature", properties: { id: "center", name: "Center" }, geometry: { type: "Polygon", coordinates: [[[22, 22], [22, 32], [32, 32], [32, 22], [22, 22]]] } },
    ],
  };
  mapEl.values = { north: 1200, east: 3400, south: 2100, west: 980, center: 2600 };

  const mapInfo = document.getElementById("cht-map-info");
  mapEl.addEventListener("z-marker-click", (e) => {
    mapInfo.textContent = e.detail.value !== undefined && !Number.isNaN(e.detail.value)
      ? "Clicked region value: " + e.detail.formatted
      : "";
  });

  // ── Bar chart legend info ──
  const barToggleInfo = document.getElementById("cht-bar-toggle-info");
  document.getElementById("cht-bar").addEventListener("z-series-toggle", (e) => {
    const names = ["Online", "Retail", "Wholesale"];
    barToggleInfo.textContent = e.detail.hidden.length
      ? "Hidden: " + e.detail.hidden.map((i) => names[i]).join(", ")
      : "";
  });

  // 这页已有完整侧边栏，头部「返回主页」按钮关闭。壳由 report.html 初始化。
