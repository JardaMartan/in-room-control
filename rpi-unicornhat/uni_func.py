'''
Created on Nov 21, 2016

@author: jmartan
'''

import unicornhat as unicorn

unicorn.set_layout(unicorn.AUTO)
unicorn.rotation(180)
unicorn.brightness(0.8)
width,height=unicorn.get_shape()

# Every line needs to be exactly 8 characters
# but you can have as many lines as you like.
SMILE = [
     "  XXXX  "
    ," X    X "
    ,"X X  X X"
    ,"X      X"
    ,"X X  X X"
    ,"X  XX  X"
    ," X    X "
    ,"  XXXX  "
    ]

HEART = [
     "        "
    ," X   X  "
    ,"XXX XXX "
    ,"XXXXXXX "
    ," XXXXX  "
    ,"  XXX   "
    ,"   X    "
    ,"        "
    ]

def fill(red, green, blue):
    color = (red, green, blue)
    pixel_arr = [[0]*8]*8
    for y in range(8):
        for x in range(8):
            pixel_arr[y][x] = color
    unicorn.set_pixels(pixel_arr)
    unicorn.show()

def change_fill(red=None, green=None, blue=None):
    pixel_arr = unicorn.get_pixels()
#     print('existing fill: {}'.format(pixel_arr))
    for y in range(8):
        for x in range(8):
            r, g, b = pixel_arr[y][x]
            if red != None:
                r = red
            if green != None:
                g = green
            if blue != None:
                b = blue
            pixel_arr[y][x] = (r, g, b)
#     print('about to fill: {}'.format(pixel_arr))
    unicorn.set_pixels(pixel_arr)
    unicorn.show()

def display_pic(pic):
    for h in range(height):
        for w in range(width):
            hPos = h % len(pic)
            char = pic[hPos][w]
#             print("char at {}:{} - {}".format(h, w, char))
            if char == ' ':
                unicorn.set_pixel(w, h, 0, 0, 0)
            else:
                unicorn.set_pixel(w, h, 255, 0, 0)
    unicorn.show()
