const xapi = require('xapi');

const MAX_DUMP_DEPTH = 10;

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

// main()

const touchFeedback = xapi.event.on('UserInterface Extensions Widget', (event) => {
  console.log('Widget Event: '+dumpObj(event, 'Widget', '  '));
  if (event.Type === 'clicked') {
    const id = event.WidgetId;
    if (id == 'display_swap') {
    	  console.log('Swapping displays 2 and 3')
	      // display 2 <-> display 3
    	  setTimeout(function() {
  	    xapi.config
  	    .set('Video Output Connector 2 MonitorRole Third')
  			.catch((error) => {
  			     console.error(error);
  			  });
    	  }, 300);
    	  setTimeout(function() {
  	    xapi.config
  	    .set('Video Output Connector 3 MonitorRole Second')
  			.catch((error) => {
  			     console.error(error);
  			  });
    	  }, 600);
    } else if (id == 'display_normal') {
    	  console.log('Setting displays to normal')
    	  // all displays to 'Auto'
      for (var monIndex = 0; monIndex < 3; monIndex++) {
	    setTimeout(function(ind) {
	      var codecMonitor = ind + 1;
	      console.log('setting monitor '+codecMonitor+' to role Auto);
	      xapi.config
	        .set('Video Output Connector '+codecMonitor+' MonitorRole Auto)
	 		.catch((error) => {
	 			console.error(error);
		    });
		  }, 300 * monIndex, monIndex);
		}
    	  }
    }
  });