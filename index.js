
var main = function() {
  var CANVAS = document.getElementById("your_canvas");
  CANVAS.width = window.innerWidth;
  CANVAS.height =  window.innerHeight;

  /*========================= CAPTURE MOUSE EVENTS ========================= */

  var AMORTIZATION = 0.95;
  var drag = false;


  var old_x, old_y;

  var dX = 0, dY = 0;
  var mouseDown = function(e) {
    drag = true;
    old_x = e.pageX, old_y = e.pageY;
    e.preventDefault();
    return false;
  };

  var mouseUp = function(e){
    drag = false;
  };

  var mouseMove = function(e) {
    if (!drag) return false;
    dX = (e.pageX-old_x)*2*Math.PI/CANVAS.width,
      dY = (e.pageY-old_y)*2*Math.PI/CANVAS.height;
    THETA += dX;
    PHI += dY;
    old_x = e.pageX, old_y = e.pageY;
    e.preventDefault();
  };

  CANVAS.addEventListener("mousedown", mouseDown, false);
  CANVAS.addEventListener("mouseup", mouseUp, false);
  CANVAS.addEventListener("mouseout", mouseUp, false);
  CANVAS.addEventListener("mousemove", mouseMove, false);

  /*========================= GET WEBGL CONTEXT ========================= */
  var GL;
  try {
    GL = CANVAS.getContext("experimental-webgl", {antialias: true});
  } catch (e) {
    alert("You are not webgl compatible :(") ;
    return false;
  }

  /*========================= SHADERS ========================= */
  /*jshint multistr: true */

  var shader_vertex_source = "\n\
attribute vec3 position;\n\
uniform mat4 Pmatrix;\n\
uniform mat4 Vmatrix;\n\
uniform mat4 Mmatrix;\n\
attribute vec3 color; //the color of the point\n\
varying vec3 vColor;\n\
void main(void) { //pre-built function\n\
gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(position, 1.);\n\
vColor=color;\n\
}";

  var shader_fragment_source = "\n\
precision mediump float;\n\
uniform float greyscality;\n\
varying vec3 vColor;\n\
void main(void) {\n\
\n\
\n\
float greyscaleValue=(vColor.r+vColor.g+vColor.b)/3.;\n\
vec3 greyscaleColor=vec3(greyscaleValue,greyscaleValue,greyscaleValue);\n\
\n\
\n\
vec3 color=mix(greyscaleColor, vColor, greyscality);\n\
gl_FragColor = vec4(color, 1.);\n\
}";


  var get_shader=function(source, type, typeString) {
    var shader = GL.createShader(type);
    GL.shaderSource(shader, source);
    GL.compileShader(shader);
    if (!GL.getShaderParameter(shader, GL.COMPILE_STATUS)) {
      alert("ERROR IN "+typeString+ " SHADER : " + GL.getShaderInfoLog(shader));
      return false;
    }
    return shader;
  };

  var shader_vertex = get_shader(shader_vertex_source, GL.VERTEX_SHADER, "VERTEX");
  var shader_fragment = get_shader(shader_fragment_source, GL.FRAGMENT_SHADER, "FRAGMENT");

  var SHADER_PROGRAM = GL.createProgram();
  GL.attachShader(SHADER_PROGRAM, shader_vertex);
  GL.attachShader(SHADER_PROGRAM, shader_fragment);

  GL.linkProgram(SHADER_PROGRAM);

  var _Pmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Pmatrix");
  var _Vmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Vmatrix");
  var _Mmatrix = GL.getUniformLocation(SHADER_PROGRAM, "Mmatrix");

  var _color = GL.getAttribLocation(SHADER_PROGRAM, "color");
  var _position = GL.getAttribLocation(SHADER_PROGRAM, "position");
  var _greyscality=GL.getUniformLocation(SHADER_PROGRAM, "greyscality");


  GL.enableVertexAttribArray(_color);
  GL.enableVertexAttribArray(_position);

  GL.useProgram(SHADER_PROGRAM);

  /*========================= THE CUBE ========================= */
  //POINTS :
  var cube_vertex = [
    -1,-1,-1,     1,1,0,
    1,-1,-1,     1,1,0,
    1, 1,-1,     1,1,0,
    -1, 1,-1,     1,1,0,

    -1,-1, 1,     0,0,1,
    1,-1, 1,     0,0,1,
    1, 1, 1,     0,0,1,
    -1, 1, 1,     0,0,1,

    -1,-1,-1,     0,1,1,
    -1, 1,-1,     0,1,1,
    -1, 1, 1,     0,1,1,
    -1,-1, 1,     0,1,1,

    1,-1,-1,     1,0,0,
    1, 1,-1,     1,0,0,
    1, 1, 1,     1,0,0,
    1,-1, 1,     1,0,0,

    -1,-1,-1,     1,0,1,
    -1,-1, 1,     1,0,1,
    1,-1, 1,     1,0,1,
    1,-1,-1,     1,0,1,

    -1, 1,-1,     0,1,0,
    -1, 1, 1,     0,1,0,
    1, 1, 1,     0,1,0,
    1, 1,-1,     0,1,0

  ];

  var CUBE_VERTEX = GL.createBuffer ();
  GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
  GL.bufferData(GL.ARRAY_BUFFER,
                new Float32Array(cube_vertex),
    GL.STATIC_DRAW);

  //FACES :
  var cube_faces = [
    0,1,2,
    0,2,3,

    4,5,6,
    4,6,7,

    8,9,10,
    8,10,11,

    12,13,14,
    12,14,15,

    16,17,18,
    16,18,19,

    20,21,22,
    20,22,23

  ];
  var CUBE_FACES = GL.createBuffer ();
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
  GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
                new Uint16Array(cube_faces),
    GL.STATIC_DRAW);
  /*========================= MATRIX ========================= */

  var PROJMATRIX = LIBS.get_projection(40, CANVAS.width/CANVAS.height, 1, 100);
  var MOVEMATRIX = LIBS.get_I4();
  var MOVEMATRIX2 = LIBS.get_I4();
  var VIEWMATRIX = LIBS.get_I4();
  var MOVEMATRIX_TETRA=LIBS.get_I4();


  LIBS.translateZ(VIEWMATRIX, -6);
  var THETA = 0,
      PHI = 0;


  /*========================= THE TETRAHEDRON ========================= */
  //POINTS :
  var tetrahedron_vertex=[
    //base face points, included in the plane y=-1
    -1,-1,-1,     1,0,0,
    1,-1,-1,     0,1,0,
    0,-1,1,      0,0,1,

    //summit, in white
    0,1,0,     1,1,1
  ];

  var TETRAHEDRON_VERTEX= GL.createBuffer ();
  GL.bindBuffer(GL.ARRAY_BUFFER, TETRAHEDRON_VERTEX);
  GL.bufferData(GL.ARRAY_BUFFER,
                new Float32Array(tetrahedron_vertex),
    GL.STATIC_DRAW);

  //TETRAHEDRON FACES :
  var tetrahedron_faces = [
    0,1,2, //base

    0,1,3, //side 0
    1,2,3, //side 1
    0,2,3  //side 2
  ];
  var TETRAHEDRON_FACES= GL.createBuffer ();
  GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TETRAHEDRON_FACES);
  GL.bufferData(GL.ELEMENT_ARRAY_BUFFER,
                new Uint16Array(tetrahedron_faces),
    GL.STATIC_DRAW);


  /*========================= DRAWING ========================= */
  GL.enable(GL.DEPTH_TEST);
  GL.depthFunc(GL.LEQUAL);
  GL.clearColor(0.0, 0.0, 0.0, 0.0);
  GL.clearDepth(1.0);

  var time_old = 0;
  var animate = function(time) {
    var dt = time-time_old;
    if (!drag) {
      dX *= AMORTIZATION, dY *= AMORTIZATION;
      THETA += dX, PHI += dY;
    }
    LIBS.set_I4(MOVEMATRIX);
    LIBS.set_I4(MOVEMATRIX2);
    var radius=2; //half distance between the cube centers
    var pos_x = radius*Math.cos(PHI) * Math.cos(THETA);
    var pos_y =- radius*Math.sin(PHI);
    var pos_z =- radius*Math.cos(PHI) * Math.sin(THETA);

    LIBS.set_position(MOVEMATRIX, pos_x, pos_y, pos_z);
    LIBS.set_position(MOVEMATRIX2, -pos_x, -pos_y, -pos_z);

    LIBS.rotateZ(MOVEMATRIX, -PHI);
    LIBS.rotateZ(MOVEMATRIX2, -PHI);


    LIBS.rotateX(MOVEMATRIX_TETRA, dt*0.0031);
    LIBS.rotateZ(MOVEMATRIX_TETRA, Math.cos(time)*dt*0.0022);
    LIBS.rotateY(MOVEMATRIX_TETRA, dt*-0.0034);

    LIBS.rotateY(MOVEMATRIX, THETA);
    LIBS.rotateY(MOVEMATRIX2, THETA);

    time_old = time;

    GL.viewport(0.0, 0.0, CANVAS.width, CANVAS.height);
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    GL.uniformMatrix4fv(_Pmatrix, false, PROJMATRIX);
    GL.uniformMatrix4fv(_Vmatrix, false, VIEWMATRIX);
    GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX);
    GL.bindBuffer(GL.ARRAY_BUFFER, CUBE_VERTEX);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false,4*(3+3),0) ;
    GL.vertexAttribPointer(_color, 3, GL.FLOAT, false,4*(3+3),3*4) ;
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, CUBE_FACES);
    GL.drawElements(GL.TRIANGLES, 6*2*3, GL.UNSIGNED_SHORT, 0);

    GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX2);


    GL.drawElements(GL.TRIANGLES, 6*2*3, GL.UNSIGNED_SHORT, 0);


    GL.uniform1f(_greyscality, 1);
    GL.uniformMatrix4fv(_Mmatrix, false, MOVEMATRIX_TETRA);
    GL.bindBuffer(GL.ARRAY_BUFFER, TETRAHEDRON_VERTEX);
    GL.vertexAttribPointer(_position, 3, GL.FLOAT, false,4*(3+3),0) ;
    GL.vertexAttribPointer(_color, 3, GL.FLOAT, false,4*(3+3),3*4) ;
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, TETRAHEDRON_FACES);
    GL.drawElements(GL.TRIANGLES, 3*4, GL.UNSIGNED_SHORT, 0);


    GL.flush();

    window.requestAnimationFrame(animate);
  };
  animate(0);
};