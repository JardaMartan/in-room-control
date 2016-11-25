#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# import Flask

'''
Created on Nov 15, 2016

@author: jmartan
'''

from flask import Flask, request
# import urlparse
# from urllib import parse as urlparse
import xmltodict
import json
import re
import uni_func

# Create an instance of Flask
app = Flask(__name__, static_url_path='/static')
app.config['DEBUG'] = True

@app.before_request
def before_request():
    if True:
        print("HEADERS", request.headers)
        print("REQ_path", request.path)
        print("ARGS",request.args)
        print("DATA",request.data)
        print("FORM",request.form)
        
@app.route('/codec', methods=['POST', 'GET'])
def codec():

    data_req = request.data.decode('utf-8')
    data_str = data_req.replace('\n', '').replace('\r', '')
    app.logger.info('headers: {}'.format(request.headers))
    app.logger.info('values: {}'.format(data_req))

    action_xml = re.findall(r'<Action.*>.*</Action>', data_str, re.DOTALL)
    if action_xml:
        action_arr = json.loads(json.dumps(xmltodict.parse(action_xml[0])))
        widget_arr = action_arr['Action']
        widget_name = widget_arr['WidgetId']['#text']
        widget_event = widget_arr['Type']['#text']
        if '#text' in widget_arr['Value'].keys():
            widget_value = widget_arr['Value']['#text']
        else:
            widget_value = None

#         app.logger.info('test: {}'.format(action_arr))
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
                uni_func.display_pic(uni_func.SMILE)
            elif widget_value == 'heart':
                uni_func.display_pic(uni_func.HEART)
                
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