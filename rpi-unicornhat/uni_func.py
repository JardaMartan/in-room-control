'''
Created on Nov 21, 2016

@author: jmartan
'''

import unicornhat as unicorn

unicorn.set_layout(unicorn.AUTO)
unicorn.rotation(180)
unicorn.brightness(0.8)
width,height=unicorn.get_shape()

# RGB colors
# http://www.december.com/html/spec/color16codes.html
# http://www.rapidtables.com/web/color/RGB_Color.htm
BLACK=(0,0,0)
GREY=(128,128,128)
SILVER=(192,192,192)
WHITE=(255,255,255)
MAROON=(128, 0, 0)
BROWN=(165,42,42)
FIREBRICK=(178,34,34)
CRIMSON=(220,20,60)
RED=(255, 0, 0)
TOMATO=(255,99,71)
CORAL=(255,127,80)
INDIAN_RED=(205,92,92)
SALMON=(250,128,114)
ORANGE=(255,165,0)
OLIVE=(128, 128, 0)
YELLOW=(255, 255, 0)
GREEN=(0, 128, 0)
FOREST_GREEN=(34,139,34)
LIME=(0, 255, 0)
TEAL=(0, 128, 128)
AQUA=(0, 255, 255)
TURQUOISE=(64,224,208)
NAVY=(0, 0, 128)
BLUE=(0, 0, 255)
INDIGO=(75,0,130)
PURPLE=(128, 0, 128)
PLUM=(221,160,221)
VIOLET=(238,130,238)
FUCHSIA=(255, 0, 255)
ORCHID=(218,112,214)
PINK=(255,192,203)
BISQUE=(255,228,196)
CHOCOLATE=(210,105,30)

COLOR_LETTER = {
    ' ': BLACK,
    'A': AQUA,
    'B': BLUE,
    'C': CHOCOLATE,
    'E': GREY,
    'F': FUCHSIA,
    'G': GREEN,
    'L': LIME,
    'M': MAROON,
    'N': NAVY,
    'O': ORANGE,
    'P': PURPLE,
    'R': RED,
    'S': SILVER,
    'T': TEAL,
    'V': VIOLET,
    'W': WHITE,
    'Y': YELLOW
    }


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

COLOR_SMILE = [
     "  XXXX  "
    ," X    X "
    ,"X A  A X"
    ,"X      X"
    ,"X R  R X"
    ,"X  RR  X"
    ," X    X "
    ,"  XXXX  "
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

def display_pic(pic, x_color=RED):
    for h in range(height):
        for w in range(width):
            hPos = h % len(pic)
            char = pic[hPos][w]
#             print("char at {}:{} - {}".format(h, w, char))
            if char == 'X':
                unicorn.set_pixel(w, h, x_color[0], x_color[1], x_color[2])
            elif char in COLOR_LETTER.keys():
                unicorn.set_pixel(w, h, COLOR_LETTER[char][0], COLOR_LETTER[char][1], COLOR_LETTER[char][2])
            else:
                print('unknown color character {} at position {}, {}'.format(char, h, w))
    unicorn.show()
