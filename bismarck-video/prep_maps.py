import json, math
W,H=1080,1100
LON0,LAT0=10.4,51.2
K=72  # px per degree lat
cosl=math.cos(math.radians(LAT0))
def P(lon,lat): return (W/2+(lon-LON0)*cosl*K, H/2-(lat-LAT0)*K)
NON_DE={'France','Switzerland','Austrian Empire','Denmark','Sweden–Norway','Russian Empire','Republic of Kraków','Luxembourg','Belgium','Netherlands','Austria Hungary','Slovakia','Hungary','Poland','Czech Republic','Russia','Sweden','Austria','Liechtenstein','Italy',None,'','       '}
DE1815={'Palatinate','Hohenzollern','Baden','Saxony','Prussia','Mecklenburg-Strelitz','Grand Duchy of Hesse','Nassau','Wetzlar','Waldeck','Lippe-Detmold','Brunswick','Anhalt','Mecklenburg-Schwerin','Thuringia','Lübeck','Oldenburg','Hanover','Electoral Hesse','Bremen','Cuxhaven','Schleswig','Holstein','Hamburg','Schaumburg-Lippe','Bavaria','Württemberg'}
def rings(g):
    if g['type']=='Polygon': return g['coordinates']
    if g['type']=='MultiPolygon': return [r for p in g['coordinates'] for r in p]
    return []
def path(g):
    out=[]
    for r in rings(g):
        pts=[P(*c[:2]) for c in r]
        if all(x<-200 or x>W+200 for x,y in pts) or all(y<-200 or y>H+200 for x,y in pts): continue
        s=[];last=None
        for x,y in pts:
            q=(round(x,1),round(y,1))
            if last and abs(q[0]-last[0])<0.8 and abs(q[1]-last[1])<0.8: continue
            s.append(q);last=q
        if len(s)<3: continue
        out.append('M'+'L'.join(f'{x},{y}' for x,y in s)+'Z')
    return ''.join(out)
res={}
for y in (1815,1880,2000):
    d=json.load(open(f'data/world_{y}.geojson'))
    feats=[]
    for f in d['features']:
        if not f['geometry']: continue
        p=path(f['geometry'])
        if not p: continue
        n=f['properties'].get('NAME')
        de = (n in DE1815) if y==1815 else (n=='Germany')
        feats.append({'name':n,'de':de,'d':p})
    res[y]=feats
    print(y,len(feats),sum(f['de'] for f in feats))
json.dump(res,open('maps.json','w'))
