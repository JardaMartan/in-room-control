const xapi = require('xapi');

const LOCAL_PRESENTER = 'Local Presenter';
const REMOTE_PRESENTER = 'Remote Presenter';
const DISCUSSION = 'Discussion';
const QNA = 'Local Q and A';
let layout = 'None';

function removeLayout(CanvasIdent, LayoutFamily) {
  xapi.command('Video LayoutMaker Family Remove', { CanvasIdent, LayoutFamily });
}

function clearLayouts(canvasId) {
  // Remove builtins
  removeLayout(canvasId, 'equal');
  removeLayout(canvasId, 'overlay');
  removeLayout(canvasId, 'prominent');
  removeLayout(canvasId, 'single');

  // Remove custom
  removeLayout(canvasId, LOCAL_PRESENTER);
  removeLayout(canvasId, REMOTE_PRESENTER);
  removeLayout(canvasId, DISCUSSION);
  removeLayout(canvasId, QNA);
}

function zoneFullscreen(zoneIdent) {
  xapi.command('Video LayoutMaker Zone Size Coordinates Set', {
    ZoneIdent: zoneIdent,
    PosX: 0,
    PosY: 0,
    Width: 1000,
    Height: 1000 });
}

function zoneAssociate(zoneIdent, area) {
  xapi.command('Video LayoutMaker Zone Add', {
    ZoneIdent: zoneIdent,
    AssocAreaId: area });
}

function createLocalPresenterLayout(canvasId) {
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'speaker',
    CanvasIdent: canvasId,
    LayoutFamily: LOCAL_PRESENTER,
    NoOfCompositions: 3,
    ZoneType: 'Presentation',
    PosInZoneList: 1 });
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'participants',
    CanvasIdent: canvasId,
    LayoutFamily: LOCAL_PRESENTER,
    NoOfCompositions: 3,
    ZoneType: 'Speaker' });
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'presentation',
    CanvasIdent: canvasId,
    LayoutFamily: LOCAL_PRESENTER,
    NoOfCompositions: 3,
    ZoneType: 'Presentation',
    PosInZoneList: 2,
  });
  zoneAssociate('speaker', 1);
  zoneFullscreen('speaker');

  zoneAssociate('presentation', 2);
  zoneFullscreen('presentation');

  zoneAssociate('participants', 3);
  zoneFullscreen('participants');

  xapi.command('Video LayoutMaker Zone FrameSetup Update ', {
    ZoneIdent: 'participants',
    MaxFrameColumns: 3,
    MaxFrameRows: 3,
    VerticalAlignment: 'TopLow' });

  // Duplicate zone from presentation to speakerL
  xapi.command('Video LayoutMaker Zone DuplicateSources Set', {
    ZoneIdent: 'speaker',
    DuplicateZoneNumber: 2,
  });
}

function createRemotePresenterLayout(canvasId) {
  // Zone idents
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'speaker',
    CanvasIdent: canvasId,
    LayoutFamily: REMOTE_PRESENTER,
    NoOfCompositions: 3,
    ZoneType: 'SpeakerFocused' });
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'participants',
    CanvasIdent: canvasId,
    LayoutFamily: REMOTE_PRESENTER,
    NoOfCompositions: 3,
    ZoneType: 'Speaker' });
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'presentation',
    CanvasIdent: canvasId,
    LayoutFamily: REMOTE_PRESENTER,
    NoOfCompositions: 3,
    ZoneType: 'Presentation' });

  zoneAssociate('speaker', 1);
  zoneFullscreen('speaker');

  zoneAssociate('presentation', 2);
  zoneFullscreen('presentation');

  zoneAssociate('participants', 3);
  zoneFullscreen('participants');

  xapi.command('Video LayoutMaker Zone FrameSetup Update ', {
    ZoneIdent: 'participants',
    MaxFrameColumns: 3,
    MaxFrameRows: 3,
    VerticalAlignment: 'TopLow' });
}

function createDiscussionLayout(canvasId) {
  // Zone idents
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'speaker',
    CanvasIdent: canvasId,
    LayoutFamily: DISCUSSION,
    NoOfCompositions: 3,
    ZoneType: 'SpeakerFocused' });
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'participants',
    CanvasIdent: canvasId,
    LayoutFamily: DISCUSSION,
    NoOfCompositions: 3,
    ZoneType: 'Speaker' });
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'presentation',
    CanvasIdent: canvasId,
    LayoutFamily: DISCUSSION,
    NoOfCompositions: 3,
    ZoneType: 'Presentation' });

  zoneAssociate('speaker', 1);
  zoneFullscreen('speaker');

  // Make SPEAKER equal (overlay on first area/monitor)
  zoneAssociate('participants', 1);
  xapi.command('Video LayoutMaker Zone Size Alternative Set', {
    ZoneIdent: 'participants',
    Width: 1000,
    Height: 150,
    SizeType: 'Thousandths',
    VerticalPos: 'Lower' });
  xapi.command('Video LayoutMaker Zone FrameSetup Update', {
    ZoneIdent: 'participants',
    MaxFrameColumns: 6,
    MaxFrameRows: 1,
    VerticalAlignment: 'TopLow' });

  zoneAssociate('presentation', 2);
  zoneFullscreen('presentation');
}

function layoutDuplicate(canvasId, src, dst) {
  xapi.command('Video LayoutMaker Family Copy', {
    CanvasIdent: canvasId,
    LayoutFamilySrc: src,
    LayoutFamilyDest: dst });
}

function createQNALayout(canvasId) {
  const remoteCanvas = 'defaultRemote';
  // Base QnA layout on Local Presenter
  layoutDuplicate(canvasId, LOCAL_PRESENTER, QNA);

  // Define remote composition
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'speaker',
    CanvasIdent: canvasId,
    LayoutFamily: QNA,
    NoOfCompositions: 2,
    ZoneType: 'SpeakerFocused' });
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'participants',
    CanvasIdent: remoteCanvas,
    LayoutFamily: QNA,
    NoOfCompositions: 2,
    ZoneType: 'Speaker' });
  xapi.command('Video LayoutMaker ZoneIdent Define', {
    ZoneIdent: 'presentation',
    CanvasIdent: remoteCanvas,
    LayoutFamily: QNA,
    NoOfCompositions: 2,
    ZoneType: 'Presentation' });

  // Make SPEAKER_FOCUSED fullscreen
  zoneAssociate('speaker', 1);
  zoneFullscreen('speaker');

  // Make SPEAKER equal (overlay on first area/monitor)
  zoneAssociate('participants', 1);
  xapi.command('Video LayoutMaker Zone Size Alternative Set', {
    ZoneIdent: 'participants',
    Width: 1000,
    Height: 150,
    SizeType: 'Thousandths',
    VerticalPos: 'Lower' });
  xapi.command('Video LayoutMaker Zone FrameSetup Update ', {
    ZoneIdent: 'participants',
    MaxFrameColumns: 6,
    MaxFrameRows: 1,
    VerticalAlignment: 'TopLow' });

  // Make PRESENTATION fullscreen
  zoneAssociate('presentation', '2');
  zoneFullscreen('presentation');
}

function setupAutoMode(canvasId) {
  xapi.command('Video LayoutMaker AutoFamily Local Set ', {
    CanvasIdent: canvasId,
    LayoutFamily: REMOTE_PRESENTER,
    NoOfCompositions: 3,
  });
}

function setupLayouts() {
  const canvasId = 'part.1';

  clearLayouts(canvasId);
  createLocalPresenterLayout(canvasId);
  createRemotePresenterLayout(canvasId);
  createDiscussionLayout(canvasId);
  createQNALayout(canvasId);
  setupAutoMode(canvasId);

  // Flush/apply changes
  xapi.command('Video LayoutCanvas Canvas Update', { CanvasIdent: canvasId });
}

function setLocalLayout(newLayout) {
  xapi.command('Video Layout LayoutFamily Set', {
    Target: 'local',
    LayoutFamily: 'custom',
    CustomLayoutName: newLayout,
  });
}

function setSelfviewMonitor(newLayout) {
  if (newLayout === LOCAL_PRESENTER) {
    xapi.command('Video Selfview Set', { OnMonitorRole: 'Third' });
  } else if (layout === QNA) {
    xapi.command('Video Selfview Set', { OnMonitorRole: 'Third' });
  } else {
    xapi.command('Video Selfview Set', { OnMonitorRole: 'First' });
  }
}

function ensureEqualRemoteLayout() {
  xapi.command('Video Layout LayoutFamily Set', {
    Target: 'remote',
    LayoutFamily: 'equal',
  });
}

function setLayout(newLayout) {
  if (newLayout === layout) {
    return;
  }

  console.log(`New layout: ${newLayout}`);
  layout = newLayout;

  setLocalLayout(newLayout);
  setSelfviewMonitor(newLayout);
  ensureEqualRemoteLayout();
}

function getState(message) {
  const words = message.split(': ');
  return words.length > 1 ? words[1] : 'Unknown';
}

function isLegalState(state) {
  return state === LOCAL_PRESENTER || state === REMOTE_PRESENTER
    || state === DISCUSSION || state === QNA;
}

xapi.event.on('UserInterface Message Echo', (event) => {
  console.log(`Received state event: ${event.Text}`);
  const newState = getState(event.Text);
  if (isLegalState(newState)) {
    setLayout(newState);
  } else {
    console.log(`Illegal state: ${event.Text}`);
  }
});

function init() {
  setupLayouts();
  console.log('Briefing room layouts initialized');
}

setTimeout(init, 3000);
