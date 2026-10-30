# Ruhige, epische Hintergrundmusik: Streicher-Pads, Bass, Klavier-Motiv, Pauken-Swells
import numpy as np, wave
SR=44100; DUR=45.5
N=int(SR*DUR); t=np.arange(N)/SR
K=45.0/59.0  # Zeitachse der 59-s-Fassung auf 45 s gestaucht
rng=np.random.default_rng(7)
def midi(m): return 440*2**((m-69)/12)
def lowpass(x, fc):
    # einfacher 2-Pol-Tiefpass (zweimal 1-Pol)
    a=np.exp(-2*np.pi*fc/SR); y=np.empty_like(x)
    for _ in range(2):
        acc=0.0
        from scipy.signal import lfilter
        y=lfilter([1-a],[1,-a],x); x=y
    return y
try:
    import scipy
except ImportError:
    raise SystemExit('scipy fehlt')
from scipy.signal import lfilter, fftconvolve
def lp(x,fc):
    a=np.exp(-2*np.pi*fc/SR)
    return lfilter([1-a],[1,-a],lfilter([1-a],[1,-a],x))
def saw(f, n, detune=0.0, phase=0.0):
    ph=np.cumsum(np.full(n, f*(1+detune))/SR)+phase
    return 2*(ph%1)-1
def env(n, a, r):
    e=np.ones(n); ai=int(a*SR); ri=int(r*SR)
    e[:ai]=np.linspace(0,1,ai)**1.5; e[-ri:]*=np.linspace(1,0,ri)**1.5; return e
out=np.zeros((N,2))
# Akkorde: d-Moll Stimmung, am Ende Richtung F-Dur (hoffnungsvoll)
prog=[ # (start, dauer, Töne)
 (0.0,7.4,[38,50,57,62,65]),       # Dm
 (7.4,4.0,[34,46,53,58,62]),       # Bb
 (11.4,3.8,[36,48,55,60,64]),      # C
 (15.2,5.0,[38,50,57,62,65]),      # Dm
 (20.2,5.0,[34,46,53,58,65]),      # Bb (add)
 (25.2,4.0,[41,53,57,60,65]),      # F
 (29.2,3.6,[36,48,55,60,67]),      # C
 (32.8,4.4,[38,50,57,62,65]),      # Dm
 (37.2,4.0,[34,46,53,58,62]),      # Bb
 (41.2,4.0,[41,53,57,60,65]),      # F
 (45.2,4.0,[36,48,55,60,64]),      # C
 (49.2,4.2,[38,50,57,62,69]),      # Dm
 (53.4,6.1,[41,53,60,65,69]),      # F (Schluss)
]
for st,d,notes in prog:
    st,d=st*K,d*K
    i0=int(st*SR); n=int((d+1.6)*SR); n=min(n,N-i0)
    e=env(n,1.4,1.8)
    for k,m in enumerate(notes):
        f=midi(m); v=np.zeros(n)
        for dt in (-0.004,0.0,0.0045):
            v+=saw(f,n,dt,rng.random())
        cut=900 if m<45 else 1700
        v=lp(v,cut)*(0.10 if m<45 else 0.06)
        # langsames Vibrato über Amplitude
        v*=1+0.08*np.sin(2*np.pi*(4.6+k*.3)*np.arange(n)/SR+k)
        pan=0.5+0.35*((k%2)*2-1)*(k/len(notes))
        out[i0:i0+n,0]+=v*e*(1-pan)*2; out[i0:i0+n,1]+=v*e*pan*2
# Klavier-Motiv (sanft, sparsam)
def piano(m, st, vel=0.18, dur=3.0):
    i0=int(st*SR); n=min(int(dur*SR),N-i0); tt=np.arange(n)/SR; f=midi(m)
    v=sum(np.sin(2*np.pi*f*h*tt)*(0.55**(h-1))*np.exp(-tt*(1.6+h*.9)) for h in range(1,6))
    v*=np.minimum(1,tt/0.005)*vel
    out[i0:i0+n,0]+=v*0.9; out[i0:i0+n,1]+=v*1.1
motif=[(69,0),(65,.75),(62,1.5),(64,2.25),(65,3.0)]
for base in (1.0,13.7,26.4,40.2):
    for m,o in motif: piano(m, base+o)
for base in (18.9,32.4):
    for m,o in [(72,0),(69,.75),(65,1.5),(67,2.25),(69,3.0)]: piano(m, base+o, .16)
# Pauken-Swells an Szenenwechseln
def timp(st, vel=.5):
    i0=int(st*SR); n=min(int(3.5*SR),N-i0); tt=np.arange(n)/SR
    f=midi(38)*(1+0.03*np.exp(-tt*6))
    v=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-tt*1.4)
    nz=lp(rng.normal(0,1,n),400)*np.exp(-tt*8)*0.6
    v=(v+nz)*vel*np.minimum(1,tt/0.004)
    out[i0:i0+n]+=v[:,None]*0.5
for s in (0.2,6.2,13.5,16.0,18.6,26.2,39.8): timp(s, .55 if s in (0.2,16.0,39.8) else .35)
# Hall: exponentiell abklingendes Rauschen
irn=int(2.8*SR); ti=np.arange(irn)/SR
ir=np.stack([rng.normal(0,1,irn),rng.normal(0,1,irn)],1)*np.exp(-ti*2.3)[:,None]
ir[:,0]=lp(ir[:,0],5000); ir[:,1]=lp(ir[:,1],5000); ir/=np.abs(ir).sum(0)*0.02
wet=np.stack([fftconvolve(out[:,c],ir[:,c])[:N] for c in range(2)],1)
mix=out*0.6+wet*0.55
# Ein-/Ausblenden, Normalisieren
mix[:int(0.6*SR)]*=np.linspace(0,1,int(0.6*SR))[:,None]
mix[-int(3*SR):]*=np.linspace(1,0,int(3*SR))[:,None]
mix=np.tanh(mix/np.abs(mix).max()*1.2)*0.8
pcm=(mix*32767).astype('<i2')
with wave.open('music.wav','wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok')
