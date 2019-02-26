const xapi = require('xapi');

let presenterTrackConnector = 0;
let presenterTrackStarted = false;
let presenterDetected = false;
let state = 'None';
let directorState = 'None';

const LOCAL_PRESENTER = 'Local Presenter';
const REMOTE_PRESENTER = 'Remote Presenter';
const DISCUSSION_STATE = 'Discussion';
const QNA_STATE = 'Local Q and A';

function logError(error) {
  console.error(error);
}

function setConfig(configType, value) {
  xapi.config
  .set(configType, value)
  .catch((error) => { logError(error); });
}

function configurePresenterConnector(connector) {
  const configBasis = `Video Input Connector ${connector}`;
  setConfig(`${configBasis} InputSourceType`, 'camera');
  setConfig(`${configBasis} PresentationSelection`, 'Manual');
  setConfig(`${configBasis} Quality`, 'Motion');
  setConfig(`${configBasis} Visibility`, 'Never');
}

function updatePresenterTrackConnector(connector) {
  presenterTrackConnector = connector;
}

function preparePresenterTrackConnector() {
  xapi.config
  .get('Cameras PresenterTrack Connector')
  .then((connector) => {
    updatePresenterTrackConnector(connector);
    configurePresenterConnector(connector);
  });
}

function restartPresenterTrack() {
  xapi.command('Cameras PresenterTrack Set', { Mode: 'Off' }).then(() => {
    const p1 = xapi.status.get('Cameras PresenterTrack Availability')
    .catch((error) => logError(error));
    const p2 = xapi.status.get('Standby State')
    .catch((error) => logError(error));

    Promise.all([p1, p2]).then(results => {
      const availability = results[0];
      const standby = results[1];
      if (availability === 'Available' && standby === 'Off') {
        xapi.command('Cameras PresenterTrack Set', { Mode: 'Persistent' });
        presenterTrackStarted = true;
      }
    });
  });
}

function presenterCamera() {
  console.log(`Selecting presenter camera. Connectorid: ${presenterTrackConnector}`);
  xapi.command('Experimental SpeakerTrack BackgroundMode Enable')
    .catch((error) => { console.log(error); });
  xapi.command('Video Input SetMainVideoSource', { ConnectorId: presenterTrackConnector })
    .catch((error) => { console.log(error); });
}

function splitScreen() {
  console.log('SplitScreen');
  xapi.command('Experimental SpeakerTrack BackgroundMode Disable').then(() => {
    xapi.status
    .get('Cameras SpeakerTrack ActiveConnector')
    .then((speakerTrackConnector) => {
      console.log(`Split screen using video connectors: ${speakerTrackConnector}, ${presenterTrackConnector}`);
      xapi.command('Video Input SetMainVideoSource', {
        'ConnectorId[0]': speakerTrackConnector,
        'ConnectorId[1]': presenterTrackConnector,
        Layout: 'Equal' });
    });
  });
}

function roomCamera() {
  console.log('Selecting room camera');
  xapi.command('Experimental SpeakerTrack BackgroundMode Disable');

  xapi.status
  .get('Cameras SpeakerTrack Availability')
  .then((speakerTrackAvailability) => {
    if (speakerTrackAvailability === 'Available') {
      xapi.status
      .get('Cameras SpeakerTrack ActiveConnector')
      .then((speakerTrackConnector) => {
        if (speakerTrackConnector !== 0) {
          xapi.command('Video Input SetMainVideoSource', { ConnectorId: speakerTrackConnector });
        }
      })
      .catch(() => {});
    } else {
      xapi.command('Video Input SetMainVideoSource', { ConnectorId: 1 });
    }
  });
}

function adaptToState(newState) {
  console.log(`New state: ${newState}`);
  if (newState === LOCAL_PRESENTER) {
    presenterCamera();
  } else if (newState === QNA_STATE) {
    splitScreen();
  } else {
    roomCamera();
  }

  if (newState === REMOTE_PRESENTER && presenterDetected && presenterTrackStarted) {
    // This state was manually selected, perhaps because of
    // a bad track. Restart PresenterTrack to clear it.
    console.log('Restart PresenterTrack due to manually selected Remote Presenter state.');
    restartPresenterTrack();
  }
}

function updateInRoomButton(widgetId, isActive) {
  let value;
  if (isActive) {
    value = 'active';
  } else {
    value = 'inactive';
  }
  xapi.command('UserInterface Extensions Widget SetValue', {
    WidgetId: widgetId,
    Value: value });
}

function updateInRoom(family) {
  updateInRoomButton('local_presenter', family === LOCAL_PRESENTER);
  updateInRoomButton('remote_presenter', family === REMOTE_PRESENTER);
  updateInRoomButton('discussion', family === DISCUSSION_STATE);
}

function reportState(family) {
  console.log(`Report state: ${family}`);
  xapi.command('UserInterface Message Echo', { Text: `Briefing: ${family}` });
}

function setState(newState) {
  if (newState === state) {
    return;
  }

  state = newState;

  adaptToState(newState);
  updateInRoom(newState);
  reportState(newState);
}

xapi.status.on('Cameras PresenterTrack Status', (presenterTrackStatus) => {
  if (presenterTrackStatus === 'Follow') {
    // Turned on in gui change mode to persistent, start speakertrack and go to local presenter
    console.log('PresenterTrack was manually turned on, set mode to persistent');
    xapi.command('Experimental SpeakerTrack Backgroundmode Enable').then(() => {
      if (state === LOCAL_PRESENTER) {
        presenterCamera();
      } else {
        setState(LOCAL_PRESENTER);
      }
      xapi.command('Cameras PresenterTrack Set', { Mode: 'Persistent' });
    });
  }
});

xapi.status.on('Cameras PresenterTrack PresenterDetected', (detected) => {
  console.log(`Presenter detected changed to ${detected}`);
  presenterDetected = detected === 'True';
  if (state === DISCUSSION_STATE) {
    return;
  }

  if (presenterDetected) {
    let newState = LOCAL_PRESENTER;
    if (directorState === 'Closeup' || directorState === 'Local Overview') {
      newState = QNA_STATE;
      console.log(`Presenter detected during Closeup. Switching to ${newState}`);
    } else {
      console.log(`Presenter detected. Switching to ${newState}`);
    }
    setState(newState);
  } else {
    console.log(`Presenter gone - switching to ${REMOTE_PRESENTER}`);
    setTimeout(() => { setState(REMOTE_PRESENTER); }, 2000);
  }
});

xapi.status.on('Cameras PresenterTrack Availability', () => {
  restartPresenterTrack();
});

xapi.status.on('Standby State', () => {
  restartPresenterTrack();
});

xapi.status.on('Experimental Director State', (newDirectorState) => {
  directorState = newDirectorState;
  if (state === LOCAL_PRESENTER || state === QNA_STATE) {
    console.log(`Briefing room state is ${state}, handle director state change to ${state}`);

    if (directorState === 'Closeup' || directorState === 'Local Overview') {
      setState(QNA_STATE);
    } else if (directorState === 'Off') {
      // Ignored
    } else {
      let newState = LOCAL_PRESENTER;
      if (presenterDetected === true) {
        console.log(`Presenter still there. Starting ${newState}`);
      } else {
        newState = REMOTE_PRESENTER;
        console.log(`Presenter disappeared. Starting ${newState}`);
      }
      setTimeout(() => { setState(newState); }, 2000);
    }
  }
});

xapi.status.on('Video Layout LayoutFamily Local', (localLayout) => {
  if (!presenterTrackStarted) {
    return;
  }
  if (localLayout !== state) {
    console.log(`Local LayoutFamily changed. Switch state to ${localLayout}`);
    adaptToState(localLayout);
  }
});

xapi.status.on('Cameras SpeakerTrack ActiveConnector', (connector) => {
  console.log(`Active SpeakerTrack connector changed to ${connector}`);
});

xapi.event.on('UserInterface Extensions Widget Action', (event) => {
  let stateToSet = '';
  if (event.Type === 'clicked') {
    console.log(`State button click detected. Id: ${event.WidgetId}`);
    const id = event.WidgetId;
    if (id === 'local_presenter') {
      stateToSet = LOCAL_PRESENTER;
    } else if (id === 'remote_presenter') {
      stateToSet = REMOTE_PRESENTER;
    } else if (id === 'discussion') {
      stateToSet = DISCUSSION_STATE;
    }

    if (stateToSet !== '') {
      setState(stateToSet);
      console.log(`Set state ${stateToSet}`);
    }
  }
});

xapi.config.on('Cameras PresenterTrack Connector', (newConnector) => {
  presenterTrackConnector = parseInt(newConnector, 10);
  preparePresenterTrackConnector();
  restartPresenterTrack();
  console.log(`New presenter camera connector: ${presenterTrackConnector}`);
});

function init() {
  preparePresenterTrackConnector();
  restartPresenterTrack();
  xapi.command('Experimental Audio EchoCancellation', { Channels: 1 });
  xapi.command('Cameras SpeakerTrack Activate');
  setState(REMOTE_PRESENTER);
  console.log('Briefing room initialized');
}

setTimeout(init, 5000);
