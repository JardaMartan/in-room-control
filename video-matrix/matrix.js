/**
 * Image Composition (Video Matrix) on Cisco Room Kit Series Example.
 * @module PictureLayout
 * @author Jaroslav Martan <jmartan@cisco.com>
 * @copyright Copyright (c) 2019 Cisco and/or its affiliates.
 * @license Cisco Sample Code License, Version 1.1
 */
 
 /**
 * @license
 * Copyright (c) 2019 Cisco and/or its affiliates.
 *
 * This software is licensed to you under the terms of the Cisco Sample
 * Code License, Version 1.1 (the "License"). You may obtain a copy of the
 * License at
 *
 *                https://developer.cisco.com/docs/licenses
 *
 * All use of the material herein must be in accordance with the terms of
 * the License. All rights not expressly granted by the License are
 * reserved. Unless required by applicable law or agreed to separately in
 * writing, software distributed under the License is distributed on an "AS
 * IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied.
 */
 
 const xapi = require('xapi');

const MAX_DUMP_DEPTH = 10;
const REMOTE_INPUT_SHIFTER = 10;
const inputIndex = { // refer to the layout of the Touch 10
  "m_pc": 3,
  "m_remote": 4,
  "m_camera_1": 1,
  "m_camera_2": 2
};

const pictureLayoutManager = new PictureLayout();
const cameraControl = new CameraControl();

/**
 * dumpObj - get a string dump of an object
 *  
 * @param  {Object} obj    an Object to dump 
 * @param  {string} name   name to assign to the object in dump 
 * @param  {string} indent indentation string, gets added depending on the the depth 
 * @param  {int} depth  maximum depth of the dump 
 * @return {string}        string dump 
 */ 
function dumpObj(obj, name, indent, depth) {
    if (depth > MAX_DUMP_DEPTH) {
        return indent + name + ": <Maximum Depth Reached>\n";
    }
    if (typeof obj == "object") {
        var child = null;
        var output = indent + name + "";
        indent += "-";
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

/**
 * updateZoomWidget - update the zoom slider position on the Touch10
 *  
 * @param  {int} zoom real zoom value from the codec 
 */ 
function updateZoomWidget(zoom) {
  var sliderValue =  parseInt(255 * (1 - (zoom - cameraControl.minZoom) / (cameraControl.maxZoom - cameraControl.minZoom)));
  xapi.command("UserInterface Extensions Widget SetValue", {WidgetId: "camera_zoom", Value: sliderValue});
}

/**
 * swapPCInput - swap the PC input, keep the position in the matrix
 *  
 * @param  {int} oldInputId old input Id 
 * @param  {int} newInputId new input Id 
 */ 
function swapPCInput(oldInputId, newInputId) {
  var oldIndex = pictureLayoutManager.matrixInputs.indexOf(oldInputId);
  if (oldIndex >= 0) {
    pictureLayoutManager.matrixInputs[oldIndex] = newInputId;
    var layoutId = ["Prominent", "Equal"].indexOf(pictureLayoutManager.matrixLayout) + 1;
    xapi.command("UserInterface Extensions Widget Action", {WidgetId: "picture_layout", Value: layoutId, Type: "released"});
  }
}

/**
 * defaultWidgets - initialize widget values on Touch10
 *  
 */ 
function defaultWidgets() {
  xapi.command("UserInterface Extensions Widget SetValue", {WidgetId: "pc_inputs", Value: 3});
  xapi.command("UserInterface Extensions Widget SetValue", {WidgetId: "m_pc", Value: "off"});
  xapi.command("UserInterface Extensions Widget SetValue", {WidgetId: "m_remote", Value: "off"});
  xapi.command("UserInterface Extensions Widget SetValue", {WidgetId: "m_camera_1", Value: "off"});
  xapi.command("UserInterface Extensions Widget SetValue", {WidgetId: "m_camera_2", Value: "off"});
//  xapi.command("UserInterface Extensions Widget SetValue", {WidgetId: "picture_layout", Value: 2});
  xapi.command("UserInterface Extensions Widget Action", {WidgetId: "picture_layout", Value: 2, Type: "released"});
  xapi.command("UserInterface Extensions Widget SetValue", {WidgetId: "prominent_input", Value: 1});
  xapi.command("UserInterface Extensions Widget Action", {WidgetId: "camera_select", Value: 1, Type: "released"});
}

/**
 * PictureLayout - class for local display matrix manipulation, including outbound video stream composition
 *  
 */ 
function PictureLayout() {
  this.pcInputId = 3; // input which is taken as "PC"
  this.remoteInputId = 1 + REMOTE_INPUT_SHIFTER;  // remote stream input Id
  this.matrixOutputId = 1; // output (display port) Id
  this.localLayoutName = "Equal"; // picture layout for local viewers
  this.remoteLayoutName = "Equal"; // picture layout for remote viewers
  this.matrixInputs = []; // list of inputs mixed in the matrix
}


/**
 * PictureLayout.prototype.addInput - add input to the matrix and update the picture.
 *  
 * @param  {int} inputId input Id. If the input is remote it should have REMOTE_INPUT_SHIFTER added to its value.
 */ 
PictureLayout.prototype.addInput = function(inputId) {
  if (this.isInputActive(inputId)) {
    console.log("add input "+inputId+" is already active, no action taken");
    return;
  }
  var cmdParams = {
    "Output": this.matrixOutputId,
    "Layout": this.localLayoutName,
    "Mode": "Add"
  }
  var inputForMatrix = this.getInputForMatrix(inputId);
  cmdParams[inputForMatrix["type"]] = inputForMatrix["id"];
  
  console.log("add input args: \""+dumpObj(cmdParams, "cmdParams", "  ")+"\"");
  xapi.command("Video Matrix Assign", cmdParams);
  
  // if the input being removed is in prominent view, make prominent the next in the input list
  if ((this.localLayoutName == "Prominent") && (this.matrixInputs.indexOf(inputId) === 0) && this.matrixInputs.length > 1) {
    xapi.command("UserInterface Extensions Widget Action", {WidgetId: "prominent_input", Value: this.matrixInputs[1], Type: "released"});
  }
  this.matrixInputs.push(inputId);
  
  this.generateRemotePicture();
}


/**
 * PictureLayout.prototype.removeInput - remote input from the matrix and update the picture.
 *  
 * @param  {int} inputId input Id. If the input is remote it should have REMOTE_INPUT_SHIFTER added to its value. 
 */ 
PictureLayout.prototype.removeInput = function(inputId) {
  if (!this.isInputActive(inputId)) {
    console.log("remove input "+inputId+" is not active, no action taken");
    return;
  }

  var cmdParams = {
    "Output": this.matrixOutputId
  }
  var inputForMatrix = this.getInputForMatrix(inputId);
  cmdParams[inputForMatrix.type] = inputForMatrix.id;

  console.log("Remove input parameters: \""+dumpObj(cmdParams, "cmdParams", "  ")+"\"");
  xapi.command("Video Matrix Unassign", cmdParams);
  // if the input being removed is in prominent view, make prominent the next in the input list
  if ((this.localLayoutName == "Prominent") && (this.matrixInputs.indexOf(inputId) === 0) && this.matrixInputs.length > 1) {
    xapi.command("UserInterface Extensions Widget Action", {WidgetId: "prominent_input", Value: this.matrixInputs[1], Type: "released"});
  }
  if (this.matrixInputs.length == 0) {
    console.log("No inputs active");
    return;
  }
  this.matrixInputs.splice(this.matrixInputs.indexOf(inputId), 1);

  this.generateRemotePicture();
}


/**
 * PictureLayout.prototype.addRemoteInput - add remote input to the matrix.
 *  
 */ 
PictureLayout.prototype.addRemoteInput = function() {
  this.addInput(this.remoteInputId);
}

/**
 * PictureLayout.prototype.removeRemoteInput - remove remote input from the matrix
 *  
 */ 
PictureLayout.prototype.removeRemoteInput = function() {
  this.removeInput(this.remoteInputId);
}

/**
 * PictureLayout.prototype.createRemoteInputId - calculate the remote input Id.
 *  
 * @param  {int} inputId real remote input Id 
 * @return {int}         internal representation of remote input Id 
 */ 
PictureLayout.prototype.createRemoteInputId = function(inputId) {
  return inputId + REMOTE_INPUT_SHIFTER;
}

/**
 * PictureLayout.prototype.getInputForMatrix - create a dictionary which is user for adding the input to the matrix.
 * Determines whether the input is local or remote.
 *  
 * @param  {int} inputId input Id 
 * @return {Object}         dictionary of {"type": ("Remotemain"|"SourceId"), "id": input Id} 
 */ 
PictureLayout.prototype.getInputForMatrix = function(inputId) {
  if (inputId > REMOTE_INPUT_SHIFTER) {
    return {"type": "RemoteMain", "id": inputId - REMOTE_INPUT_SHIFTER};
  } else {
    return {"type": "SourceId", "id": inputId};
  }
}

/**
 * PictureLayout.prototype.addPCInput - add PC input to the matrix
 *  
 */ 
PictureLayout.prototype.addPCInput = function() {
  this.addInput(this.pcInputId);
}

/**
 * PictureLayout.prototype.removePCInput - remove PC input from the matrix
 *  
 */ 
PictureLayout.prototype.removePCInput = function() {
  this.removeInput(this.pcInputId);
}

/**
 * PictureLayout.prototype.setPCInput - set the input id of a "PC"
 *  
 * @param  {int} pcInputId input Id 
 */ 
PictureLayout.prototype.setPCInput = function(pcInputId) {
  if (this.pcInputId != pcInputId) {
    var pcIndex = this.matrixInputs.indexOf(this.pcInputId);
    if (pcIndex >= 0) {
      this.pcInputId = pcInputId;
      this.matrixInputs[pcIndex] = this.pcInputId;
      this.generateLocalPicture();
    }
  }
}

/**
 * PictureLayout.prototype.setRemoteInput - set the input id of the "remote" input
 *  
 * @param  {int} remoteInputId remote input id 
 */ 
PictureLayout.prototype.setRemoteInput = function(remoteInputId) {
  if (this.remoteInputId != remoteInputId) {
    var remoteInputIndex = this.matrixInputs.indexOf(this.remoteInputId);
    if (remoteInputIndex >= 0) {
      this.remoteInputId = remoteInputId;
      this.matrixInputs[remoteInputIndex] = this.remoteInputId;
      this.generateRemotePicture();
    }
  }
}

/**
 * PictureLayout.prototype.setLocalPicture - set layout of local picture and regenerate on the screen.
 *  
 * @param  {string} layoutName "Equal" | "Prominent" 
 */ 
PictureLayout.prototype.setLocalPicture = function(layoutName) {
  this.localLayoutName = layoutName;
  this.generateLocalPicture();
}

/**
 * PictureLayout.prototype.generateLocalPicture - create the local picture from scratch adding all the inputs based on their order in this.matrixInputs
 *  
 */ 
PictureLayout.prototype.generateLocalPicture = function() {
  xapi.command("Video Matrix Reset");
  console.log("picture layout change to: "+this.localLayoutName+", sources: ["+this.matrixInputs+"]");
  for (var i=0; i < this.matrixInputs.length; i++) {
    var cmdParams = {
      "Output": this.matrixOutputId,
      "Layout": this.localLayoutName,
      "Mode": "Add"
    }
    var inputForMatrix = this.getInputForMatrix(this.matrixInputs[i]);
    cmdParams[inputForMatrix.type] = inputForMatrix.id;
    xapi.command("Video Matrix Assign", cmdParams);
  }
}

/**
 * PictureLayout.prototype.setRemotePicture - set layout of local picture and regenerate to the recipients.
 *  
 * @param  {string} layoutName "Equal" | "Prominent" 
 */ 
PictureLayout.prototype.setRemotePicture = function(layoutName) {
  this.remoteLayoutName = layoutName;
  this.generateRemotePicture();
}

/**
 * PictureLayout.prototype.generateRemotePicture - create a picture for remote recipients. Remote sources are not included. 
 *  
 */ 
PictureLayout.prototype.generateRemotePicture = function() {
  var remoteCmdArgs = {"Layout": this.remoteLayoutName};
  var remInputs = [];
  for (var i = 0; i < this.matrixInputs.length; i++) {
    if (this.matrixInputs[i] <= REMOTE_INPUT_SHIFTER) {
      remInputs.push(this.matrixInputs[i]);
    }
  }
  if (remInputs.length > 0) {
    remoteCmdArgs.SourceId = remInputs;
    console.log("Remote layout parameters: \""+dumpObj(remoteCmdArgs, "remoteCmdArgs", "  ")+"\"");
    xapi.command("Video Input SetMainVideoSource", remoteCmdArgs);
  }
}

/**
 * PictureLayout.prototype.isInputActive - detect if inputId is active in the matrix
 *  
 * @param  {int} inputId input id 
 * @return {Boolean}  true if input is active 
 */ 
PictureLayout.prototype.isInputActive = function(inputId) {
  return (this.matrixInputs.indexOf(inputId) >= 0);
}

/**
 * PictureLayout.prototype.isPCInputActive - detect if PC input is active in the matrix
 *  
 * @return {Boolean}  true if input is active 
 */ 
PictureLayout.prototype.isPCInputActive = function() {
  return this.isInputActive(this.pcInputId);
}

/**
 * PictureLayout.prototype.isRemoteInputActive - detect if remote input is active in the matrix
 *  
 * @return {Boolean}  true if input is active 
 */ 
PictureLayout.prototype.isRemoteInputActive = function() {
  return this.isInputActive(this.remoteInputId);
}

/**
 * PictureLayout.prototype.makePCProminent - make PC input prominent in the matrix
 *  
 */ 
PictureLayout.prototype.makePCProminent = function() {
  this.makeInputProminent(this.pcInputId);
}

/**
 * PictureLayout.prototype.makeRemoteProminent - make remote input prominent in the matrix
 *  
 */ 
PictureLayout.prototype.makeRemoteProminent = function() {
  this.makeInputProminent(this.remoteInputId);
}

/**
 * PictureLayout.prototype.makeInputProminent - make an input prominent in the matrix
 *  
 * @param  {int} inputId input id 
 */ 
PictureLayout.prototype.makeInputProminent = function(inputId) {
  console.log("Make input prominent: "+inputId);
  if (this.isInputProminent(inputId)) {
    console.log(""+inputId+" is already prominent, no action taken");
    return;
  }
  if (this.matrixInputs.length == 0) {
    console.log("No inputs active");
    return;
  }
  this.matrixInputs.splice(this.matrixInputs.indexOf(inputId), 1);
  this.matrixInputs.unshift(inputId);
  console.log("make input prominent, inputs now: ["+this.matrixInputs+"]");
  this.generateLocalPicture();
  this.generateRemotePicture();
}

/**
 * PictureLayout.prototype.isInputProminent - detect if the input is prominent in the matrix
 *  
 * @param  {int} inputId input id 
 * @return {Boolean}         true if prominent 
 */ 
PictureLayout.prototype.isInputProminent = function(inputId) {
  return (this.matrixInputs[0] == inputId);
}

PictureLayout.prototype.swapOutputs = function() {
  var outputA =  this.matrixOutputId;
  var outputB = 2;
  if (outputA == 2) {
    outputB = 1;
  }

  var cmdParams = {
    "OutputA": outputA,
    "OutputB": outputB,
  }
  console.log("Output swap parameters: \""+dumpObj(cmdParams, "cmdParams", "  ")+"\"");
  xapi.command("Video Matrix Swap", cmdParams).then((status) => {
    this.matrixOutputId = outputB;
    console.log("new matrix ouput: "+this.matrixOutputId);
  });  
}


/**
 * CameraControl - class for controlling the camera
 *  
 */ 
function CameraControl () {
  this.cameraId = 1;
  this.minZoom = 4000;
  this.maxZoom = 8000; //max is 11800, this is the max value for P60
}

/**
 * CameraControl.prototype.startCameraMove - start moving the camera in the desired direction
 *  
 * @param  {string} direction "up" | "down" | "left" | "right" 
 */ 
CameraControl.prototype.startCameraMove = function(direction) {
  var actionDict = {"CameraId": this.cameraId};
  if (["up", "down"].indexOf(direction) >= 0) {
    actionDict.Tilt = direction;
    actionDict.TiltSpeed = 1;
  } else if (["left", "right"].indexOf(direction) >= 0) {
    actionDict.Pan = direction;
    actionDict.PanSpeed = 2;
  } else {
    console.log("start move unknown camera direction \""+direction+"\"");
    return;
  }
  xapi.command("Camera Ramp", actionDict);
}

/**
 * CameraControl.prototype.stopCameraMove - stop moving the camera in the desired direction.
 * Remember that if the camera moves in more than one direction at a time (e.g. "up" & "right"),
 * only the requested direction move is stopped.
 *  
 * @param  {string} direction "up" | "down" | "left" | "right" 
 */ 
CameraControl.prototype.stopCameraMove = function(direction) {
  var actionDict = {"CameraId": this.cameraId};
  if (["up", "down"].indexOf(direction) >= 0) {
    actionDict.Tilt = "Stop";
  } else if (["left", "right"].indexOf(direction) >= 0) {
    actionDict.Pan = "Stop";
  } else {
    console.log("stop move unknown camera direction \""+direction+"\"");
    return;
  }
  xapi.command("Camera Ramp", actionDict);
}

/**
 * Camera zoom getter/setter.
 */ 
Object.defineProperty(CameraControl.prototype, 'cameraZoom', {
  get: async function() {
    var camZoom = xapi.status.get("Cameras Camera "+this.cameraId+" Position Zoom").then((zoom) => {
      console.log("Get camera zoom: "+this.cameraId+" - "+zoom);
      return  parseInt(zoom);
    });
    return camZoom;
  },
  set: function(zoom) {
    console.log("Set camera zoom: "+this.cameraId+" - "+zoom);
    xapi.command("Camera PositionSet", {CameraId: this.cameraId, Zoom: zoom});
  }
});

/**
 * Active camera getter/setter.
 */ 
Object.defineProperty(CameraControl.prototype, 'controlledCamera', {
  get: function() {
    return this.cameraId;
  },
  set: function(cameraId) {
    this.cameraId = cameraId;
  }
});

// startup, register the Touch 10 event receiver
const touchFeedback = xapi.event.on('UserInterface Extensions Widget', (status) => {
  	  if (status.LayoutUpdated) {
  	    console.log("Layout updated");
  	    defaultWidgets();
  	  } else if (status.Action) {
  	    var widgetId = status.Action.WidgetId;
  	    var widgetValue = status.Action.Value;
  	    var widgetValueInt = parseInt(widgetValue);
  	    var actionType = status.Action.Type;
  	    switch (widgetId) {
          case "m_remote":
            if (widgetValue == "on") {
              pictureLayoutManager.addRemoteInput();
            } else {
              pictureLayoutManager.removeRemoteInput();
            }
            break;
 	        case "m_pc":
            if (widgetValue == "on") {
              pictureLayoutManager.addPCInput();
            } else {
              pictureLayoutManager.removePCInput();
            }
            break;
	        case "m_camera_1":
            if (widgetValue == "on") {
              pictureLayoutManager.addInput(1);
            } else {
              pictureLayoutManager.removeInput(1);
            }
            break;
	        case "m_camera_2":
            if (widgetValue == "on") {
              pictureLayoutManager.addInput(2);
            } else {
              pictureLayoutManager.removeInput(2);
            }
            break;
  	      case "picture_layout":
  	        if (actionType == "released") {
    	        if ([1, 2].indexOf(widgetValueInt) >= 0) {
                var layoutName = ["Prominent", "Equal"][widgetValueInt-1];
                pictureLayoutManager.setLocalPicture(layoutName);
                pictureLayoutManager.setRemotePicture(layoutName);
    	        } else {
    	          console.log("unknown value of picture layout: "+widgetValueInt);
    	        }
  	        }
  	        break;
	        case "prominent_input":
  	        if (actionType == "released") {
              // first make sure the input is active
	            xapi.command("UserInterface Extensions Widget Action", {WidgetId: ["m_camera_1", "m_camera_2", "m_pc", "m_remote"][widgetValueInt-1], Value: "on", Type: "changed"}).then((status) => {
	              console.log("after input activation");
                if (widgetValueInt == 3) {
                  pictureLayoutManager.makePCProminent();
                } else if (widgetValueInt == 4) {
                  pictureLayoutManager.makeRemoteProminent();
    	          } else {
                  pictureLayoutManager.makeInputProminent(widgetValueInt);
                }
	            });
  	        }
	          break;
          case "pc_inputs":
            pictureLayoutManager.setPCInput(widgetValueInt);
            break;
	        case "camera_pos":
	          console.log("camera move: "+widgetValue);
  	        if (actionType == "pressed") {
              cameraControl.startCameraMove(widgetValue);
  	        } else if (actionType == "released") {
              cameraControl.stopCameraMove(widgetValue);
  	        }
	          break;
	        case "camera_select":
  	        if (actionType == "released") {
  	          cameraControl.controlledCamera = widgetValueInt;
              cameraControl.cameraZoom.then((zoom) => {
                console.log("Current zoom: "+zoom);
    	          updateZoomWidget(zoom);
              });
  	        }
  	        break;
	        case "camera_zoom":
  	        if (actionType == "changed") {
              // slider value is 0 - 255 whereas the camera zoom value is 0 - 11800. We do not want to use the full zoom range.
              let zoom = cameraControl.minZoom + parseInt((cameraControl.maxZoom - cameraControl.minZoom) / 256) * (255 - widgetValueInt);
              cameraControl.cameraZoom = zoom;
  	        }
	          break;
          case "output_swap":
            if (actionType == "clicked") {
              pictureLayoutManager.swapOutputs();
            }
            break;
	        default:
      	    console.log("Widget "+widgetId+" "+actionType+", value: "+widgetValue);
  	    }
  	  } else {
    	  console.log('Widget Event: '+dumpObj(status, 'Widget', '  '));
  	  }
  });
  
// system setup
defaultWidgets();
