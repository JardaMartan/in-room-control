#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# import Flask

'''
Created on Nov 15, 2016

@author: jmartan
'''

from flask import Flask, request
from lxml import etree
import requests
import time
import wiringpi
import configparser
import os.path

# Create an instance of Flask
app = Flask(__name__, static_url_path='/static')
app.config['DEBUG'] = True

# change this accordingly to the API user access
codec_username = 'apiuser'
codec_password = 'C1sco123'

# configure Requests
session = requests.Session()
session.trust_env = False

presenter_layouts = {
    'local': {'name': 'Local Presenter', 'monitors': ('First', 'Auto', 'Auto')},
    'remote': {'name': 'Remote Presenter', 'monitors': ('Auto', 'Auto', 'Auto')},
    'discussion': {'name': 'Discussion', 'monitors': ('Second', 'Second', 'Auto')}
    }

default_config = {
    'PresenterLight': {'status': 'off', 'level': 0}
    }

@app.before_first_request
def run_on_start():
# set light based on current config
# set widget values based on current config
    pass


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

def try_num(s):
    try:
        return int(s)
    except ValueError:
        try:
            return float(s)
        except ValueError:
            return s

def load_config(codec_ip='default'):
    config = configparser.RawConfigParser()
    cfg_file = 'codec_'+codec_ip+'.properties'
    cfg = default_config
    if not os.path.isfile(cfg_file):
        cfg_file = 'codec_default.properties'
        if not os.path.isfile(cfg_file):
            return cfg
    config.read(cfg_file)
    for section in config.sections():
        for option in config.options(section):
            cfg[section][option] = try_num(config.get(section, option))            
    app.logger.debug('loaded configuration {} from {}'.format(cfg, cfg_file))
    return cfg

def save_config(configuration, codec_ip='default'):
    config = configparser.RawConfigParser()
    cfg_file = 'codec_'+codec_ip+'.properties'
        
    for section in configuration.keys():
        config.add_section(section)
        for option in configuration[section].keys():
            config.set(section, option, value=configuration[section][option])
    cfg_output = open(cfg_file, 'w')
    app.logger.debug('writing configuration {} to {}'.format(configuration, cfg_file))
    config.write(cfg_output)

def set_presenter_layout(codec_ip, username, password, layout='local', change_monitors=False):
    layout_name = presenter_layouts[layout]['name']
    layout_xml = '''
<Command>
    <Video>
        <Layout>
            <LayoutFamily>
                <Set>
                    <LayoutFamily>custom</LayoutFamily>
                    <CustomLayoutName>{}</CustomLayoutName>
                </Set>
            </LayoutFamily>
        </Layout>
    </Video>
</Command>
'''.format(layout_name)

    app.logger.info('setting layout to: "{}"'.format(layout_name))
    headers = {'content-type':'text/xml'}
    res = session.post('http://' + codec_ip + '/putxml', data=layout_xml, headers=headers, auth=(username, password), timeout=2)
    app.logger.info('set presenter layout on codec {} result code: {}\n{}'.format(codec_ip, res.status_code, res.text))
    
    if change_monitors:
        monitor_index = 1
        monitor_xml = '''
    <Configuration>
        <Video>
            <Output>'''
        for monitor in presenter_layouts[layout]['monitors']:
            monitor_xml += '''
                <Connector item="{}">
                    <MonitorRole>{}</MonitorRole>
                </Connector>'''.format(monitor_index, monitor)
            app.logger.info('setting monitor {} role to: "{}"'.format(monitor_index, monitor))
            monitor_index += 1
    
        monitor_xml += '''
            </Output>
        </Video>
    </Configuration>'''
    #     app.logger.debug('final XML: {}, username: "{}", password: "{}"'.format(monitor_xml, username, password))
        headers = {'content-type':'text/xml'}
        res = session.post('http://' + codec_ip + '/putxml', data=monitor_xml, headers=headers, auth=(username, password), timeout=2)
        app.logger.info('set presenter layout on codec {} result code: {}\n{}'.format(codec_ip, res.status_code, res.text))

def update_widgets(codec_ip, username, password, widget_id_values, unset=False):

# "unset" is needed in a situation when you try to repeatedly set the same value of the widget
# and in the mean time someone changes the widget on the touch panel. Probably a bug.

    headers = {'content-type':'text/xml'}
    if unset:
        widget_unset_xml = '''
<Command>
    <UserInterface>
        <Extensions>'''
        for widget_id in widget_id_values.keys():
            widget_unset_xml += '''
            <Widget>
                <UnsetValue>
                    <WidgetId>{}</WidgetId>
                </UnsetValue>
            </Widget>'''.format(widget_id)
            
        widget_unset_xml += '''
        </Extensions>
    </UserInterface>
</Command>'''

        app.logger.info('sending XML command to codec {}, id: {}, value: {}'.format(codec_ip, widget_unset_xml, value))
        res = requests.post('http://'+codec_ip+'/putxml', data=widget_unset_xml, headers=headers, auth=(username, password), timeout=1)
        app.logger.info('widget unset result: {}'.format(res))
        
    widget_set_xml = '''
<Command>
    <UserInterface>
        <Extensions>'''
    for widget_id, value in widget_id_values.items():
        widget_set_xml += '''
            <Widget>
                <SetValue>
                    <WidgetId>{}</WidgetId>
                    <Value>{}</Value>
                </SetValue>
            </Widget>'''.format(widget_id, value)
            
    widget_set_xml += '''
        </Extensions>
    </UserInterface>
</Command>'''
    
    app.logger.info('sending XML command to codec {}, id: {}, value: {}'.format(codec_ip, widget_set_xml, value))
    res = requests.post('http://'+codec_ip+'/putxml', data=widget_set_xml, headers=headers, auth=(username, password), timeout=1)
    app.logger.info('widget set result: {}'.format(res))
                
@app.route('/presenter', methods=['POST', 'GET'])
def codec():

    data_req = request.data.decode('utf-8')
    app.logger.info('headers: {}'.format(request.headers))
    app.logger.info('values: {}'.format(data_req))
    
    xml_tree = etree.fromstring(data_req)
    top_tag = xml_tree.tag
    
# upon reboot the codec may not send its IP address (probably a bug)
    if xml_tree.xpath('/' + top_tag + '/Identification/IPAddress'):
        codec_ip = xml_tree.xpath('/' + top_tag + '/Identification/IPAddress')[0].text
    else:
        codec_ip = request.remote_addr

    configuration = load_config(codec_ip)
    will_save_config = False
    widget_update_dict = {}

# /Status/Cameras/PresenterTrack/PresenterDetected

    if top_tag == 'Status':
        action = xml_tree.xpath('/Status/Cameras/PresenterTrack/PresenterDetected')
        if action:
            app.logger.info('presenter detected: {}, from codec IP: {}'.format(action[0].text, codec_ip))
            if action[0].text == 'True':
                presenter_detected = True
            else:
                presenter_detected = False

            if presenter_detected:
                app.logger.info('presenter on stage')
            else:
                app.logger.info('presenter moved out of stage, resetting layout to "Local Presenter"')
                time.sleep(2)
                set_presenter_layout(codec_ip, codec_username, codec_password, 'local')
                
        status = xml_tree.xpath('/Status/Call/Status')
        if status:
            status_text = status[0].text
            status_text_l = status[0].text.lower()
            app.logger.info('call status changed to: {}'.format(status_text))
            if status_text_l == 'connected':
                light = configuration['PresenterLight']['level']
                configuration['PresenterLight']['status'] = 'on'
                will_save_config = True
                app.logger.info('setting light to {}'.format(light))
                wiringpi.pwmWrite(18, light)
                widget_update_dict['call_light_switch'] = 'on'
                widget_update_dict['cfg_light_switch'] = 'on'

                time.sleep(4)
                set_presenter_layout(codec_ip, codec_username, codec_password, 'local', change_monitors=True)
            if status_text_l == 'idle':
                will_save_config = True
                light = 0
                configuration['PresenterLight']['status'] = 'off'
                app.logger.info('setting light to {}'.format(light))
                wiringpi.pwmWrite(18, light)
                widget_update_dict['call_light_switch'] = 'off'
                widget_update_dict['cfg_light_switch'] = 'off'
                set_presenter_layout(codec_ip, codec_username, codec_password, 'discussion', change_monitors=True)
                
    if top_tag == 'Event':
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
                        
            if widget_event in ('changed', 'released') and widget_name in ('call_light_level', 'cfg_light_level'):
                light = int(widget_value) * 4
                if configuration['PresenterLight']['status'] == 'on':
                    app.logger.info('setting light to {}'.format(light))
                    wiringpi.pwmWrite(18, light)
                
                if widget_event == 'released':
                    configuration['PresenterLight']['level'] = light
                    will_save_config = True
                    if widget_name == 'call_light_level':
                        widget_update_dict['cfg_light_level'] = widget_value
                    else:
                        widget_update_dict['call_light_level'] = widget_value
                
            if widget_name in ('call_light_switch', 'cfg_light_switch'):
                if widget_value == 'on':
                    configuration['PresenterLight']['status'] = 'on'
                    app.logger.info('setting light to {}'.format(configuration['PresenterLight']['level']))
                    wiringpi.pwmWrite(18, configuration['PresenterLight']['level'])
                else:
                    configuration['PresenterLight']['status'] = 'off'
                    wiringpi.pwmWrite(18, 0)
                will_save_config = True
                if widget_name == 'call_light_switch':
                    widget_update_dict['cfg_light_switch'] = widget_value
                else:
                    widget_update_dict['call_light_switch'] = widget_value

        layout_updated = xml_tree.xpath('/Event/UserInterface/Extensions/Widget/LayoutUpdated')
        if layout_updated:
            app.logger.info('widget layout updated or codec restarted, setting lights to {}, level {}'.format(configuration['PresenterLight']['status'], configuration['PresenterLight']['level']))
            widget_update_dict['call_light_switch'] = configuration['PresenterLight']['status']
            widget_update_dict['cfg_light_switch'] = configuration['PresenterLight']['status']
            widget_update_dict['call_light_level'] = int(configuration['PresenterLight']['level']/4)
            widget_update_dict['cfg_light_level'] = int(configuration['PresenterLight']['level']/4)
            
            if configuration['PresenterLight']['status'] == 'on':
                wiringpi.pwmWrite(18, configuration['PresenterLight']['level'])
            else:
                wiringpi.pwmWrite(18, 0)

    if will_save_config:
        save_config(configuration, codec_ip=codec_ip)
        
    if len(widget_update_dict) > 0:
        for i in range(3):
            try:
                update_widgets(codec_ip, codec_username, codec_password, widget_update_dict)
                break
            except:
                app.logger.info('codec API request timed out')
                time.sleep(i+1)
                
    return "OK"

# run the application
if __name__ == '__main__':
    wiringpi.wiringPiSetupGpio()  
    wiringpi.pinMode(18,2)      # pwm only works on GPIO port 18  

    app.run(host='0.0.0.0', port=5001, threaded=True)
    
'''
feedback receiver registration example - to be configured in startup script or via CLI.

Note that if the web server doesn't respond or responds with error (4xx, 5xx message) the codec stops
sending events to the web server and feedback needs to be re-registered via CLI.

XML-friendly:
xCommand HttpFeedback register FeedbackSlot: 1 ServerUrl: "http://10.62.8.150:5001/presenter" Expression: "/Status/Cameras/PresenterTrack/PresenterDetected"

with call status monitoring and touch 10 events:
xCommand HttpFeedback register FeedbackSlot: 1 ServerUrl: "http://10.62.8.39:5001/presenter" Expression: "/Status/Cameras/PresenterTrack/PresenterDetected" Expression: "/Status/Call/Status" Expression: "/event/UserInterface/Extensions/Widget"

'''
