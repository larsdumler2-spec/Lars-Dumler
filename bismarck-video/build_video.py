import subprocess,sys,os
S,img,out=sys.argv[1],sys.argv[2],sys.argv[3]
text=open(S+'/rede.txt',encoding='utf-8').read().split()
font='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
t=2.5; lines=[]
def esc(w): return w.replace('\\','\\\\').replace(':','\\:').replace("'","\u2019").replace(',','\\,').replace('%','\\%')
f=[]
for w in text:
    d=0.2+0.03*len(w)
    if w[-1] in '.,–?!': d+=0.2 if w[-1]==',' else 0.45
    f.append(f"drawtext=fontfile={font}:text='{esc(w.strip(',.'))}':fontsize=46:fontcolor=white:borderw=4:bordercolor=black:x=(w-text_w)/2:y=h*0.58:enable='between(t,{t:.2f},{t+d:.2f})'")
    t+=d
T=t+1.5
title=f"drawtext=fontfile={font}:text='Bismarcks Worte':fontsize=40:fontcolor=black:box=1:boxcolor=white@0.95:boxborderw=10:x=(w-text_w)/2:y=h*0.55:enable='lt(t,2.4)',drawtext=fontfile={font}:text='an das Volk':fontsize=40:fontcolor=black:box=1:boxcolor=white@0.95:boxborderw=10:x=(w-text_w)/2:y=h*0.55+62:enable='lt(t,2.4)'"
label=f"drawtext=fontfile={font}:text='KI-generiert · Satire':fontsize=18:fontcolor=white@0.8:x=14:y=h-34"
fps=30;N=int(T*fps)
vf=(f"scale=-2:1024,crop=576:1024:(iw-576)/2-20:0,scale=1152:2048,"
    f"zoompan=z='1+0.08*on/{N}':x='iw/2-(iw/zoom/2)':y='ih*0.18-(ih/zoom*0.18)':d={N}:s=576x1024:fps={fps},"
    +title+','+','.join(f)+','+label)
subprocess.run(['ffmpeg','-y','-v','error','-loop','1','-i',img,'-vf',vf,'-t',f'{T:.2f}','-c:v','libx264','-pix_fmt','yuv420p','-crf','20',out],check=True)
print('dauer',round(T,1))
