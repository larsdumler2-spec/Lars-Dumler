# Soundeffekte synchron zu den Animationen in video.html (Zeiten aus den Cue-Werten C)
import numpy as np, wave
from scipy.signal import lfilter
SR=44100; DUR=45.0; N=int(SR*DUR)
rng=np.random.default_rng(11)
out=np.zeros((N,2))
C=dict(h1=0.25,h2=1.87,h3=2.9,h4=4.8,n1=7.12,e1=8.58,e2=12.12,m1=15.47,reich=18.0,s1=19.95,s2=24.89,
       t0=27.49,t1=28.21,t2=30.63,t3=32.72,t4=36.3,o1=39.77,o3=41.38)
def lp(x,fc):
    a=np.exp(-2*np.pi*fc/SR); return lfilter([1-a],[1,-a],x)
def hp(x,fc): return x-lp(x,fc)
def lpv(x,fc):
    # Tiefpass mit zeitlich veränderlicher Grenzfrequenz
    a=np.exp(-2*np.pi*fc/SR); y=np.empty_like(x); acc=0.0
    for k in range(len(x)): acc=(1-a[k])*x[k]+a[k]*acc; y[k]=acc
    return y
def place(sig, t0, gain=1.0, pan=0.0):
    i=int(t0*SR)
    if i<0: sig=sig[-i:]; i=0
    n=min(len(sig),N-i)
    if n<=0: return
    out[i:i+n,0]+=sig[:n]*gain*(1-pan)/1.0
    out[i:i+n,1]+=sig[:n]*gain*(1+pan)/1.0
def tt(d): return np.arange(int(d*SR))/SR
def impact(d=1.6, f=48):
    t=tt(d); f_t=f*(1+1.5*np.exp(-t*18))
    body=np.sin(2*np.pi*np.cumsum(f_t)/SR)*np.exp(-t*3.2)
    click=lp(rng.normal(0,1,len(t)),2500)*np.exp(-t*40)*.8
    return (body+click)*np.minimum(1,t/0.002)
def whoosh(d=0.8, f0=300, f1=2500):
    t=tt(d)
    y=hp(lpv(rng.normal(0,1,len(t)), f0+(f1-f0)*np.sin(np.pi*t/d)**2),150); env=np.sin(np.pi*t/d)**2
    return y*env*2.2
def tick(f=2600):
    t=tt(0.05); return np.sin(2*np.pi*f*t)*np.exp(-t*160)*.6+lp(rng.normal(0,1,len(t)),6000)*np.exp(-t*300)*.3
def ping(f=1760, d=1.2):
    t=tt(d); return sum(np.sin(2*np.pi*f*h*t)*a for h,a in ((1,1),(2.01,.3),(3.02,.12)))*np.exp(-t*4)*np.minimum(1,t/0.003)
def shimmer(d=1.6):
    t=tt(d); y=np.zeros_like(t)
    for f in (2093,2637,3136,3951,4186): y+=np.sin(2*np.pi*f*t+rng.random()*6)*(.5+.5*np.sin(2*np.pi*(5+rng.random()*4)*t))
    return y*np.sin(np.pi*t/d)**2*.18
def metal(f=520):
    t=tt(1.4); y=sum(np.sin(2*np.pi*f*r*t)*np.exp(-t*(3+r*2))/r for r in (1,2.76,5.4,8.93))
    return (y+lp(rng.normal(0,1,len(t)),5000)*np.exp(-t*60)*.6)*np.minimum(1,t/0.001)*.5
def thud(f=90):
    t=tt(0.35); return np.sin(2*np.pi*f*(1+np.exp(-t*30))*t)*np.exp(-t*14)+lp(rng.normal(0,1,len(t)),1200)*np.exp(-t*50)*.4
def riser(d=1.2):
    t=tt(d); n=lpv(rng.normal(0,1,len(t)),500+3000*(t/d)**2)
    tone=np.sin(2*np.pi*np.cumsum(120+500*(t/d)**2)/SR)*.3
    return (hp(n,200)*1.5+tone)*(t/d)**2.5

# --- Hook ---
place(impact(1.8,45), C['h1']-0.05, .9); place(whoosh(0.35,400,3000), C['h1']-0.3, .35)
place(impact(1.8,42), C['h2']+0.02, .95); place(whoosh(0.35,400,3000), C['h2']-0.28, .35)
place(riser(0.9), C['h3']-0.9, .45)
place(impact(2.4,36), C['h3']-0.03, 1.0); place(shimmer(2.0), C['h3'], .9)
place(shimmer(1.4), C['h3']+0.7, .5, .3)                       # Lichtschimmer übers Porträt
# Zähler 0 -> 130
for k in range(1,15):
    x=k/14; tk=C['h4']+1.4*(np.arccos(1-2*x)/np.pi)          # Umkehrung eines weichen Verlaufs
    place(tick(2400+k*40), tk, .35)
place(ping(1318,1.0), C['h4']+1.45, .25)
place(whoosh(0.6,300,1800), C['n1']-0.1, .3)
# Szenenwechsel (goldener Lichtstreifen)
for a in (C['e1'],C['m1'],C['s1'],C['t0'],C['o1']):
    place(whoosh(0.8,250,3500), a-0.35, .55, -.2); place(shimmer(1.0), a-0.1, .35, .2)
# Jahreszahl 1815 -> 1862
for k in range(1,22):
    x=k/21; tk=C['e1']+1.6*(np.arccos(1-2*x)/np.pi)
    place(tick(2000+k*25), tk, .3)
place(impact(1.0,70), C['e1']+1.6, .35)
# Kriege: Metallschläge
for i,dt in enumerate((0.9,1.4,1.9)):
    place(whoosh(0.3,600,4000), C['e2']+dt-0.2, .3, -.5); place(metal(480+i*60), C['e2']+dt+0.05, .45, .2*(i-1))
# Karte: Staaten fliegen ein, Einrasten
for k in range(14):
    place(whoosh(0.35,500,3500), C['m1']+0.2+k*0.08+rng.random()*0.3, .12, rng.uniform(-.7,.7))
for k in range(16):
    place(tick(1200+rng.random()*600), C['m1']+1.0+k*0.07+rng.random()*0.2, .22, rng.uniform(-.6,.6))
place(riser(0.6), C['reich']-0.6, .35)
place(impact(2.4,38), C['reich']-0.02, .95); place(shimmer(1.8), C['reich'], .7)
place(ping(880,1.6), C['reich']+0.6, .3)                       # Berlin-Puls
# Sozialgesetze: Karten klappen auf
for dt in (0.5,1.15,1.7):
    place(whoosh(0.3,700,5000), C['s1']+dt-0.05, .35); place(thud(140), C['s1']+dt+0.35, .3)
st0=C['s1']+2.9
for i in range(12):
    place(thud(110+i*4), st0+i*0.045+0.2, .25, (i-6)/8)
place(impact(2.0,40), st0+0.55, .8)
place(impact(1.5,32), C['s2']+0.05, .5); place(whoosh(0.5,200,1500), C['s2']-0.2, .3)
# Heute
place(whoosh(0.5,300,3500), C['t0']-0.3, .4); place(impact(2.0,44), C['t0']+0.05, .9)
place(riser(1.2), C['t1']+0.1, .4)                            # Reichstag wächst
place(shimmer(1.4), C['t1']+1.2, .45)                         # Kuppel leuchtet
for i in range(5):
    place(thud(90+i*20), C['t2']+0.85+i*0.18, .35, (i-2)/3)  # Säulen
place(whoosh(1.2,200,2200), C['t3']+0.1, .3)                  # Umriss zeichnet sich
for i in range(16):
    place(ping(1568+(i%5)*196,0.6), C['t3']+1.2+i*0.07, .09, ((i%7)-3)/4)
for i in range(10):
    place(whoosh(0.5,500,4000), C['t4']+0.3+i*0.1, .12, ((i%5)-2)/3)
    place(ping(1047+(i%4)*262,0.8), C['t4']+1.0+i*0.1, .1, ((i%5)-2)/3)
# Outro
place(impact(2.6,36), C['o1']+0.02, .7); place(shimmer(2.0), C['o1'], .6)
for i in range(3): place(thud(70+i*15), C['o1']+0.3+i*0.45+0.15, .3)
place(shimmer(2.0), C['o3']+1.1, .5)

out/=max(1e-9,np.abs(out).max()); out*=0.9
with wave.open('sfx.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((out*32767).astype('<i2').tobytes())
print('ok')
