import sys,os
from PIL import Image
d,out,names=sys.argv[1],sys.argv[2],sys.argv[3].split(',')
ims=[Image.open(os.path.join(d,n+'.png')) for n in names]
w=sum(i.width for i in ims)+10*(len(ims)-1);h=max(i.height for i in ims)
s=Image.new('RGB',(w,h),'white');x=0
for i in ims:s.paste(i,(x,0));x+=i.width+10
s.save(out)
