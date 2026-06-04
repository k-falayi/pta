# Schools, PTAs and Neighborhood Income

An interactive Mapbox GL visualization exploring the relationship between neighborhood wealth and the presence of Parent Teacher Associations (PTAs) in schools.

The project combines school-level PTA data with census tract demographic and economic data to examine whether schools located in higher-income neighborhoods are more likely to have active PTAs.

## Overview

Research has consistently shown that Parent Teacher Associations can provide schools with additional volunteer support, fundraising capacity, and parent engagement. However, PTA participation is often influenced by socioeconomic conditions.

This project visualizes that relationship by mapping:

- Median household income by census tract
- School locations
- Whether each school has a PTA
- Neighborhood racial composition through a dot-density map

The map allows users to switch between two views:

### 1. PTA and Income View

- Census tracts are shaded according to median household income.
- Schools are displayed as points.
- Green markers represent schools with PTAs.
- Red markers represent schools without PTAs.

This view helps users visually assess whether PTA presence is concentrated in wealthier neighborhoods.

### 2. Race Dot Density View

- Census tracts remain visible as a muted income layer.
- Colored dots represent the racial composition of each tract.
- Each dot represents approximately 100 residents.

This view provides demographic context for neighborhoods where schools have or do not have PTAs.

---

## Data Sources

### School Data

School records include:

- School name
- Address
- PTA status (Yes/No)
- Geographic coordinates

Coordinates are derived from:

- Geocodio Latitude
- Geocodio Longitude

### Census Tract Data

The census tract layer contains:

- Median household income
- Total population
- Racial composition

Race categories include:

- White only
- Black alone
- American Indian and Alaska Native (AIAN) alone
- Asian alone
- Pacific Islander alone
- Some other races

---

## Methodology

### Income Layer

Census tracts are classified into five income groups:

| Median Household Income | Color |
|-------------------------|--------|
| Under $40,000 | Light tan |
| $40,000–$59,999 | Tan |
| $60,000–$79,999 | Orange |
| $80,000–$99,999 | Brown |
| $100,000+ | Dark brown |

This allows users to quickly identify patterns between neighborhood wealth and PTA presence.

### School Mapping

Each school is plotted using its geocoded coordinates.

Markers are colored according to PTA status:

| Status | Color |
|----------|---------|
| PTA Present | Green |
| No PTA | Red |

Clicking or hovering over a school displays:

- School name
- Address
- PTA status
- Median household income
- Census tract population

### Dot Density Method

The race view uses a dot-density technique.

For each census tract:

1. Total population is retrieved.
2. Population counts are estimated using racial percentages.
3. One dot is generated for every 100 residents.
4. Dots are randomly distributed inside the tract boundary using Turf.js.

This method provides an intuitive visual representation of demographic composition without revealing individual locations.

---

## Technology Stack

### Mapping

- Mapbox GL JS

### Spatial Analysis

- Turf.js

### Front-End

- HTML5
- CSS3
- Vanilla JavaScript

### Data Format

- GeoJSON

---

## File Structure

text project/ │ ├── index.html ├── style.css ├── script.js │ └── data/     └── school_geo.geojson 

---

## Running the Project

Clone the repository:

bash git clone https://github.com/yourusername/pta.git 

Navigate to the project directory:

bash cd pta 

Serve locally using Python:

bash python -m http.server 8000 

Then open:

text http://localhost:8000 

A local server is required because browsers restrict loading local GeoJSON files directly from the filesystem.

---

## Research Questions

This project was designed to help explore questions such as:

- Are schools with PTAs concentrated in wealthier neighborhoods?
- Are schools without PTAs more common in lower-income areas?
- How does neighborhood racial composition intersect with PTA availability?
- Are there geographic clusters of schools lacking PTAs?

The map is intended as an exploratory tool rather than proof of causation.

---

## Future Improvements

Potential enhancements include:

- Statistical correlation analysis between income and PTA presence
- School enrollment and student poverty metrics
- PTA fundraising totals
- School performance indicators
- Search functionality
- County-level filtering
- Additional demographic layers

---


This project was developed as a data journalism tool to examine how educational support structures vary across communities and how those patterns relate to neighborhood demographics and economic conditions.
