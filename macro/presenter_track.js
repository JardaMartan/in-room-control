const xapi = require('xapi');

var g_callId;
var g_confId;
var g_call_active = false;
var g_presenter_detected = false;
var g_sharing = 'Off';
var g_presenter_mode;

const MAX_DUMP_DEPTH = 10;
const CONFIG_DELAY = 2000; // milliseconds
const M_CONFIG_DELAY = 2000; // milliseconds

// monitor roles: First, Second, Third, PresentationOnly, Rec order
// selfview size: Off, Min, Max

// nechavame na automatu PresenterTrack (nebo rucnim ovladani)\
// tyto zmeny se delaji pouze pri aktivnim hovoru
const mode_combo = {
	Remote_Presenter: {layout: {monitors: ['First', 'Second', 'Third'], selfview: {monitor: 'Third', size: 'Off'}}},
	Local_Presenter: {layout: {monitors: ['Third', 'Second', 'First'], selfview: {monitor: 'First', size: 'Off'}}},
	Discussion: {layout: {monitors: ['PresentationOnly', 'PresentationOnly', 'Third'], selfview: {monitor: 'Third', size: 'Off'}}},
	DEFAULT: {layout: {monitors: ['PresentationOnly', 'PresentationOnly', 'Third'], selfview: {monitor: 'Third', size: 'Off'}}}
}

// pri aktivnim hovoru se zmena 'presenter_detected' ignoruje
// je to kvuli duplicite udalosti 'presenter_detected' a 'mode'
const layout_combo = [
	{call: true, presenter_detected: false, sharing: 'Off', description: 'In call, remote presenter, no sharing', layout: mode_combo.Remote_Presenter.layout},
	{call: true, presenter_detected: false, sharing: 'Receiving', description: 'In call, remote presenter, sharing', layout: mode_combo.Remote_Presenter.layout},
	{call: true, presenter_detected: false, sharing: 'LocalRemote', description: 'In call, remote presenter, sharing', layout: mode_combo.Remote_Presenter.layout},
	{call: true, presenter_detected: true, sharing: 'Off', description: 'In call, local presenter, no sharing', layout: mode_combo.Local_Presenter.layout},
	{call: true, presenter_detected: true, sharing: 'Receiving', description: 'In call, local/remote presenter, sharing', layout: mode_combo.Local_Presenter.layout},
	{call: true, presenter_detected: true, sharing: 'LocalRemote', description: 'In call, local presenter, sharing', layout: mode_combo.Local_Presenter.layout},
	{call: false, presenter_detected: false, sharing: 'Off', description: 'Discussion, no presenter, no sharing', layout: {monitors: ['PresentationOnly', 'PresentationOnly', 'Third'], selfview: {monitor: 'Third', size: 'Max'}}},
	{call: false, presenter_detected: true, sharing: 'Off', description: 'Discussion, presenter, no sharing', layout: {monitors: ['PresentationOnly', 'PresentationOnly', 'Third'], selfview: {monitor: 'Third', size: 'Max'}}},
	{call: false, presenter_detected: false, sharing: 'LocalOnly', description: 'Discussion, no presenter, sharing', layout: {monitors: ['PresentationOnly', 'PresentationOnly', 'PresentationOnly'], selfview: {monitor: 'Third', size: 'Off'}}},
	{call: false, presenter_detected: true, sharing: 'LocalOnly', description: 'Discussion, presenter, sharing', layout: {monitors: ['PresentationOnly', 'PresentationOnly', 'Third'], selfview: {monitor: 'Third', size: 'Max'}}}
];

// discussion - full screen selfview na Third monitoru - po zahajeni sdileni
// skoci nahled prezentace

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

function setCodecParams(layout) {

// set display roles
    console.log('monitor roles: '+layout.monitors);

    for (var monIndex = 0; monIndex < layout.monitors.length; monIndex++) {
      setTimeout(function(ind) {
        var codecMonitor = ind + 1;
        console.log('setting monitor '+codecMonitor+' to role '+layout.monitors[ind]);
  	    xapi.config
  	    .set('Video Output Connector '+codecMonitor+' MonitorRole', layout.monitors[ind])
  			.catch((error) => {
  			     console.error(error);
  			  });
      }, 300 * monIndex, monIndex);
    }	
    
// set selfview
  switch (layout.selfview.size) {
    case 'Off':
      console.log('setting selfview to: '+layout.selfview.size+' on monitor role: '+layout.selfview.monitor);
      xapi.config
      .set('Video Selfview Default Mode', layout.selfview.size)
  		.catch((error) => {
  		     console.error(error);
  		  });
      xapi.config
      .set('Video Selfview Default OnMonitorRole', layout.selfview.monitor)
  		.catch((error) => {
  		     console.error(error);
  		  });
      break;
    case 'Min':
      console.log('setting selfview to: '+layout.selfview.size+' on monitor role: '+layout.selfview.monitor);
      xapi.config
      .set('Video Selfview Default Mode', 'On')
  		.catch((error) => {
  		     console.error(error);
  		  });
      xapi.config
      .set('Video Selfview Default FullscreenMode', 'Off')
  		.catch((error) => {
  		     console.error(error);
  		  });
      xapi.config
      .set('Video Selfview Default OnMonitorRole', layout.selfview.monitor)
  		.catch((error) => {
  		     console.error(error);
  		  });
      break;
    case 'Max':
      console.log('setting selfview to: '+layout.selfview.size+' on monitor role: '+layout.selfview.monitor);
      xapi.config
      .set('Video Selfview Default Mode', 'On')
  		.catch((error) => {
  		     console.error(error);
  		  });
      xapi.config
      .set('Video Selfview Default FullscreenMode', 'On')
  		.catch((error) => {
  		     console.error(error);
  		  });
      xapi.config
      .set('Video Selfview Default OnMonitorRole', layout.selfview.monitor)
  		.catch((error) => {
  		     console.error(error);
  		  });
      break;
    default:
      console.log('selfview set to '+layout.selfview.size+', no action taken');
  }
  
}

function setCodecCombo(call_active, presenter, sharing) {
	
	console.log("setCodecCombo: "+call_active+" - "+presenter+" - "+sharing);
	for (var i = 0; i < layout_combo.length; i++) {
//	  console.log("checking combo: "+layout_combo[i].layout.description);
		if ((layout_combo[i].call == call_active) && (layout_combo[i].presenter_detected == presenter) && (layout_combo[i].sharing == sharing)) {
			console.log("setting codec layout \""+layout_combo[i].description+"\"");
			setCodecParams(layout_combo[i].layout);
			break;
		}
	}
}


// main program start

// detect current codec status
xapi.status.get('Call')
  .then((status) => {
    console.log('Current call status: '+dumpObj(status, 'Call', '  '));
    if (status) {
        g_call_active = true;
    } else {
        g_call_active = false;
    }
    console.log('Active call: '+g_call_active);
  });
xapi.status.get('Cameras PresenterTrack PresenterDetected')
  .then((status) => {
    console.log('Current PresenterTrack status: '+dumpObj(status, 'Detected', '  '));
    switch (status) {
      case 'True':
        g_presenter_detected = true;
        break;
      default:
        g_presenter_detected = false;
    }
  });
xapi.status.get('Conference Presentation')
  .then((status) => {
    console.log('Current presentation status: '+dumpObj(status, 'Presentation', '  '));
	  if (status.Mode) {
  	 // console.log('Sharing info: '+status.Mode);
  	  switch (status.Mode) {
  	    case 'Sending':
  	    case 'Receiving':
  	    case 'Off':
  	    		g_sharing = status.Mode;
  	        break;
  	  }
	  }
	  if (status.LocalInstance && status.LocalInstance[0]) {
	    g_sharing = status.LocalInstance[0].SendingMode;
	    if (status.LocalInstance[0].SendingMode === undefined) {
	      g_sharing = 'Off';
	    }
      console.log('presentation status: '+g_sharing);
 	  }
  });
xapi.status.get('Video Layout LayoutFamily')
  .then((status) => {
    console.log('Current Presenter Mode: '+dumpObj(status, 'Local', '  '));
    if (status) {
        g_presenter_mode = status.Local;
    }
    console.log('Presenter Mode : '+g_presenter_mode);
  });

// monitor call status
const callStatusFeedback = xapi.status.on('Call Status', (status) => {
  console.log('Call status changed to: '+dumpObj(status, 'Call', '  '));
  switch (status) {
    case 'Connected':
        g_call_active = true;
        console.log('call connected');
        setTimeout(function(){
//            setCodec('local');
// set mode & monitor roles
        		setCodecCombo(g_call_active, g_presenter_detected, g_sharing);
        }, CONFIG_DELAY);
        break;
    case 'Idle':
        g_call_active = false;
        console.log('call disconnected');
        setTimeout(function(){
// set mode & monitor roles
//            setCodec('discussion');
        		setCodecCombo(g_call_active, g_presenter_detected, g_sharing);
        }, CONFIG_DELAY);
        break;
    default:
  }
});

// De-register feedback
// callStatusFeedback();

const presenterStatusFeedback = xapi.status.on('Cameras PresenterTrack PresenterDetected', (status) => {
	  console.log('Presenter status changed to: '+dumpObj(status, 'Presenter', '  '));
  	  switch (status) {
	    case 'True':
	    		g_presenter_detected = true;
	        console.log('presenter on stage');
      	  if (!g_call_active) {
	          setTimeout(function(){
//	            setCodec('local');
	// set mode & monitor roles
	          		setCodecCombo(g_call_active, g_presenter_detected, g_sharing);
	          }, CONFIG_DELAY);
      	  }
	        break;
	    case 'False':
	    		g_presenter_detected = false;
	        console.log('presenter passed out');
      	  if (!g_call_active) {
  	        setTimeout(function(){
	// set mode & monitor roles
//	            setCodec('discussion');
  	        		setCodecCombo(g_call_active, g_presenter_detected, g_sharing);
	          }, CONFIG_DELAY);
      	  }
	        break;
	    default:
	  }
	});

// De-register feedback
// presenterStatusFeedback();

const sharingStatusFeedback = xapi.status.on('Conference Presentation', (status) => {
	  console.log('Sharing status changed to: '+dumpObj(status, 'Sharing', '  '));
	  if (status.Mode) {
  	 // console.log('Sharing info: '+status.Mode);
  	  switch (status.Mode) {
  	    case 'Sending':
  	    case 'Receiving':
  	    case 'Off':
  	    		g_sharing = status.Mode;
  	        console.log('presentation status: '+g_sharing);
  	        setTimeout(function(){
  //	            setCodec('local');
  	// set mode & monitor roles
  	        		setCodecCombo(g_call_active, g_presenter_detected, g_sharing);
  	        }, CONFIG_DELAY);
  	        break;
  	  }
	  }
	  if (status.LocalInstance && status.LocalInstance[0]) {
	    g_sharing = status.LocalInstance[0].SendingMode;
	    if (status.LocalInstance[0].SendingMode === undefined) {
	      g_sharing = 'Off';
	    }
      console.log('presentation status: '+g_sharing);
      setTimeout(function(){
//	            setCodec('local');
// set mode & monitor roles
      		setCodecCombo(g_call_active, g_presenter_detected, g_sharing);
      }, CONFIG_DELAY);
 	  }
	});

//De-register feedback
//sharingStatusFeedback();

const presenterModeFeedback = xapi.status.on('Video Layout LayoutFamily', (status) => {
	  console.log('Presenter mode changed to: '+dumpObj(status, 'Mode', '  '));
	  if (status.Local) {
	    		g_presenter_mode = status.Local;
	        console.log('presenter mode: '+ g_presenter_mode);
	        setTimeout(function(){
//	            setCodec('local');
	// set mode & monitor roles
	      var mode_key = g_presenter_mode.replace(' ', '_');
	      if ((mode_combo[mode_key]) && g_call_active) {
				  console.log('new layout: '+mode_combo[mode_key]);
      		setCodecParams(mode_combo[mode_key].layout);
	      }
      }, CONFIG_DELAY);
	  }
	});

// De-register feedback
// presenterModeFeedback();


const touchFeedback = xapi.event.on('UserInterface Extensions Widget', (status) => {
  	  console.log('Widget Event: '+dumpObj(status, 'Widget', '  '));
  });