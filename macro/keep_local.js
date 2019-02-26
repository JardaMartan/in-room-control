const xapi = require('xapi');

const CONFIG_DELAY = 5000; // milliseconds
const MAX_DUMP_DEPTH = 10;

var g_call_active = false;
var g_presenter_detected = false;

function dumpObj(obj, name, indent, depth) {
    if (depth > MAX_DUMP_DEPTH) {
        return indent + name + ": <Maximum Depth Reached>\n";
    }
    if (typeof obj == "object") {
        var child = null;
        var output = indent + name + "\n";
        indent += "\t";
        for (var item in obj) {
            try {
                child = obj[item];
            } catch (e) {
                child = "<Unable to Evaluate>";
            }
            if (typeof child == "object") {
                output += dumpObj(child, item, indent, depth + 1);
            } else {
                output += indent + item + ": " + child + "\n";
            }
        }
        return output;
    } else {
        return obj;
    }
}

function setPresenterMode(mode) {
	console.log("Setting presenter mode to: "+mode);
	xapi.command('Video Layout LayoutFamily Set', {LayoutFamily: 'custom', CustomLayoutName: mode});
}

//main program start

//detect current codec status
xapi.status.get('Call').then((status) => {
	 console.log('Current call status: '+dumpObj(status, 'Call', '  '));
	 if (status) {
	     g_call_active = true;
	 } else {
	     g_call_active = false;
	 }
	 console.log('Active call: '+g_call_active);
});
xapi.status.get('Cameras PresenterTrack PresenterDetected').then((status) => {
	 console.log('Current PresenterTrack status: '+dumpObj(status, 'Detected', '  '));
	 switch (status) {
	   case 'True':
	     g_presenter_detected = true;
	     break;
	   default:
	     g_presenter_detected = false;
      if (g_call_active) {
        setPresenterMode('Local Presenter');
  	 }
	 }
});

const callStatusFeedback = xapi.status.on('Call Status', (status) => {
	  console.log('Call status changed to: '+dumpObj(status, 'Call', '  '));
	  switch (status) {
	    case 'Connected':
	        g_call_active = true;
	        console.log('call connected');
	        break;
	    case 'Idle':
	        g_call_active = false;
	        console.log('call disconnected');
	        break;
	    default:
	  }
});

const presenterStatusFeedback = xapi.status.on('Cameras PresenterTrack PresenterDetected', (status) => {
	  console.log('Presenter status changed to: '+dumpObj(status, 'Presenter', '  '));
	  switch (status) {
	    case 'True':
			g_presenter_detected = true;
			console.log('presenter on stage');
			break;
		case 'False':
			g_presenter_detected = false;
			console.log('presenter passed out');
				if (g_call_active) {
					setTimeout(function(){
							setPresenterMode('Local Presenter');
					}, CONFIG_DELAY);
				}
		        break;
		    default:
		  }
});
