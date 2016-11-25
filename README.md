# Cisco CE 8.2 software In-Room Control Examples
Cisco CE8.2 codec software brings in-room control widgets on Touch10 panel. This is a demonstration how to handle the in-room control events on Raspberry Pi.

# Raspberry Pi + Unicorn HAT
**rpi-unicornhat** directory contains examples which use [Unicorn HAT](https://shop.pimoroni.com/products/unicorn-hat) 3-color LED matrix. 

`codec_flask.py` is a Flask-based web server which can receive In-Room Control widget events. If the widget id is "red", "green" or "blue", the LED matrix is filled (or existing fill updated) with the appropriate RGB color. If the widget id is "smile" or "heart" the LED matrix displays a symbol.

**Example:**  
`sudo ./codec_flask.py`  
(root permissions are needed for Unicorn HAT)  
This runs the web server on console so you can watch XML messages sent by the codec. Example XML message from codec for "green" slidebar change:  
```<Event>
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
</Event>```

The web server runs on TCP port 5000. In order to instruct the codec to send In-Room Control events to the web server following command needs to be entered in Codec CLI (accessible via SSH):
`xCommand HttpFeedback register FeedbackSlot: slot_number ServerUrl: "http://raspberry_ip_address_or_hostname:5000/codec" Expression: "/event/UserInterface/Extensions/Widget"`  
**Example**:  
`xCommand HttpFeedback register FeedbackSlot: 1 ServerUrl: "http://192.168.21.129:5000/codec" Expression: "/event/UserInterface/Extensions/Widget"`  

`fill_set_widget.py` uses codec API to change the widget status. For example it can set a slider position, switch state or actual temperature indicator. Parameters are:  
`-c codec_ip` - codec IP address or hostname  
`-u username` - user name defined on codec, the user has to have "In-room" permissions enabled  
`-p password` - user's password  
`widget_id=value` list - list of widget id's and their new values, multiple widget_id=value can be set simultaneously  

**Example:**  
`sudo ./fill_set_widget.py -c 192.168.21.136 -u apiuser -p cisco red=10 green=100 blue=60 light=on`  
(root permissions are needed for Unicorn HAT)

At the moment the codec doesn't reflect the on-screen widget changes, so if the widget state is changed via API (for example a slider position), then the user changes it on a touch screen and the script sends the same value again, the widget state is not reset back because the codec thinks its value hasn't changed from the last API call. To avoid this the `fill_set_widget.py` script first unsets the widget value and then sends the "set" API call.

# References
In-room control documentation:  
http://www.cisco.com/c/en/us/support/collaboration-endpoints/telepresence-quick-set-series/products-installation-and-configuration-guides-list.html

Codec API reference guides:  
http://www.cisco.com/c/en/us/support/collaboration-endpoints/telepresence-quick-set-series/products-command-reference-list.html

Unicorn HAT:  
https://shop.pimoroni.com/products/unicorn-hat  
https://learn.pimoroni.com/tutorial/unicorn-hat/getting-started-with-unicorn-hat

Flask:  
http://flask.pocoo.org