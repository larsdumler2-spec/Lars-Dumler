# Schneidet Pausen im Voiceover, beschleunigt leicht und gibt Satz-Zeitmarken aus
import subprocess, json, re
DROP=set()
SRC='vo/james2.mp3'; TEMPO=1.10; LEAD=0.25
out=subprocess.run(['ffmpeg','-hide_banner','-i',SRC,'-af','silencedetect=noise=-38dB:d=0.22','-f','null','-'],capture_output=True,text=True).stderr
st=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',out)]
en=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',out)]
dur=float(subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','csv=p=0',SRC],capture_output=True,text=True).stdout)
segs=[]; a=0.0
for s,e in zip(st,en):
    segs.append((max(0,a-0.06), s+0.06)); a=e
segs.append((a-0.06,dur))
keep=[i for i in range(len(segs)) if i not in DROP]
BREAK_AFTER={0,1,3,4,6,7,9,14,15}
DROP=set()
filt=[];t=LEAD;marks=[]
for i in keep:
    a,b=segs[i]
    L=(b-a)/TEMPO; marks.append((round(t,2),round(t+L,2))); t+=L
    t+= (0.26 if i in BREAK_AFTER else 0.10)/TEMPO*1.0
print(json.dumps(marks)); print('Ende Stimme:',round(t,2))
parts=[];inputs=''
fc=[]
for i in keep:
    a,b=segs[i]
    fc.append(f"[0:a]atrim={a}:{b},asetpts=PTS-STARTPTS,atempo={TEMPO},afade=t=in:d=0.03,afade=t=out:st={(b-a)/TEMPO-0.04}:d=0.04[s{i}]")
    gap=(0.26 if i in BREAK_AFTER else 0.10)/TEMPO
    fc.append(f"anullsrc=r=44100:cl=mono,atrim=0:{gap}[g{i}]")
chain=''.join(f'[s{i}][g{i}]' for i in keep)
fc.append(f"anullsrc=r=44100:cl=mono,atrim=0:{LEAD}[lead]")
fc.append(f"[lead]{chain}concat=n={2*len(keep)+1}:v=0:a=1,aresample=44100[o]")
subprocess.run(['ffmpeg','-y','-loglevel','error','-i',SRC,'-filter_complex',';'.join(fc),'-map','[o]','-ac','1','vo/voice.wav'],check=True)
json.dump(marks,open('vo/marks.json','w'))
