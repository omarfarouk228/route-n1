# Contour du Togo depuis OpenStreetMap (Overpass : rel["ISO3166-1"="TG"][admin_level=2]; out geom;)
# usage : python3 scripts/build_outline.py tg.json  -> togo_outline.json
import json, math, sys
d = json.load(open(sys.argv[1]))
rel = d['elements'][0]
ways = [[(p['lat'], p['lon']) for p in m['geometry']] for m in rel['members'] if m['type'] == 'way' and m.get('role') == 'outer']
# chaînage des segments en un anneau
ring = ways.pop(0)
def close(a, b): return abs(a[0]-b[0]) < 1e-7 and abs(a[1]-b[1]) < 1e-7
while ways:
    end = ring[-1]
    for k, w in enumerate(ways):
        if close(w[0], end): ring += w[1:]; ways.pop(k); break
        if close(w[-1], end): ring += w[::-1][1:]; ways.pop(k); break
    else:
        break
def dp(pts, eps):
    if len(pts) < 3: return pts
    a, b = pts[0], pts[-1]
    dmax, idx = 0, 0
    for i in range(1, len(pts) - 1):
        p = pts[i]
        num = abs((b[1]-a[1])*(a[0]-p[0]) - (a[1]-p[1])*(b[0]-a[0]))
        den = math.hypot(b[1]-a[1], b[0]-a[0]) or 1e-9
        dd = num / den
        if dd > dmax: dmax, idx = dd, i
    if dmax > eps: return dp(pts[:idx+1], eps)[:-1] + dp(pts[idx:], eps)
    return [a, b]
h = len(ring) // 2  # anneau fermé : on simplifie les deux moitiés
simp = dp(ring[:h + 1], 0.006)[:-1] + dp(ring[h:], 0.006)
print(len(ring), '->', len(simp), 'restants:', len(ways), file=sys.stderr)
json.dump([[round(a, 4), round(b, 4)] for a, b in simp], open('togo_outline.json', 'w'), separators=(',', ':'))
