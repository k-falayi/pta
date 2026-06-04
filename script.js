mapboxgl.accessToken = "pk.eyJ1Ijoid2hybyIsImEiOiJjbWE1cW4wbHAwaWs2Mm1xNHkzbjRtNnRoIn0.JKlYa0vasylBTfhCoNMoAg";

const GEOJSON_URL = "data/school_geo.geojson";

const PEOPLE_PER_DOT = 100;

const raceColumns = [
  { key: "White only %", label: "White only", color: "#f4d35e" },
  { key: "Black alone %", label: "Black alone", color: "#0d3b66" },
  { key: "AIAN alone %", label: "AIAN alone", color: "#9d4edd" },
  { key: "Asian alone %", label: "Asian alone", color: "#2a9d8f" },
  { key: "Pac Islander alone %", label: "Pacific Islander alone", color: "#f77f00" },
  { key: "some other races %", label: "Some other races", color: "#d62828" }
];

const incomeColors = [
  "#f7e7c1",
  "#e8c47b",
  "#d89c4a",
  "#b86f32",
  "#7f3b1d"
];

const ptaColors = {
  YES: "#1f9d55",
  NO: "#c0392b"
};

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/light-v11",
  center: [-78.6569, 37.4316],
  zoom: 6.1
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");

map.on("load", async () => {
  const response = await fetch(GEOJSON_URL);
  const tracts = await response.json();

  const schoolPoints = createSchoolPoints(tracts);
  const dotDensityPoints = createDotDensityPoints(tracts);

  map.addSource("tracts", {
    type: "geojson",
    data: tracts
  });

  map.addSource("schools", {
    type: "geojson",
    data: schoolPoints
  });

  map.addSource("race-dots", {
    type: "geojson",
    data: dotDensityPoints
  });

  addIncomeLayers();
  addSchoolLayers();
  addDotDensityLayers();

  fitToData(tracts);
  setupTabs();
  setupPopups();

  showSchoolsView();
});

/* ------------------------------------------------------------------
   Layers
------------------------------------------------------------------ */

function addIncomeLayers() {
  map.addLayer({
    id: "income-fill",
    type: "fill",
    source: "tracts",
    paint: {
      "fill-color": [
        "step",
        ["to-number", ["get", "Median household income"]],
        incomeColors[0],
        40000, incomeColors[1],
        60000, incomeColors[2],
        80000, incomeColors[3],
        100000, incomeColors[4]
      ],
      "fill-opacity": 0.72
    }
  });

  map.addLayer({
    id: "tract-outline",
    type: "line",
    source: "tracts",
    paint: {
      "line-color": "#ffffff",
      "line-width": 0.6,
      "line-opacity": 0.8
    }
  });
}

function addSchoolLayers() {
  map.addLayer({
    id: "school-points",
    type: "circle",
    source: "schools",
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6, 4,
        10, 7,
        13, 10
      ],
      "circle-color": [
        "match",
        ["upcase", ["to-string", ["get", "PTA"]]],
        "YES", ptaColors.YES,
        "NO", ptaColors.NO,
        "#777777"
      ],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.4,
      "circle-opacity": 0.95
    }
  });
}

function addDotDensityLayers() {
  map.addLayer({
    id: "race-dots",
    type: "circle",
    source: "race-dots",
    layout: {
      visibility: "none"
    },
    paint: {
      "circle-radius": [
        "interpolate",
        ["linear"],
        ["zoom"],
        6, 1.2,
        10, 2.2,
        13, 3.2
      ],
      "circle-color": ["get", "color"],
      "circle-opacity": 0.72
    }
  });
}

/* ------------------------------------------------------------------
   Tab behavior
------------------------------------------------------------------ */

function setupTabs() {
  document.querySelectorAll(".tab-button").forEach(button => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach(b => {
        b.classList.remove("active");
      });

      button.classList.add("active");

      if (button.dataset.view === "schools") {
        showSchoolsView();
      } else {
        showDensityView();
      }
    });
  });
}

function showSchoolsView() {
  map.setLayoutProperty("school-points", "visibility", "visible");
  map.setLayoutProperty("race-dots", "visibility", "none");

  map.setPaintProperty("income-fill", "fill-opacity", 0.72);

  document.querySelector(".subtitle").textContent =
    "Census tracts are shaded by median household income. School markers are colored by PTA status.";

  renderSchoolLegend();
}

function showDensityView() {
  map.setLayoutProperty("school-points", "visibility", "none");
  map.setLayoutProperty("race-dots", "visibility", "visible");

  map.setPaintProperty("income-fill", "fill-opacity", 0.16);

  document.querySelector(".subtitle").textContent =
    `Each dot represents about ${PEOPLE_PER_DOT.toLocaleString()} residents. Dots are randomly distributed within each census tract.`;

  renderDotDensityLegend();
}

/* ------------------------------------------------------------------
   Data preparation
------------------------------------------------------------------ */

function createSchoolPoints(geojson) {
  const features = geojson.features
    .map((feature, index) => {
      const lat = toNumber(feature.properties["Geocodio Latitude"]);
      const lon = toNumber(feature.properties["Geocodio Longitude"]);

      if (lat === null || lon === null) return null;

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lon, lat]
        },
        properties: {
          ...feature.properties,
          school_id: index
        }
      };
    })
    .filter(Boolean);

  return {
    type: "FeatureCollection",
    features
  };
}

function createDotDensityPoints(geojson) {
  const dots = [];

  geojson.features.forEach((tract, tractIndex) => {
    const population = toNumber(tract.properties["Census Tract pop"]);

    if (!population || population <= 0) return;

    raceColumns.forEach(group => {
      const percent = normalizePercent(tract.properties[group.key]);
      const groupPopulation = population * percent;
      const dotCount = Math.round(groupPopulation / PEOPLE_PER_DOT);

      for (let i = 0; i < dotCount; i++) {
        const point = randomPointInsidePolygon(tract);

        if (!point) continue;

        dots.push({
          type: "Feature",
          geometry: point.geometry,
          properties: {
            tract_id: tractIndex,
            race_group: group.label,
            color: group.color,
            people_represented: PEOPLE_PER_DOT
          }
        });
      }
    });
  });

  return {
    type: "FeatureCollection",
    features: dots
  };
}

function randomPointInsidePolygon(polygonFeature) {
  const bbox = turf.bbox(polygonFeature);
  let attempts = 0;

  while (attempts < 80) {
    const randomPoint = turf.randomPoint(1, { bbox }).features[0];

    if (turf.booleanPointInPolygon(randomPoint, polygonFeature)) {
      return randomPoint;
    }

    attempts++;
  }

  return turf.pointOnFeature(polygonFeature);
}

function normalizePercent(value) {
  const number = toNumber(value);

  if (!number) return 0;

  if (number > 1) {
    return number / 100;
  }

  return number;
}

function toNumber(value) {
  if (value === null || value === undefined) return null;

  if (typeof value === "number") return value;

  const cleaned = String(value)
    .replace(/[$,%]/g, "")
    .replace(/,/g, "")
    .trim();

  const number = Number(cleaned);

  return Number.isFinite(number) ? number : null;
}

/* ------------------------------------------------------------------
   Popups
------------------------------------------------------------------ */

function setupPopups() {
  const popup = new mapboxgl.Popup({
    closeButton: false,
    closeOnClick: false
  });

  map.on("mouseenter", "school-points", e => {
    map.getCanvas().style.cursor = "pointer";

    const props = e.features[0].properties;

    popup
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${props.School || "School"}</strong><br>
        ${props.Address || "Address unavailable"}<br>
        PTA: ${props.PTA || "Unknown"}<br>
        Median household income: ${formatMoney(props["Median household income"])}<br>
        Census tract population: ${formatNumber(props["Census Tract pop"])}
      `)
      .addTo(map);
  });

  map.on("mouseleave", "school-points", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  map.on("mouseenter", "race-dots", e => {
    map.getCanvas().style.cursor = "pointer";

    const props = e.features[0].properties;

    popup
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${props.race_group}</strong><br>
        One dot ≈ ${formatNumber(props.people_represented)} people
      `)
      .addTo(map);
  });

  map.on("mouseleave", "race-dots", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });
}

/* ------------------------------------------------------------------
   Legends
------------------------------------------------------------------ */

function renderSchoolLegend() {
  const legend = document.getElementById("legend");

  legend.innerHTML = `
    <h3>Median household income</h3>
    ${incomeLegendRows()}
    <h3 style="margin-top:16px;">PTA status</h3>
    <div class="legend-row">
      <span class="legend-dot" style="background:${ptaColors.YES}"></span>
      <span>Has PTA</span>
    </div>
    <div class="legend-row">
      <span class="legend-dot" style="background:${ptaColors.NO}"></span>
      <span>No PTA</span>
    </div>
  `;
}

function renderDotDensityLegend() {
  const legend = document.getElementById("legend");

  legend.innerHTML = `
    <h3>Dot density</h3>
    <div class="legend-row">
      <span>1 dot ≈ ${PEOPLE_PER_DOT.toLocaleString()} people</span>
    </div>
    ${raceColumns.map(group => `
      <div class="legend-row">
        <span class="legend-dot" style="background:${group.color}"></span>
        <span>${group.label}</span>
      </div>
    `).join("")}
    <h3 style="margin-top:16px;">Income layer</h3>
    ${incomeLegendRows()}
  `;
}

function incomeLegendRows() {
  const labels = [
    "Under $40,000",
    "$40,000–$59,999",
    "$60,000–$79,999",
    "$80,000–$99,999",
    "$100,000+"
  ];

  return labels.map((label, i) => `
    <div class="legend-row">
      <span class="legend-swatch" style="background:${incomeColors[i]}"></span>
      <span>${label}</span>
    </div>
  `).join("");
}

/* ------------------------------------------------------------------
   Helpers
------------------------------------------------------------------ */

function fitToData(geojson) {
  const bbox = turf.bbox(geojson);

  map.fitBounds(
    [
      [bbox[0], bbox[1]],
      [bbox[2], bbox[3]]
    ],
    {
      padding: 70,
      duration: 0
    }
  );
}

function formatMoney(value) {
  const number = toNumber(value);

  if (number === null) return "Unknown";

  return `$${number.toLocaleString(undefined, {
    maximumFractionDigits: 0
  })}`;
}

function formatNumber(value) {
  const number = toNumber(value);

  if (number === null) return "Unknown";

  return number.toLocaleString(undefined, {
    maximumFractionDigits: 0
  });
}
