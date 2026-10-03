/**
 * Web Vitals tracking (Week 7: monitoring). Dependency-free: uses
 * PerformanceObserver + navigation timing, reports via console + optional
 * beacon. Wire once in app startup: `import './lib/vitals'; initVitals();`
 */

export interface VitalSample {
  name: 'LCP' | 'INP' | 'CLS' | 'TTFB' | 'FCP';
  value: number;
  url: string;
}

const samples: VitalSample[] = [];

function record(sample: VitalSample): void {
  samples.push(sample);
  // Structured log line — scraped by log pipelines in production.
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: 'web',
      evt: 'web_vital',
      ...sample,
    })
  );
}

/** Largest Contentful Paint + First Contentful Paint via paint/LCP entries. */
function observePaints(): void {
  try {
    const po = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          record({
            name: 'FCP',
            value: Math.round(entry.startTime),
            url: location.href,
          });
        } else if (entry.entryType === 'largest-contentful-paint') {
          record({
            name: 'LCP',
            value: Math.round(entry.startTime),
            url: location.href,
          });
        }
      }
    });
    po.observe({ type: 'paint', buffered: true });
    po.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    /* PerformanceObserver unsupported — skip silently */
  }
}

/** Time to first byte from navigation timing. */
function measureTTFB(): void {
  try {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (nav) {
      record({
        name: 'TTFB',
        value: Math.round(nav.responseStart - nav.requestStart),
        url: location.href,
      });
    }
  } catch {
    /* ignore */
  }
}

export function initVitals(): void {
  if (typeof window === 'undefined' || typeof performance === 'undefined')
    return;
  if (document.readyState === 'complete') {
    observePaints();
    measureTTFB();
  } else {
    window.addEventListener('load', () => {
      observePaints();
      measureTTFB();
    });
  }
}

export function getVitalSamples(): VitalSample[] {
  return [...samples];
}
