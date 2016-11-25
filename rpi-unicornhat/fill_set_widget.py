#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# import Flask

'''
Created on Nov 22, 2016

@author: jmartan
'''

import os,signal
import requests
import argparse
import uni_func
import atexit
import unicornhat

def update_widget(codec_ip, username, password, widget_id, value, unset=False):

# "unset" is needed in a situation when you try to repeatedly set the same value of the widget
# and in the mean time someone changes the widget on the touch panel. Probably a bug.
    widget_unset_xml = '''
<Command>
    <UserInterface>
        <Extensions>
            <Widget>
                <UnsetValue>
                    <WidgetId>{}</WidgetId>
                </UnsetValue>
            </Widget>
        </Extensions>
    </UserInterface>
</Command>
'''.format(widget_id)

    widget_set_xml = '''
<Command>
    <UserInterface>
        <Extensions>
            <Widget>
                <SetValue>
                    <WidgetId>{}</WidgetId>
                    <Value>{}</Value>
                </SetValue>
            </Widget>
        </Extensions>
    </UserInterface>
</Command>
'''.format(widget_id, value)
#     print('about to send: {}'.format(widget_xml))
    print('sending XML command to codec {}, id: {}, value: {}'.format(codec_ip, widget_id, value))
    headers = {'content-type':'text/xml'}
    if unset:
        res = requests.post('http://'+codec_ip+'/putxml', data=widget_unset_xml, headers=headers, auth=(username, password), timeout=1)
        print('unset result: {}'.format(res))
    res = requests.post('http://'+codec_ip+'/putxml', data=widget_set_xml, headers=headers, auth=(username, password), timeout=1)
    print('set result: {}'.format(res))


# run the application
if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Set widget values.')
    parser.add_argument('widget_value', metavar='N', nargs='+',
                        help='"widget_id=value" list')
    parser.add_argument('-c', dest='codec_ip', required=True,
                        help='codec ip address')
    parser.add_argument('-u', dest='username', required=True,
                        help='codec API username')
    parser.add_argument('-p', dest='password', required=True,
                        help='codec API password')
    
    in_args = parser.parse_args()
    print("args: {}".format(in_args))
    
# do not switch the LEDs off
    atexit.unregister(unicornhat._clean_shutdown)

    color_widgets = ['red', 'green', 'blue']
    red, green, blue = (0, 0, 0)
    update_color_widgets = False
    for arg in in_args.widget_value:
        widget_id, value = arg.split('=')
    
        if widget_id == 'red':
            red = int(value)
            update_color_widgets = True
        elif widget_id == 'green':
            green = int(value)
            update_color_widgets = True
        elif widget_id == 'blue':
            blue = int(value)
            update_color_widgets = True
        print('red: {}, green: {}, blue: {}'.format(red, green, blue))
    
        if not widget_id in color_widgets:
            update_widget(in_args.codec_ip, in_args.username, in_args.password, widget_id, value)
    #         time.sleep(0.3)
    
    if update_color_widgets:
        uni_func.change_fill(in_args.codec_ip, red, green, blue)
        update_widget(in_args.codec_ip, in_args.username, in_args.password, 'red', red, unset=True)
        update_widget(in_args.codec_ip, in_args.username, in_args.password, 'green', green, unset=True)
        update_widget(in_args.codec_ip, in_args.username, in_args.password, 'blue', blue, unset=True)

# do not switch the LEDs off - another method
    os.kill(os.getpid(), signal.SIGTERM)

'''
sample XML documents to send to codec

Authorization: Basic with API user_id and password
URL: http://<codec_ip>/putxml

Set Value example:
<Command>
    <UserInterface>
        <Extensions>
            <Widget>
                <SetValue>
                    <WidgetId>red</WidgetId>
                    <Value>128</Value>
                </SetValue>
            </Widget>
        </Extensions>
    </UserInterface>
</Command>


Unset Value example:
<Command>
    <UserInterface>
        <Extensions>
            <Widget>
                <UnsetValue>
                    <WidgetId>red</WidgetId>
                </UnsetValue>
            </Widget>
        </Extensions>
    </UserInterface>
</Command>
'''
