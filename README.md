# Cisco CE 8.2 Software In-Room Control Examples
Cisco CE8.2 codec software brings in-room control widgets on [Touch10](http://www.cisco.com/c/en/us/products/collaboration-endpoints/telepresence-touch/index.html) panel. Upcoming version of the CE software will bring the in-room control to [DX70/80](http://www.cisco.com/c/en/us/products/collaboration-endpoints/desktop-collaboration-experience-dx600-series/index.html) as well. This is a demonstration how to handle the in-room control events on Raspberry Pi. Watch the YouTube demo: https://youtu.be/cSWMKNZ9b1s

# Presenter Track Layout Reset
Recently we have equipped our training room with [Presenter Track](http://www.cisco.com/c/en/us/products/collaboration-endpoints/presenter-track.html). It consists of [SX80 codec](http://www.cisco.com/c/en/us/products/collaboration-endpoints/telepresence-sx80-codec/index.html), [Speaker Track](http://www.cisco.com/c/en/us/products/collaboration-endpoints/telepresence-speaker-track-60/index.html) and [Precision 60 camera](http://www.cisco.com/c/en/us/products/collaboration-endpoints/telepresence-precision-cameras/index.html). Works great, however we have hit one issue: if during an active video call the presenter moves out of the trigger zone, the Presenter Track automatically switches from "Local Presenter" mode to "Remote Presenter". The remote viewers then see the local audience and not the presenter on stage. This is quite annoying because we want to have the presenter visible all time no matter if he is detected or not. The **presenter_flask.py** receives an event of presenter detection (true/false) and if it's false (i.e. the presenter just moved out of the trigger zone) it instructs the codec via API to switch to "Local Presenter" mode again.

# Raspberry Pi + Unicorn HAT
**rpi-unicornhat** directory contains examples which use [Unicorn HAT](https://shop.pimoroni.com/products/unicorn-hat) 3-color LED matrix. 

`codec_flask.py` is a Flask-based web server which can receive In-Room Control widget events. If the widget id is **red**, **green** or **blue**, the LED matrix is filled (or existing fill updated) with the appropriate RGB color. If the widget id is **picture** and its value is **smile** or **heart** the LED matrix displays a symbol.

**Example:**  
`sudo ./codec_flask.py`  
(root permissions are needed for Unicorn HAT)  
This runs the web server on console so you can watch XML messages sent by the codec. Example XML message from codec for "green" slidebar change:  
```
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
          <WidgetId item="1">green</WidgetId>
          <Value item="1">111</Value>
          <Type item="1">changed</Type>
        </Action>
      </Widget>
    </Extensions>
  </UserInterface>
</Event>
```

The web server runs on TCP port 5000. In order to instruct the codec to send In-Room Control events to the web server, the following command needs to be entered in Codec CLI (accessible via SSH):  
`xCommand HttpFeedback register FeedbackSlot: slot_number ServerUrl: "http://raspberry_ip_address_or_hostname:5000/codec" Expression: "/event/UserInterface/Extensions/Widget"`  
**Example**:  
`xCommand HttpFeedback register FeedbackSlot: 1 ServerUrl: "http://192.168.21.129:5000/codec" Expression: "/event/UserInterface/Extensions/Widget"`  

`fill_set_widget.py` uses codec API to change the widget status. For example it can set a slider position, switch ON/OFF state or update a current temperature indicator. Parameters are:  
`-c codec_ip` - codec IP address or hostname  
`-u username` - user name defined on codec, the user has to have "In-room" permissions enabled  
`-p password` - user's password  
`widget_id=value` list - list of widget id's and their new values, multiple widget_id=value can be set simultaneously  

**Example:**  
`sudo ./fill_set_widget.py -c 192.168.21.136 -u apiuser -p cisco red=10 green=100 blue=60 light=on`  
(root permissions are needed for Unicorn HAT, if you want to change some other widget than "red", "green" or "blue", you can run the command without `sudo`)  
The XML format of the message sent to the codec copies the CLI command structure. For example, if the CLI command to set a widget state is:  
`xCommand UserInterface Extensions Widget SetValue WidgetId: red Value: 128`  
the XML message for API POST is:  
```
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
```
The XML message should be sent via HTTP POST to `http://codec_ip/putxml` with content-type `text/xml` and API-enabled user credentials.

## "unset" may be required
At the moment the codec doesn't reflect the on-screen widget changes, so if a widget state is changed via API (for example a slider position), then the user changes it on a touch screen and later the script sends the previous value again, the widget state is not reset back because the codec thinks the widget value hasn't changed from the previous API call. To avoid this the `fill_set_widget.py` script first unsets the widget value and then sends the "set" API call. If you want to run "unset" before "set" API call, use `unset=True` parameter of the `fill_set_widget.update_widget()` function.

## Widget layout change or codec restart
If In-Room Control layout has changed (widgets added or removed) or the codec has been restarted, the codec sends the following XML message to the web server:  
```
<Event>
  <Identification>
    <SystemName>Presenter</SystemName>
    <MACAddress>e4:aa:5d:a2:95:d4</MACAddress>
    <IPAddress>192.168.21.136</IPAddress>
    <ProductType>Cisco Codec</ProductType>
    <ProductID>Cisco TelePresence SX80</ProductID>
    <SWVersion>ce8.2.2.3263c59</SWVersion>
    <SerialNumber>FTT194201MZ</SerialNumber>
  </Identification>
  <UserInterface item="1">
    <Extensions item="1">
      <Widget item="1">
        <LayoutUpdated item="1"/>
      </Widget>
    </Extensions>
  </UserInterface>
</Event>
```
The example web server can react accordingly and set the "red", "green" and "blue" sliders. Because this part of the web server uses a codec API call, change the **codec_username** and **codec_password** variables in `codec_flask.py` to reflect your codec username & password.

## "200 OK" Warning
If the web server responds with an error message (e.g. some of **5xx** or **4xx**), the codec retries the request 4 more times. If none of the requests returns "200 OK" status, the codec stops sending events completely. Codec restart or `xCommand HttpFeedback register ...` command is required to restore the codec to web server communication.

# Environment
The web server and Python script use Python3. To prepare the environment, run:  
`sudo apt-get install python-flask python3-flask python-lxml python3-lxml`  
Unicorn HAT requires:  
`curl -sS get.pimoroni.com/unicornhat | bash`  
Unicorn HAT is in conflict with audio chip of the Raspberry Pi (at least on my Pi3 every example displayed just a crazy flickering). To disable audio edit `/etc/modprobe.d/raspi-blacklist.conf`, add line `blacklist snd-bcm2835` to it and reboot.

# References
In-room control documentation:  
http://www.cisco.com/c/en/us/support/collaboration-endpoints/telepresence-quick-set-series/products-installation-and-configuration-guides-list.html

Codec API reference guides:  
http://www.cisco.com/c/en/us/support/collaboration-endpoints/telepresence-quick-set-series/products-command-reference-list.html

Unicorn HAT:  
https://shop.pimoroni.com/products/unicorn-hat  
https://learn.pimoroni.com/tutorial/unicorn-hat/getting-started-with-unicorn-hat

Python Flask:  
http://flask.pocoo.org

Python Requests:  
http://docs.python-requests.org/en/master/