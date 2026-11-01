# Tracé de la N1 depuis OpenStreetMap (Overpass : way[highway][ref~"^N1$"] dans le Togo; out geom;)
# usage : python3 scripts/build_route.py n1.json  (lit scripts/cities.json) -> n1_route.json
import json, math, heapq, sys
d = json.load(open(sys.argv[1]))
R = 6371000.0
def dist(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    x = (lo2 - lo1) * math.cos((la1 + la2) / 2); y = la2 - la1
    return R * math.hypot(x, y)
key = lambda p: (round(p[0], 6), round(p[1], 6))
adj = {}
for w in d['elements']:
    g = [(p['lat'], p['lon']) for p in w['geometry']]
    for a, b in zip(g, g[1:]):
        ka, kb = key(a), key(b); dd = dist(a, b)
        adj.setdefault(ka, []).append((kb, dd)); adj.setdefault(kb, []).append((ka, dd))
# relier les extrémités proches (tronçons non connectés dans OSM)
nodes = list(adj)
grid = {}
for n in nodes: grid.setdefault((int(n[0]*200), int(n[1]*200)), []).append(n)
for n in nodes:
    if len(adj[n]) > 1: continue
    gx, gy = int(n[0]*200), int(n[1]*200)
    for dx in (-1,0,1):
        for dy in (-1,0,1):
            for m in grid.get((gx+dx, gy+dy), []):
                if m != n:
                    dd = dist(n, m)
                    if dd < 400: adj[n].append((m, dd + 50)); adj[m].append((n, dd + 50))
def nearest(p): return min(nodes, key=lambda n: dist(n, p))
CITIES = json.load(open(__file__.rsplit('/',1)[0]+'/cities.json'))
src, dst = nearest(CITIES[0][1:]), nearest(CITIES[-1][1:])
D = {src: 0}; prev = {}; pq = [(0, src)]
while pq:
    du, u = heapq.heappop(pq)
    if u == dst: break
    if du > D.get(u, 1e18): continue
    for v, w in adj[u]:
        nd = du + w
        if nd < D.get(v, 1e18): D[v] = nd; prev[v] = u; heapq.heappush(pq, (nd, v))
path = [dst]
while path[-1] != src: path.append(prev[path[-1]])
path.reverse()
cum = [0]
for a, b in zip(path, path[1:]): cum.append(cum[-1] + dist(a, b))
print('longueur', round(cum[-1] / 1000, 1), 'km', len(path), 'pts', file=sys.stderr)
# rééchantillonnage tous les 250 m
step = 250; out = []; j = 0; s = 0
while s <= cum[-1]:
    while j < len(cum) - 2 and cum[j + 1] < s: j += 1
    t = (s - cum[j]) / max(1e-6, cum[j + 1] - cum[j])
    a, b = path[j], path[j + 1]
    out.append([round(a[0] + (b[0] - a[0]) * t, 5), round(a[1] + (b[1] - a[1]) * t, 5)])
    s += step
cities = []
for name, lat, lon in CITIES:
    i = min(range(len(out)), key=lambda k: dist(out[k], (lat, lon)))
    cities.append({'name': name, 'i': i, 'km': round(i * step / 1000, 1), 'off_m': round(dist(out[i], (lat, lon)))})
for c in cities: print(c, file=sys.stderr)
json.dump({'step': step, 'pts': out, 'places': cities}, open('n1_route.json', 'w'), separators=(',', ':'))
