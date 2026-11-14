# NASA Data, Partner References, and Submission Preparation

Verified against official resources on November 14, 2026. This guide distinguishes implemented resource use from research context and planned integrations. Use the selected challenge's current submission guide to confirm the exact fields and eligibility requirements.

## NASA resources and actual project use

| Resource | Verified use and limits |
| --- | --- |
| [NASA Human Research Roadmap](https://humanresearchroadmap.nasa.gov/) and [NASA astronaut health guidance](https://www.nasa.gov/missions/station/faq-the-real-story-about-astronaut-health-care-in-space/) | Support the muscle/bone countermeasure problem and the 2.5-hour scheduled ISS exercise reference. The catalog's exercise loads, joint thresholds, and gravity-related readiness settings are project choices, not NASA clinical prescriptions. |
| [NASA gravity reference](https://ntrs.nasa.gov/api/citations/20250009282/downloads/2025%20IAC%20-%20Why%20Moon%20and%20Mars%20-%200916%20Edits.pdf?attachment=true) | Describes microgravity transit and approximate Moon/Mars gravity. Catalog values 0g, 0.16g, and 0.38g are environment approximations; they do not define ARED loading multipliers. |
| [NASA OSDR](https://science.nasa.gov/biological-physical/data/osdr/) and [NASA Life Sciences Portal / LSDA](https://nlsp.nasa.gov/) | Research references for planned 30-day retention and Flight Surgeon reporting. No participant records have been imported. The 70/30 retention equation and telemetry schema are team-defined; they have not been validated using these repositories. OSDR's Ames Life Sciences Data Archive (ALSDA) and LSDA are distinct resources. |
| [NASA PDS MGS MOLA archive](https://pds-geosciences.wustl.edu/missions/mgs/mola.html) | Official topographic profiles and gridded maps are available here. The current app does not ingest a MOLA raster, compute a terrain route, or derive its waypoints from elevation data. |
| [NASA/JPL Mars dimensions](https://www.jpl.nasa.gov/news/press_kits/insight/landing/facts/mars-at-a-glance/) | Supports the approximate Valles Marineris length of 4,000 km and Olympus Mons diameter of 600 km used in the catalog. The 600 km game expedition is not a measured summit ascent. The 250 kg-to-1 km conversion is a project game mechanic. |

The sources are visible in the app and recorded in `src/content/scienceSources.json`. The catalog uses NASA geographic reference values; a stronger dataset-based submission would additionally name the actual dataset/product identifier, document its transformation, and show where its output is used. Do not claim to have processed records or terrain products that the prototype does not load.

## 2026 Space Agency Partner references

The [official 2026 Space Apps announcement](https://www.spaceappschallenge.org/blog/explore-the-next-frontier-at-the-2026-nasa-space-apps-challenge/) lists CSA, ESA, and JAXA as partners. Our citations identify scientific context rather than an agency-provided exercise algorithm.

- **CSA:** [TBone](https://www.asc-csa.gc.ca/eng/sciences/tbone.asp) concerns bone changes and recovery; [MARROW](https://www.asc-csa.gc.ca/eng/sciences/marrow.asp) concerns marrow and blood-cell changes. These inform the motivation for monitoring, without imported participant measurements.
- **ESA:** [Mars500](https://www.esa.int/pt/articles/mars500-study-overview) used a 20-minute communication delay; [EchoFinder-2](https://www.esa.int/ESA_Multimedia/Images/2026/01/Finding_the_echo) illustrates autonomous health assessment. A.R.E.S.'s 24-minute blackout is its own resilience scenario, not an ESA-mandated protocol.
- **JAXA:** [Kibo Zebrafish Muscle 2](https://humans-in-space.jaxa.jp/en/biz-lab/experiment/theme/detail/000854.html) investigates microgravity muscle atrophy and potential countermeasures. Its animal-study parameters are not used as human exercise thresholds.

## Global Judging eligibility review

Confirm registration, submission and Global Judging requirements using the [official 2026 event page](https://www.spaceappschallenge.org/2026/) and the selected challenge's current guide. The GO Team's [resource-use clarification](https://github.com/nasa/spaceapps/discussions/1827) specifies at least one NASA data source from the challenge's Resources and citation of all materials used. Partner-resource use and other requirements must be checked against the selected challenge; this repository does not record a verified official challenge selection.

For the NASA-data and partner-reference submission fields, describe exactly the implemented resource use above. Registration, the chosen challenge, submission completion, team eligibility, and the organizers' review are not established by adding citations to a website. No award eligibility decision has been made for this project.

## Hosting and FortiGuard preparation

See [deployment notes](DEPLOYMENT.md). Build and verify the complete static `dist/` directory before connecting the intended repository to Vercel or Netlify. A stable production URL is needed before a classification request can be prepared.

For the [FortiGuard web-filter rating request](https://www.fortiguard.com/webfilter), use the permanent deployed HTTPS URL. Requested submission fields are **Category: Web-based Applications** and **Company Name: N/A**, subject to the live form's available options. Aim for the team's requested 24-hour lead time; classification turnaround is not guaranteed. The FortiGuard page could not be inspected from this environment (HTTP 403), so its current fields and processing time were not independently confirmed.

This preparation has not deployed a public URL or submitted a web-filter request.

## Scientific-context audit — November 14, 2026

The implemented score and exported reports must not be described as measured muscle retention, bone density or clinically validated strength. The app now keeps the same prototype context in its UI, JSON and CSV outputs. Scenario goals and personalized targets remain team-defined; initial history is synthetic.

NASA's [communications analysis](https://ntrs.nasa.gov/citations/20220013418) distinguishes light-time delay from disruption/blackout. The app's 24-minute blackout is a manually selected demo state without a countdown or physical latency simulation. It is not a NASA protocol or a real Mission Control connection.

Source retrieval limits and repository checks are recorded in [the scientific and repository audit](SCIENTIFIC_AND_REPOSITORY_AUDIT.md). In particular, the interactive NLSP contents and the current official event/submission pages were not fully inspectable during this pass. Verify the selected challenge and live submission requirements before making eligibility claims.
