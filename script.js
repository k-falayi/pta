mapboxgl.accessToken = "pk.eyJ1Ijoid2hybyIsImEiOiJjbWE1cW4wbHAwaWs2Mm1xNHkzbjRtNnRoIn0.JKlYa0vasylBTfhCoNMoAg";

const GEOJSON_URL = "data/school_geo.geojson";

const incomeColors = [
  "#f7e7c1",
  "#e8c47b",
  "#d89c4a",
  "#b86f32",
  "#7f3b1d"
];

const ptaColors = {
  YES: "#1f9d55",
  NO: "#c0392b",
  INACTIVE: "#737578"
};

const majorityColors = {
  WHITE: "#fc8d59",
  BLACK: "#5ab4ac"
};

const map = new mapboxgl.Map({
  container: "map",
  style: "mapbox://styles/mapbox/light-v11",
  center: [-77.436, 37.5407],
  zoom: 11
});

map.addControl(new mapboxgl.NavigationControl(), "top-right");

map.on("load", async () => {
  const response = await fetch(GEOJSON_URL);
  const tracts = await response.json();

  const schoolPoints = createSchoolPoints(tracts);

  map.addSource("tracts", {
    type: "geojson",
    data: tracts
  });

  map.addSource("schools", {
    type: "geojson",
    data: schoolPoints
  });

  addIncomeLayers();
  addMajorityLayer();
  addSchoolLayers();

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
        "case",

        ["<", ["to-number", ["get", "Median household income"]], 40000],
        incomeColors[0],

        ["<", ["to-number", ["get", "Median household income"]], 60000],
        incomeColors[1],

        ["<", ["to-number", ["get", "Median household income"]], 80000],
        incomeColors[2],

        ["<", ["to-number", ["get", "Median household income"]], 100000],
        incomeColors[3],

        [">=", ["to-number", ["get", "Median household income"]], 100000],
        incomeColors[4],

        "#cccccc"
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

function addMajorityLayer() {
  map.addLayer(
    {
      id: "majority-fill",
      type: "fill",
      source: "tracts",
      layout: {
        visibility: "none"
      },
      paint: {
        "fill-color": [
          "match",
          ["upcase", ["to-string", ["get", "Majority"]]],
          "WHITE", majorityColors.WHITE,
          "BLACK", majorityColors.BLACK,
          "#cccccc"
        ],
        "fill-opacity": 0.72
      }
    },
    "tract-outline"
  );
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
        ["get", "pta_clean"],
        "YES", ptaColors.YES,
        "NO", ptaColors.NO,
        "INACTIVE", ptaColors.INACTIVE,
        "#777777"
      ],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 1.4,
      "circle-opacity": 0.95
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
        showMajorityView();
      }
    });
  });
}

function showSchoolsView() {
  map.setLayoutProperty("school-points", "visibility", "visible");
  map.setLayoutProperty("income-fill", "visibility", "visible");
  map.setLayoutProperty("majority-fill", "visibility", "none");

  document.querySelector(".subtitle").textContent =
    "Census tracts are shaded by median household income. School markers are colored by PTA status.";

  renderSchoolLegend();
}

function showMajorityView() {
  map.setLayoutProperty("school-points", "visibility", "visible");
  map.setLayoutProperty("income-fill", "visibility", "none");
  map.setLayoutProperty("majority-fill", "visibility", "visible");

  document.querySelector(".subtitle").textContent =
    "Census tracts are colored by the racial group that makes up the largest share of the tract population. School markers are colored by PTA status.";

  renderMajorityLegend();
}

/* ------------------------------------------------------------------
   Data preparation
------------------------------------------------------------------ */

function createSchoolPoints(geojson) {
  const features = geojson.features
    .map((feature, index) => {
      const lat = toNumber(feature.properties["Latitude"]);
      const lon = toNumber(feature.properties["Longitude"]);

      if (lat === null || lon === null) return null;

      const ptaClean = cleanPTAStatus(feature.properties["PTA Status"]);

      return {
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: [lon, lat]
        },
        properties: {
          ...feature.properties,
          school_id: index,
          pta_clean: ptaClean
        }
      };
    })
    .filter(Boolean);

  return {
    type: "FeatureCollection",
    features
  };
}

function cleanPTAStatus(value) {
  if (!value) return "UNKNOWN";

  const status = String(value).trim().toUpperCase();

  if (status === "YES") return "YES";
  if (status === "NO") return "NO";
  if (status === "INACTIVE") return "INACTIVE";

  return "UNKNOWN";
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

  map.on("mouseenter", "income-fill", e => {
    map.getCanvas().style.cursor = "pointer";

    const props = e.features[0].properties;

    popup
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${props.name || "Census tract"}</strong><br>
        Median household income: ${formatMoney(props["Median household income"])}
      `)
      .addTo(map);
  });

  map.on("mouseleave", "income-fill", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  map.on("mouseenter", "majority-fill", e => {
    map.getCanvas().style.cursor = "pointer";

    const props = e.features[0].properties;

    popup
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${props.name || "Census tract"}</strong><br>
        Majority group: ${props.Majority || "Unknown"}<br>
        Median household income: ${formatMoney(props["Median household income"])}
      `)
      .addTo(map);
  });

  map.on("mouseleave", "majority-fill", () => {
    map.getCanvas().style.cursor = "";
    popup.remove();
  });

  map.on("mouseenter", "school-points", e => {
    map.getCanvas().style.cursor = "pointer";

    const props = e.features[0].properties;

    popup
      .setLngLat(e.lngLat)
      .setHTML(`
        <strong>${props["School Name"] || "School"}</strong><br>
        ${props.Address || "Address unavailable"}<br>
        PTA: ${props["PTA Status"] || "Unknown"}<br>
        Majority group: ${props.Majority || "Unknown"}<br>
        Median household income: ${formatMoney(props["Median household income"])}<br>
        Census tract population: ${formatNumber(props["Total Population"])}
      `)
      .addTo(map);
  });

  map.on("mouseleave", "school-points", () => {
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
      <span>Has active PTA</span>
    </div>

    <div class="legend-row">
      <span class="legend-dot" style="background:${ptaColors.NO}"></span>
      <span>No PTA</span>
    </div>

    <div class="legend-row">
      <span class="legend-dot" style="background:${ptaColors.INACTIVE}"></span>
      <span>Has inactive PTA</span>
    </div>
  `;
}

function renderMajorityLegend() {
  const legend = document.getElementById("legend");

  legend.innerHTML = `
    <h3>Majority group</h3>

    <div class="legend-row">
      <span class="legend-swatch" style="background:${majorityColors.WHITE}"></span>
      <span>White</span>
    </div>

    <div class="legend-row">
      <span class="legend-swatch" style="background:${majorityColors.BLACK}"></span>
      <span>Black</span>
    </div>

    

    <h3 style="margin-top:16px;">PTA status</h3>

    <div class="legend-row">
      <span class="legend-dot" style="background:${ptaColors.YES}"></span>
      <span>Has active PTA</span>
    </div>

    <div class="legend-row">
      <span class="legend-dot" style="background:${ptaColors.NO}"></span>
      <span>No PTA</span>
    </div>

    <div class="legend-row">
      <span class="legend-dot" style="background:${ptaColors.INACTIVE}"></span>
      <span>Has inactive PTA</span>
    </div>
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