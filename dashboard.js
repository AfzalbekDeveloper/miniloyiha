const originNames = {
  usa: "AQSH",
  europe: "Yevropa",
  japan: "Yaponiya",
};

const originColors = {
  usa: "#3977c9",
  europe: "#30a789",
  japan: "#e49a42",
};

const numberFormat = new Intl.NumberFormat("uz-UZ");
const oneDecimalFormat = new Intl.NumberFormat("uz-UZ", {
  maximumFractionDigits: 1,
  minimumFractionDigits: 1,
});
let dataset = [];

const elements = {
  loading: document.querySelector("#loading"),
  error: document.querySelector("#error"),
  dashboard: document.querySelector("#dashboard"),
  origin: document.querySelector("#origin-filter"),
  cylinders: document.querySelector("#cylinder-options"),
  yearFrom: document.querySelector("#year-from"),
  yearTo: document.querySelector("#year-to"),
  reset: document.querySelector("#reset-filters"),
  empty: document.querySelector("#empty-state"),
  charts: document.querySelector("#charts"),
  count: document.querySelector("#metric-count"),
  average: document.querySelector("#metric-average"),
  maximum: document.querySelector("#metric-maximum"),
  weight: document.querySelector("#metric-weight"),
  resultCount: document.querySelector("#result-count"),
  tableCount: document.querySelector("#table-count"),
  dataRows: document.querySelector("#data-rows"),
};

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character];
  });
}

function filteredData() {
  const selectedOrigin = elements.origin.value;
  const selectedCylinders = new Set(
    Array.from(elements.cylinders.querySelectorAll("input:checked"), (input) =>
      Number(input.value),
    ),
  );
  const yearFrom = Number(elements.yearFrom.value);
  const yearTo = Number(elements.yearTo.value);

  return dataset.filter(
    (car) =>
      (selectedOrigin === "all" || car.origin === selectedOrigin) &&
      selectedCylinders.has(car.cylinders) &&
      car.model_year + 1900 >= yearFrom &&
      car.model_year + 1900 <= yearTo,
  );
}

function initializeFilters() {
  const cylinders = [...new Set(dataset.map((car) => car.cylinders))].sort(
    (a, b) => a - b,
  );
  const years = [...new Set(dataset.map((car) => car.model_year + 1900))].sort(
    (a, b) => a - b,
  );

  elements.cylinders.innerHTML = cylinders
    .map(
      (cylinder) => `
        <label class="check-option">
          <input type="checkbox" value="${cylinder}" checked />
          <span>${cylinder} silindr</span>
        </label>
      `,
    )
    .join("");

  const yearOptions = years
    .map((year) => `<option value="${year}">${year}</option>`)
    .join("");
  elements.yearFrom.innerHTML = yearOptions;
  elements.yearTo.innerHTML = yearOptions;
  elements.yearFrom.value = years[0];
  elements.yearTo.value = years[years.length - 1];

  elements.origin.addEventListener("change", renderDashboard);
  elements.cylinders.addEventListener("change", renderDashboard);
  elements.yearFrom.addEventListener("change", () => {
    if (Number(elements.yearFrom.value) > Number(elements.yearTo.value)) {
      elements.yearTo.value = elements.yearFrom.value;
    }
    renderDashboard();
  });
  elements.yearTo.addEventListener("change", () => {
    if (Number(elements.yearTo.value) < Number(elements.yearFrom.value)) {
      elements.yearFrom.value = elements.yearTo.value;
    }
    renderDashboard();
  });
  elements.reset.addEventListener("click", () => {
    elements.origin.value = "all";
    elements.cylinders
      .querySelectorAll("input")
      .forEach((input) => (input.checked = true));
    elements.yearFrom.value = years[0];
    elements.yearTo.value = years[years.length - 1];
    renderDashboard();
  });
}

function renderDashboard() {
  const cars = filteredData();
  const noResults = cars.length === 0;
  elements.empty.hidden = !noResults;
  elements.charts.hidden = noResults;
  elements.resultCount.textContent = `${numberFormat.format(cars.length)} ta avtomobil`;
  elements.tableCount.textContent = `${numberFormat.format(cars.length)} ta yozuv`;

  if (noResults) {
    elements.count.textContent = "0";
    elements.average.textContent = "—";
    elements.maximum.textContent = "—";
    elements.weight.textContent = "—";
    elements.dataRows.innerHTML = "";
    return;
  }

  const meanMpg = cars.reduce((total, car) => total + car.mpg, 0) / cars.length;
  const meanWeight =
    cars.reduce((total, car) => total + car.weight, 0) / cars.length;
  const maxMpg = Math.max(...cars.map((car) => car.mpg));

  elements.count.textContent = numberFormat.format(cars.length);
  elements.average.textContent = oneDecimalFormat.format(meanMpg);
  elements.maximum.textContent = oneDecimalFormat.format(maxMpg);
  elements.weight.textContent = numberFormat.format(Math.round(meanWeight));

  renderScatter(cars);
  renderYearTrend(cars);
  renderBars(
    "#cylinder-chart",
    groupAverage(cars, "cylinders").map(([key, value]) => [
      `${key} silindr`,
      value,
    ]),
    "#5b8fd1",
  );
  renderBars(
    "#origin-chart",
    groupAverage(cars, "origin").map(([key, value]) => [
      originNames[key],
      value,
      originColors[key],
    ]),
    "#30a789",
  );
  renderTable(cars);
}

function groupAverage(cars, key) {
  const groups = new Map();
  for (const car of cars) {
    const group = groups.get(car[key]) ?? { total: 0, count: 0 };
    group.total += car.mpg;
    group.count += 1;
    groups.set(car[key], group);
  }
  return [...groups.entries()]
    .map(([name, group]) => [name, group.total / group.count])
    .sort((a, b) =>
      typeof a[0] === "number"
        ? a[0] - b[0]
        : String(a[0]).localeCompare(String(b[0])),
    );
}

function renderScatter(cars) {
  const width = 720;
  const height = 300;
  const plot = { left: 52, right: 18, top: 18, bottom: 42 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const xMin = 1500;
  const xMax = 5500;
  const yMin = 0;
  const yMax = 50;
  const grid = [];

  for (let value = 0; value <= 50; value += 10) {
    const y = plot.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
    grid.push(
      `<line class="chart-gridline" x1="${plot.left}" y1="${y}" x2="${width - plot.right}" y2="${y}"></line>`,
      `<text class="chart-tick" x="${plot.left - 10}" y="${y + 4}" text-anchor="end">${value}</text>`,
    );
  }
  for (let value = 2000; value <= 5000; value += 1000) {
    const x = plot.left + ((value - xMin) / (xMax - xMin)) * plotWidth;
    grid.push(
      `<line class="chart-gridline" x1="${x}" y1="${plot.top}" x2="${x}" y2="${height - plot.bottom}"></line>`,
      `<text class="chart-tick" x="${x}" y="${height - 16}" text-anchor="middle">${numberFormat.format(value)}</text>`,
    );
  }

  const points = cars
    .map((car) => {
      const x =
        plot.left + ((car.weight - xMin) / (xMax - xMin)) * plotWidth;
      const y = plot.top + ((yMax - car.mpg) / (yMax - yMin)) * plotHeight;
      const title = `${car.name} · ${oneDecimalFormat.format(car.mpg)} MPG · ${numberFormat.format(car.weight)} lb`;
      return `<circle cx="${x}" cy="${y}" r="3.7" fill="${originColors[car.origin]}" fill-opacity="0.72"><title>${escapeHtml(title)}</title></circle>`;
    })
    .join("");

  const legend = Object.entries(originNames)
    .map(
      ([key, label], index) => `
        <circle cx="${plot.left + index * 105}" cy="${height - 3}" r="4" fill="${originColors[key]}"></circle>
        <text class="chart-legend" x="${plot.left + 10 + index * 105}" y="${height}">${label}</text>
      `,
    )
    .join("");

  document.querySelector("#scatter-chart").innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Avtomobil og'irligi va MPG tarqalish grafigi">
      ${grid.join("")}
      <line class="chart-axis" x1="${plot.left}" y1="${plot.top}" x2="${plot.left}" y2="${height - plot.bottom}"></line>
      <line class="chart-axis" x1="${plot.left}" y1="${height - plot.bottom}" x2="${width - plot.right}" y2="${height - plot.bottom}"></line>
      ${points}
      ${legend}
    </svg>
  `;
}

function renderYearTrend(cars) {
  const annual = groupAverage(cars, "model_year").map(([year, mpg]) => [
    year + 1900,
    mpg,
  ]);
  const width = 520;
  const height = 300;
  const plot = { left: 48, right: 16, top: 20, bottom: 42 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const firstYear = 1970;
  const lastYear = 1982;
  const yMin = 10;
  const yMax = 50;
  const grid = [];

  for (let value = 10; value <= 50; value += 10) {
    const y = plot.top + ((yMax - value) / (yMax - yMin)) * plotHeight;
    grid.push(
      `<line class="chart-gridline" x1="${plot.left}" y1="${y}" x2="${width - plot.right}" y2="${y}"></line>`,
      `<text class="chart-tick" x="${plot.left - 9}" y="${y + 4}" text-anchor="end">${value}</text>`,
    );
  }
  for (const year of [1970, 1973, 1976, 1979, 1982]) {
    const x = plot.left + ((year - firstYear) / (lastYear - firstYear)) * plotWidth;
    grid.push(
      `<text class="chart-tick" x="${x}" y="${height - 15}" text-anchor="middle">${year}</text>`,
    );
  }

  const points = annual.map(([year, mpg]) => {
    const x = plot.left + ((year - firstYear) / (lastYear - firstYear)) * plotWidth;
    const y = plot.top + ((yMax - mpg) / (yMax - yMin)) * plotHeight;
    return { x, y, year, mpg };
  });
  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${point.x},${point.y}`)
    .join(" ");
  const dots = points
    .map(
      (point) => `
        <circle cx="${point.x}" cy="${point.y}" r="4.3" fill="#3977c9">
          <title>${point.year}: ${oneDecimalFormat.format(point.mpg)} MPG</title>
        </circle>
      `,
    )
    .join("");

  document.querySelector("#year-chart").innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="Model yillari bo'yicha o'rtacha MPG chizig'i">
      ${grid.join("")}
      <path d="${path}" fill="none" stroke="#3977c9" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></path>
      ${dots}
    </svg>
  `;
}

function renderBars(selector, values, defaultColor) {
  const width = 520;
  const height = 300;
  const plot = { left: 48, right: 16, top: 20, bottom: 48 };
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const maxValue = Math.max(10, Math.ceil(Math.max(...values.map((item) => item[1])) / 10) * 10);
  const tickStep = maxValue <= 50 ? 10 : 20;
  const grid = [];

  for (let value = 0; value <= maxValue; value += tickStep) {
    const y = plot.top + ((maxValue - value) / maxValue) * plotHeight;
    grid.push(
      `<line class="chart-gridline" x1="${plot.left}" y1="${y}" x2="${width - plot.right}" y2="${y}"></line>`,
      `<text class="chart-tick" x="${plot.left - 9}" y="${y + 4}" text-anchor="end">${value}</text>`,
    );
  }

  const groupWidth = plotWidth / values.length;
  const barWidth = Math.min(54, groupWidth * 0.55);
  const bars = values
    .map(([label, value, color], index) => {
      const barHeight = (value / maxValue) * plotHeight;
      const x = plot.left + index * groupWidth + (groupWidth - barWidth) / 2;
      const y = plot.top + plotHeight - barHeight;
      const fill = color ?? defaultColor;
      const safeLabel = escapeHtml(label);
      return `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="5" fill="${fill}">
          <title>${safeLabel}: ${oneDecimalFormat.format(value)} MPG</title>
        </rect>
        <text class="chart-label" x="${x + barWidth / 2}" y="${y - 7}" text-anchor="middle">${oneDecimalFormat.format(value)}</text>
        <text class="chart-tick" x="${x + barWidth / 2}" y="${height - 14}" text-anchor="middle">${safeLabel}</text>
      `;
    })
    .join("");

  document.querySelector(selector).innerHTML = `
    <svg class="chart-svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(selector)} bo'yicha o'rtacha MPG ustunli diagrammasi">
      ${grid.join("")}
      ${bars}
    </svg>
  `;
}

function renderTable(cars) {
  elements.dataRows.innerHTML = [...cars]
    .sort((a, b) => b.mpg - a.mpg)
    .map(
      (car) => `
        <tr>
          <td>${escapeHtml(car.name)}</td>
          <td>${oneDecimalFormat.format(car.mpg)}</td>
          <td>${numberFormat.format(car.weight)}</td>
          <td>${car.cylinders}</td>
          <td>${car.model_year + 1900}</td>
          <td>${originNames[car.origin]}</td>
        </tr>
      `,
    )
    .join("");
}

async function startDashboard() {
  try {
    const response = await fetch("./data/mpg.json");
    if (!response.ok) {
      throw new Error(`Dataset request failed: ${response.status}`);
    }
    dataset = (await response.json()).filter(
      (car) =>
        Number.isFinite(car.mpg) &&
        Number.isFinite(car.weight) &&
        Number.isFinite(car.cylinders) &&
        Number.isFinite(car.model_year) &&
        originNames[car.origin],
    );
    if (dataset.length === 0) {
      throw new Error("The MPG dataset contains no usable records.");
    }
    initializeFilters();
    elements.loading.hidden = true;
    elements.dashboard.hidden = false;
    renderDashboard();
  } catch (error) {
    console.error("Unable to load the MPG dashboard dataset.", error);
    elements.loading.hidden = true;
    elements.error.hidden = false;
  }
}

startDashboard();
