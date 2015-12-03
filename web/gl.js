 (function() {
     // Union of Chrome, Firefox, IE, Opera, and Safari console methods
     var methods = ["assert", "cd", "clear", "count", "countReset",
         "debug", "dir", "dirxml", "error", "exception", "group", "groupCollapsed",
         "groupEnd", "info", "log", "markTimeline", "profile", "profileEnd",
         "select", "table", "time", "timeEnd", "timeStamp", "timeline",
         "timelineEnd", "trace", "warn"
     ];
     var length = methods.length;
     var console = (window.console = window.console || {});
     var method;
     var noop = function() {};
     while (length--) {
         method = methods[length];
         // define undefined methods as noops to prevent errors
         if (!console[method])
             console[method] = noop;
     }
 })();

 var fragmentShader = " " +
     "precision highp float;" +
     "varying vec3 _to_fragment_color;" +
     "void main(void) {" +
     "gl_FragColor = vec4(_to_fragment_color, 1.0);" +
     "}";

 var vertexShader = " " +
     "attribute vec3 aVertexPosition;" +
     "uniform mat4 uMVMatrix;" +
     "uniform mat4 uPMatrix;" +
     "uniform vec3 inColor;" +
     "varying vec3 _to_fragment_color;" +
     "void main(void) {" +
     "gl_Position = uPMatrix * uMVMatrix * vec4(aVertexPosition, 1.0);" +
     "gl_PointSize = 0.1;" +
     "_to_fragment_color = inColor;" +
     "}";

 var gl = null; // WebGL-Kontext
 var prg = null; // Shader-Program
 var canvasWidth = 0; // Variable für Canvas-Breite
 var canvasHeight = 0; // Variable für Canvas-Höhe

 var layers = []; // Parts Loaded
 var vertexBuffers = [];
 var indexBuffers = [];

 var mvMatrix = mat4.create();
 var pMatrix = mat4.create();

 var currentLayer = 0;

 /*
  * Programm mit Vertex-Shader und Fragment-Shader
  */
 function get_shader(type, source) {
     var shader = gl.createShader(type);
     gl.shaderSource(shader, source);
     gl.compileShader(shader);
     if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
         alert(gl.getShaderInfoLog(shader));
         return null;
     }
     return shader;
 }

 function initProgram() {
     var vxShader = get_shader(gl.VERTEX_SHADER, vertexShader);
     var fgShader = get_shader(gl.FRAGMENT_SHADER, fragmentShader);

     prg = gl.createProgram();
     gl.attachShader(prg, vxShader);
     gl.attachShader(prg, fgShader);
     gl.linkProgram(prg);

     if (!gl.getProgramParameter(prg, gl.LINK_STATUS)) {
         alert('Could not initialise shaders');
     }

     gl.useProgram(prg);

     prg.aVertexPosition = gl.getAttribLocation(prg, "aVertexPosition");
     prg.uPMatrix = gl.getUniformLocation(prg, "uPMatrix");
     prg.uMVMatrix = gl.getUniformLocation(prg, "uMVMatrix");
 }



 function loadModel() {
     for (var i = 1501; i < 1734; i++) {
         var filename = 'data/vhf.' + i + '.json';
         loadPart(filename);
     }
 }

 function loadPart(filename) {
     var request = new XMLHttpRequest();
     request.open("GET", filename);
     request.overrideMimeType("text/plain");
     request.onreadystatechange = function() {
         //console.info(request.readyState + ' - ' + request.status);
         if (request.readyState == 4) {
             if (request.status == 200) { //OK
                 handleLoadedPart(filename, JSON.parse(request.responseText));
             } else if (document.domain.length == 0 && request.status == 0) { //OK aber lokal, kein Web-Server
                 handleLoadedPart(filename, JSON.parse(request.responseText));
             } else {
                 alert('There was a problem loading the file :' + filename);
                 alert('HTML error code: ' + request.status);
             }
         }
     };
     request.send();
 }

 /**
  * Anlegen des Speichers, der die Geometrie enthält
  */
 function handleLoadedPart(filename, payload) {

     //console.log("loaded " + filename);
     var vertexBufferObject = gl.createBuffer();
     gl.bindBuffer(gl.ARRAY_BUFFER, vertexBufferObject);

     gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(payload.vertices), gl.STATIC_DRAW);
     gl.bindBuffer(gl.ARRAY_BUFFER, null);

     var indexBufferObject = gl.createBuffer();
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBufferObject);
     gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(payload.indices), gl.STATIC_DRAW);
     gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

     vertexBuffers.push(vertexBufferObject);
     indexBuffers.push(indexBufferObject);
     layers.push(payload);
     currentLayer++;
 }

 var mouseDown = false;
 var lastMouseX = null;
 var lastMouseY = null;


 function handleMouseDown(event) {
     mouseDown = true;
     lastMouseX = event.clientX;
     lastMouseY = event.clientY;
 }

 function handleMouseUp(event) {
     mouseDown = false;
 }

 function handleOnKeyDown(event) {
     if (event.keyCode == 40 || event.keyCode == 83) {
         if (currentLayer > 0) {
             currentLayer--;
         }
     }
     if (event.keyCode == 38 || event.keyCode == 87) {
         if (currentLayer < layers.length) {
             currentLayer++;
         }
     }
 }

 function handleOnScroll(event) {
     if (event.deltaY > 0) {
         if (currentLayer > 0) {
             currentLayer--;
         }
     } else {
         if (currentLayer < layers.length) {
             currentLayer++;
         }
     }
 }

 function handleMouseMove(event) {
     if (!mouseDown) {
         return;
     }
     var newX = event.clientX;
     var newY = event.clientY;

     deltaX = newX - lastMouseX;
     deltaY = newY - lastMouseY;

     radX += toRad(deltaX);
     radY += toRad(deltaY);


     lastMouseX = newX
     lastMouseY = newY;
 }


 var radY = toRad(-40);
 var radX = toRad(0);

 function toRad(degrees) {
     return degrees * Math.PI / 180;
 }

 function drawScene() {
     gl.clearColor(0.0, 0.0, 0.0, 1.0);
     gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
     gl.viewport(0, 0, canvasWidth, canvasHeight); 

     mat4.ortho(0.0, 500.0, 0.0, 500.0, 500.0, -500.0, pMatrix);
     mat4.identity(mvMatrix);
     mat4.translate(mvMatrix, [250.0, 250.0, 0.0]);
     mat4.rotate(mvMatrix, radY, [1, 0, 0]);
     mat4.rotate(mvMatrix, radX, [0, 0, 1]);
     mat4.translate(mvMatrix, [-250.0, -250.0, 0.0]);

     mat4.translate(mvMatrix, [0.0, 40.0, -120.0]);

     prg.ColorUniform = gl.getUniformLocation(prg, 'inColor');

     gl.uniformMatrix4fv(prg.uPMatrix, false, pMatrix);
     gl.uniformMatrix4fv(prg.uMVMatrix, false, mvMatrix);

     for (var i = 0; i < currentLayer; i++) {

         if (i % 2 == 0) {
             gl.uniform3fv(prg.ColorUniform, [0, 0.5, 1]);
         } else {
             gl.uniform3fv(prg.ColorUniform, [1, 1, 1]);
         }

         gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffers[i]);
         gl.vertexAttribPointer(prg.aVertexPosition, 3, gl.FLOAT, false, 0, 0);
         gl.enableVertexAttribArray(prg.aVertexPositionAttribute);

         gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffers[i]);

         //gl.drawElements(gl.TRIANGLES, layers[i].indices.length, gl.UNSIGNED_SHORT, 0);

         gl.drawElements(gl.POINTS, layers[i].indices.length, gl.UNSIGNED_SHORT, 0);
     }
 }

 
 window.requestAnimFrame = (function() {
     return window.requestAnimationFrame ||
         window.webkitRequestAnimationFrame ||
         window.mozRequestAnimationFrame ||
         window.oRequestAnimationFrame ||
         window.msRequestAnimationFrame ||
         function(callback, element) {
             window.setTimeout(callback, 1000 / 60);
         };
 })();

 function tick() {
	 stats.begin();
     drawScene();
	 stats.end();
     requestAnimFrame(tick);
 }


 function getGLContext(canvas) {
     var names = ["webgl", "experimental-webgl", "webkit-3d", "moz-webgl"];
	 var gl = null;
     for (var i = 0; i < names.length; ++i) {
         try {
             gl = canvas.getContext(names[i]);
             gl.antialias = true;
         } catch (e) {}
         if (gl) break;
     }
     if (gl == null) {
         alert("WebGL is not available");
     }
	 return gl;
 }
 
var stats = new Stats();

 function runWebGLApp() {
	stats.setMode(0);
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.right = '0px';
	stats.domElement.style.top = '0px';
	document.body.appendChild( stats.domElement );
	 
	var canvas = document.getElementById("canvas-element-id");
	 
	canvas.onmousedown = handleMouseDown;
	document.onmouseup = handleMouseUp;
	document.addEventListener("mousewheel", handleOnScroll, false);
	document.onkeydown = handleOnKeyDown;
	document.onmousemove = handleMouseMove;

	canvasWidth = canvas.width;
	canvasHeight = canvas.height;

	gl = getGLContext(canvas);

	initProgram();
	loadModel();
	tick();
 }
