#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# import Flask

'''
Created on Nov 15, 2016

@author: jmartan
'''

from flask import Flask, request
import uni_func
import fill_set_widget
from lxml import etree

# Create an instance of Flask
app = Flask(__name__, static_url_path='/static')
app.config['DEBUG'] = True

# change this accordingly to the API user access
codec_username = 'apiuser'
codec_password = 'C1sco123'

@app.before_request
def before_request():
#
# for debugging only
#
#     if True:
#         print("HEADERS", request.headers)
#         print("REQ_path", request.path)
#         print("ARGS",request.args)
#         print("DATA",request.data)
#         print("FORM",request.form)
    pass
        
@app.route('/codec', methods=['POST', 'GET'])
def codec():

    data_req = request.data.decode('utf-8')
    app.logger.info('headers: {}'.format(request.headers))
    app.logger.info('values: {}'.format(data_req))

    xml_tree = etree.fromstring(data_req)

    action = xml_tree.xpath('/Event/UserInterface/Extensions/Widget/Action')
    if action:
        widget_value = None
        for x in action[0].iter():
            tag_l = x.tag.lower()
            if tag_l == 'widgetid' and x.text:
                widget_name = x.text.lower()
            if tag_l == 'type' and x.text:
                widget_event = x.text.lower()
            if tag_l == 'value' and x.text:
                widget_value = x.text.lower()

        app.logger.info('widget: {}, event: {}, value: {}'.format(widget_name, widget_event, widget_value))
        
        if widget_event == 'changed' and widget_name in ['red', 'green', 'blue']:
            if widget_name == 'red':
                uni_func.change_fill(red=int(widget_value))
            elif widget_name == 'blue':
                uni_func.change_fill(blue=int(widget_value))
            elif widget_name == 'green':
                uni_func.change_fill(green=int(widget_value))
        
        if widget_name == 'picture' and widget_event == 'pressed':
            if widget_value == 'smile':
                uni_func.display_pic(uni_func.COLOR_SMILE)
            elif widget_value == 'heart':
                uni_func.display_pic(uni_func.HEART, x_color=uni_func.PURPLE)
    else:
        layout_updated = xml_tree.xpath('/Event/UserInterface/Extensions/Widget/LayoutUpdated')
        if layout_updated:
            print('widget layout updated or codec restarte, seting widget values')
            r, g, b = uni_func.unicorn.get_pixel(0,0)
            print('pixel at (0, 0): {} - {} - {}'.format(r, g, b))
            fill_set_widget.update_widget(request.remote_addr, codec_username, codec_password, 'red', r)
            fill_set_widget.update_widget(request.remote_addr, codec_username, codec_password, 'green', g)
            fill_set_widget.update_widget(request.remote_addr, codec_username, codec_password, 'blue', b)
                
    return "OK"


# run the application
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, threaded=True)
    
'''
feedback receiver registration example - to be configured in startup script or via CLI.

Note that if the web server doesn't respond or responds with error (4xx, 5xx message) the codec stops
sending events to the web server and feedback needs to be re-registered via CLI.

XML-friendly:
xCommand HttpFeedback register FeedbackSlot: 1 ServerUrl: "http://192.168.21.129:5000/codec" Expression: "/event/UserInterface/Extensions/Widget"

Less XML-friendly:
xCommand HttpFeedback register FeedbackSlot: 1 ServerUrl: "http://192.168.21.129:5000/codec" Expression: "/event/UserInterface/Extensions/Event"
'''

'''
XML-friendly slider output:

<Event>
  <Identification>
    <SystemName>Presenter</SystemName>
    <MACAddress>E4:AA:5D:A2:95:D4</MACAddress>
    <IPAddress>192.168.21.136</IPAddress>
    <ProductType>Cisco Codec</ProductType>
    <ProductID>Cisco TelePresence SX80</ProductID>
    <SWVersion>ce8.2.2.3263c59</SWVersion>
    <SerialNumber>FTT194201MZ</SerialNumber>
  </Identification>

  <UserInterface item="1">
    <Extensions item="1">
      <Widget item="1">
        <Action item="1">
          <WidgetId item="1">dimmer</WidgetId>
          <Value item="1">91</Value>
          <Type item="1">released</Type>
        </Action>
      </Widget>
    </Extensions>
  </UserInterface>
</Event>
'''

'''
XML-friendly toggle output:

<Event>
  <Identification>
    <SystemName>Presenter</SystemName>
    <MACAddress>E4:AA:5D:A2:95:D4</MACAddress>
    <IPAddress>192.168.21.136</IPAddress>
    <ProductType>Cisco Codec</ProductType>
    <ProductID>Cisco TelePresence SX80</ProductID>
    <SWVersion>ce8.2.2.3263c59</SWVersion>
    <SerialNumber>FTT194201MZ</SerialNumber>
  </Identification>

  <UserInterface item="1">
    <Extensions item="1">
      <Widget item="1">
        <Action item="1">
          <WidgetId item="1">light</WidgetId>
          <Value item="1">off</Value>
          <Type item="1">changed</Type>
        </Action>
      </Widget>
    </Extensions>
  </UserInterface>
</Event>
'''