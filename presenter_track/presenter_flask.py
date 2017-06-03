#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# import Flask

'''
Created on May 15, 2017

@author: jmartan
'''

from flask import Flask, request
from lxml import etree
import requests
import time

# Create an instance of Flask
app = Flask(__name__, static_url_path='/static')
app.config['DEBUG'] = True

# change this accordingly to the Cisco codec's API user access
codec_username = 'apiuser'
codec_password = 'C1sco123'

# configure Requests
session = requests.Session()
session.trust_env = False

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
        
@app.route('/presenter', methods=['POST', 'GET'])
def codec():

    data_req = request.data.decode('utf-8')
    app.logger.info('headers: {}'.format(request.headers))
    app.logger.info('values: {}'.format(data_req))

    xml_tree = etree.fromstring(data_req)

# /Status/Cameras/PresenterTrack/PresenterDetected

    action = xml_tree.xpath('/Status/Cameras/PresenterTrack/PresenterDetected')
    codec_ip = xml_tree.xpath('/Status/Identification/IPAddress')[0].text
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
            layout_xml = '''
<Command>
    <Video>
        <Layout>
            <LayoutFamily>
                <Set>
                    <LayoutFamily>custom</LayoutFamily>
                    <CustomLayoutName>Local Presenter</CustomLayoutName>
                </Set>
            </LayoutFamily>
        </Layout>
    </Video>
</Command>
'''
            headers = {'content-type':'text/xml'}
            res = session.post('http://'+codec_ip+'/putxml', data=layout_xml, headers=headers, auth=(codec_username, codec_password), timeout=2)
            app.logger.info('set layout result code: {}\n{}'.format(res.status_code, res.text))

    return "OK"

# run the application
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, threaded=True)
    
'''
feedback receiver registration example - to be configured in codec's startup script or via CLI.

Note that if the web server doesn't respond or responds with error (4xx, 5xx message) the codec stops
sending events to the web server and feedback needs to be re-registered via CLI.

CLI command:

xCommand HttpFeedback register FeedbackSlot: 1 ServerUrl: "http://10.62.8.150:5001/presenter" Expression: "/Status/Cameras/PresenterTrack/PresenterDetected"

'''
