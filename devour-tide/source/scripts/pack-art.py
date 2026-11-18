"""Pack original production paintings: python pack-art.py DIRECTORY_WITH_MASTER_PNGS"""
from pathlib import Path
import sys
import math
import cv2
import numpy as np
from PIL import Image

SOURCE = Path(sys.argv[1])
OUTPUT = Path(__file__).resolve().parents[1] / "src" / "illustrations"
OUTPUT.mkdir(exist_ok=True)

def cells(sheet, columns, rows):
    width, height = sheet.size
    for i in range(columns * rows):
        x, y = i % columns, i // columns
        yield sheet.crop((round(x * width / columns), round(y * height / rows),
                          round((x + 1) * width / columns), round((y + 1) * height / rows)))

def subject(cell):
    # Remove low-alpha generation residue, and isolate the main connected silhouette.
    rgba = np.array(cell.convert("RGBA"))
    alpha = rgba[:, :, 3]
    count, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 27).astype("uint8"))
    if count < 2:
        raise ValueError("Empty sprite cell")
    largest = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
    mask = cv2.dilate((labels == largest).astype("uint8"), np.ones((9, 9), "uint8"))
    alpha[(mask == 0) | (alpha < 16)] = 0
    result = Image.fromarray(rgba)
    return result.crop(result.getchannel("A").getbbox())

def prepare_animals(name, columns, rows, w, h, motion):
    sheet = Image.open(SOURCE / (name + ".png"))
    atlas = Image.new("RGBA", (8 * w, columns * rows * h))
    yy, xx = np.mgrid[:h,:w].astype("float32")
    for i, cell in enumerate(cells(sheet, columns, rows)):
        animal = subject(cell)
        animal.thumbnail((w - 12,h - 16),Image.Resampling.LANCZOS)
        frame = Image.new("RGBA",(w,h))
        frame.paste(animal,((w-animal.width)//2,(h-animal.height)//2))
        pixels = np.array(frame)
        bend = np.clip((0.78 - xx/w)/0.78,0,1)**1.6
        for phase in range(8):
            t = phase * math.tau / 8
            if motion.get(i) == "wing":
                sy = yy + (yy-h/2) * 0.12 * np.sin(t - xx/w)
                sx = xx + 1.4 * np.sin(t + yy/h*2)
            elif motion.get(i) == "upright":
                sx = xx + (yy/h)**2 * 4 * np.sin(t + yy/h*2.5)
                sy = yy + (yy-h/2)*0.025*math.cos(t)
            else:
                sy = yy + bend * (h*0.068) * np.sin(t + xx/w*3)
                sx = xx + bend * (w*0.038) * math.cos(t)
            warped = cv2.remap(pixels,sx.astype("float32"),sy.astype("float32"),cv2.INTER_LINEAR)
            atlas.paste(Image.fromarray(warped),(phase*w,i*h))
    atlas.save(OUTPUT / (name+".webp"),quality=85,method=5)

prepare_animals("fish",4,2,192,144,{6:"upright",7:"wing"})
prepare_animals("wild",4,3,148,104,{5:"upright"})
prepare_animals("guardians",3,2,252,180,{2:"wing",4:"upright"})
props = Image.new("RGBA",(4*132,4*132))
for i,cell in enumerate(cells(Image.open(SOURCE/"props.png"),4,4)):
    prop = subject(cell)
    prop.thumbnail((124,124),Image.Resampling.LANCZOS)
    props.paste(prop,((i%4)*132+(132-prop.width)//2,(i//4)*132+128-prop.height))
props.save(OUTPUT/"props.webp",quality=86,method=5)
from PIL import ImageOps
sea = Image.new("RGB",(1024,864))
for i,name in enumerate(("reef","trench","ice","vents","ruins","abyss")):
    painting = Image.open(SOURCE/(name+".png")).convert("RGB")
    painting.thumbnail((1600,1050),Image.Resampling.LANCZOS)
    painting.save(OUTPUT/("sea-"+name+".webp"),quality=86,method=5)
    small = ImageOps.fit(painting,(512,288),method=Image.Resampling.LANCZOS)
    sea.paste(small,(i%2*512,i//2*288))
sea.save(OUTPUT/"biomes.webp",quality=82,method=5)
cover = Image.open(SOURCE/"cover.png").convert("RGB")
cover.thumbnail((1440,1000),Image.Resampling.LANCZOS)
cover.save(OUTPUT/"escape.webp",quality=87,method=5)
