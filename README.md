# Cisco CE 8.2 software In-Room Control Examples
Cisco CE8.2 codec software brings in-room control widgets on Touch10 panel. This is a demonstration how to handle the in-room control events on Raspberry Pi.

# Raspberry Pi + Unicorn HAT
**rpi-unicornhat** contains examples which use [Unicorn HAT](https://shop.pimoroni.com/products/unicorn-hat) 3-color LED matrix. 

**codec_flask.py** is a Flask-based web server which can receive In-Room Control widget events. If the widget id is "red", "green" or "blue", the LED matrix is filled (or existing fill updated) with the appropriate RGB color. If the widget id is "smile" or "heart" the LED matrix displays a symbol.

Example:  
_sudo ./codec\_flask.py_  
(root permissions are needed for Unicorn HAT)

**fill_set_widget.py** uses codec API to change the widget status. For example it can set a slider position, switch state or actual temperature indicator. Parameters are:
- **-c codec_ip** - codec IP address or hostname
- **-u username** - user name defined on codec, the user has to have "In-room" permissions enabled
- **-p password** - user's password
- **widget_id=value** list - list of widget id's and their new values, multiple widget_id=value can be set simultaneously  

Example:  
_sudo ./fill\_set\_widget.py -c 192.168.21.136 -u apiuser -p cisco red=10 green=100 blue=60 light=on_  
(root permissions are needed for Unicorn HAT)

At the moment the codec doesn't reflect the on-screen widget changes, so if the widget state is changed via API (for example a slider position), then the user changes it on a touch screen and the script sends the same value again, the widget state is not reset back because the codec thinks its value hasn't changed from the last API call. To avoid this the ./fill\_set\_widget.py script first unsets the widget value and then sends the "set" API call.

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