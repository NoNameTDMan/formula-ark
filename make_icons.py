from PIL import Image, ImageDraw, ImageFilter, ImageFont
from pathlib import Path
import math
OUT=Path(__file__).parent/'icons'
OUT.mkdir(exist_ok=True)
for resolution,name in [(192,'icon-192.png'),(512,'icon-512.png'),(180,'apple-touch-icon.png')]:
    S=1024
    im=Image.new('RGB',(S,S),(9,16,32));d=ImageDraw.Draw(im)
    for y in range(S):
        t=y/S
        d.line((0,y,S,y),fill=(int(11+10*(1-t)),int(18+15*(1-t)),int(32+29*(1-t))))
    # subtle radiance around the crest
    light=Image.new('RGBA',(S,S),(0,0,0,0));g=ImageDraw.Draw(light)
    g.ellipse((215,215,810,810), fill=(228,176,105,70))
    light=light.filter(ImageFilter.GaussianBlur(105))
    im=Image.alpha_composite(im.convert('RGBA'),light)
    d=ImageDraw.Draw(im)
    cx=cy=S//2
    # Outer rotated orbital ring
    for k,(r,col,w) in enumerate([(332,(97,119,162,110),6),(265,(212,178,124,140),4)]):
        d.arc((cx-r,cy-r,cx+r,cy+r),-63,149,fill=col,width=w)
        d.arc((cx-r,cy-r,cx+r,cy+r),172,300,fill=col,width=w)
    points=[(512,202),(821,512),(512,822),(202,512)]
    d.polygon(points,fill=(29,43,67,255))
    d.line(points+[points[0]],fill=(241,198,137,255),width=17,joint='curve')
    points2=[(512,286),(740,512),(512,739),(285,512)]
    d.line(points2+[points2[0]],fill=(156,151,140,135),width=6,joint='curve')
    d.line((512,353,512,675),fill=(243,203,149,255),width=24)
    d.line((380,512,645,512),fill=(243,203,149,255),width=22)
    d.ellipse((506,499,522,515),fill=(255,242,213,255))
    d.ellipse((258,256,285,283),fill=(243,199,137,255))
    d.ellipse((766,713,781,728),fill=(141,224,212,255))
    im=im.convert('RGB').resize((resolution,resolution),Image.Resampling.LANCZOS)
    im.save(OUT/name,optimize=True)
    print(name,im.size)
