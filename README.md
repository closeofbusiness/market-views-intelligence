# Market Views Intelligence (demo idea)

**Live demo:** https://closeofbusiness.github.io/market-views-intelligence/

A concept illustration of a dashboard that structures published market views on rates, FX, inflation, policy rates and commodities: where forecasts cluster, how far they spread, who sits outside the pack, and the sentence behind each number.

## What this is

- A **demo idea**, not a product and not a service.
- A static page with **real, publicly available research data collected once** (snapshot of 30 October 2026). It is **not updated**.
- 827 forecasts and 64 qualitative views from 48 public research documents of 18 institutions, annotated by hand. Every figure links to the source sentence and the original document.
- 18 spoken views from 9 named guests on public podcasts, each with a transcript excerpt and a link to the episode. Excerpts come from machine transcripts and may contain transcription errors; the episode audio is the source of record. These views are qualitative and do not enter the consensus numbers.
- The track-record page shows a design with placeholder forecasters. It contains no real scores.

## What this is not

- Not a market survey. The sample is small and mixes publication dates.
- Not investment advice.
- Not affiliated with, or endorsed by, any institution named. Quotations are short excerpts for illustration; the original documents remain the source of record and belong to their publishers.

## Method in brief

Consensus is the median of the latest value per forecaster for a variable and target period, shown only with at least four sources. Outliers are values further from the median than the larger of a per-variable floor and three scaled median absolute deviations. Forecasts more than 90 days older than the newest in their group are treated as stale and excluded by default. Central-bank projections are shown separately and do not enter the consensus. Details are on the Method page of the demo.

## Running it

Open `docs/index.html` in a browser. There is no build step and the page makes no network requests.

If a publisher would like an excerpt removed, please open an issue.
