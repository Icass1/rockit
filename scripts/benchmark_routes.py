"""Measure essential read-only API routes; use only a test account/fixture.

Example: python scripts/benchmark_routes.py --base-url http://localhost:8000 \
    --cookie-file /tmp/test-cookies.txt --samples 20
The Netscape cookie file is private and must never be committed.
"""
import argparse
import http.cookiejar
import json
import statistics
import time
import urllib.error
import urllib.request

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--base-url', required=True)
parser.add_argument('--cookie-file', required=True)
parser.add_argument('--samples', type=int, default=20)
args = parser.parse_args()
if args.samples < 2:
    parser.error('--samples must be at least 2')
jar = http.cookiejar.MozillaCookieJar(args.cookie_file)
jar.load(ignore_discard=True, ignore_expires=True)
client = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
results = []
for path in ['/user/session', '/stats/home', '/user/library/medias', '/user/queue']:
    timings, statuses, sizes = [], [], []
    for attempt in range(args.samples + 1):
        started = time.perf_counter()
        try:
            with client.open(args.base_url.rstrip('/') + path, timeout=30) as response:
                body, status = response.read(), response.status
        except urllib.error.HTTPError as error:
            body, status = error.read(), error.code
        elapsed = (time.perf_counter() - started) * 1000
        if attempt:  # Exclude one warmup per endpoint.
            timings.append(elapsed)
            statuses.append(status)
            sizes.append(len(body))
    results.append(dict(path=path, samples=args.samples, statuses=sorted(set(statuses)),
                        median_ms=round(statistics.median(timings), 1),
                        max_ms=round(max(timings), 1), max_bytes=max(sizes)))
print(json.dumps(results, indent=2))
