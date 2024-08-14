/*
 Perlin Kaleidoscope 2D
 
 Uses Pixelblaze's noise functions to generate an "interesting" base
 texture of RGB lines, then generates kaleidoscopic reflections.
 
 Try with Reflections slider set to minimum to see the noise lines!
 
 MIT License
 
 Take this code and use it to make cool things!
 
 12/29/2022 ZRanger1
*/

////////////////////////////////
// START PALETTE STUFF
////////////////////////////////

function normalizeArr(arr)
{
  arrayMutate(arr,(v, i ,a) => v / 255);  
}

//http://soliton.vm.bytemark.co.uk/pub/cpt-city/nd/basic/tn/BlacK_Blue_Magenta_White.png.index.html
//black-blue-purple-pink-white
var black_Blue_Magenta_White_gp = [
    0,   0,  0,  0,
   42,   0,  0, 45,
   84,   0,  0,255,
  127,  42,  0,255,
  170, 255,  0,255,
  212, 255, 55,255,
  255, 255,255,255]
  
normalizeArr(black_Blue_Magenta_White_gp);

//http://soliton.vm.bytemark.co.uk/pub/cpt-city/es/landscape/tn/es_landscape_33.png.index.html
//brown-yellow-forest-green
var es_landscape_33_gp = [
    0,   1,  5,  0,
   19,  32, 23,  1,
   38, 161, 55,  1,
   63, 229,144,  1,
   66,  39,142, 74,
  255,   1,  4,  1]
  
normalizeArr(es_landscape_33_gp);

//http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw1/tn/bhw1_05.png.index.html
//teal to purple
var bhw1_05_gp = [
    0,   1,221, 53,
  255,  73,  3,178]

normalizeArr(bhw1_05_gp);

//http://soliton.vm.bytemark.co.uk/pub/cpt-city/bhw/bhw1/tn/bhw1_04.png.index.html
//yellow-orange-purple-navy
var bhw1_04_gp = [
    0, 229,227,  1,
   15, 227,101,  3,
  142,  40,  1, 80,
  198,  17,  1, 79,
  255,   0,  0, 45]

normalizeArr(bhw1_04_gp);

//http://soliton.vm.bytemark.co.uk/pub/cpt-city/nd/atmospheric/tn/Sunset_Real.png.index.html
//red-orange-pink-purple-blue
var Sunset_Real_gp = [
    0, 120,  0,  0,
   22, 179, 22,  0,
   51, 255,104,  0,
   85, 167, 22, 18,
  135, 100,  0,103,
  198,  16,  0,130,
  255,   0,  0,160]

normalizeArr(Sunset_Real_gp);

// http://soliton.vm.bytemark.co.uk/pub/cpt-city/nd/red/tn/Analogous_3.png.index.html
//purple pink red, with more purple than red. 
var Analogous_3_gp = [
    0,  67, 55,255,
   63,  74, 25,255,
  127,  83,  7,255,
  191, 153,  1, 45,
  255, 255,  0,  0]

normalizeArr(Analogous_3_gp);

// http://soliton.vm.bytemark.co.uk/pub/cpt-city/nd/red/tn/Analogous_1.png.index.html
//blue-purple-red evenly split out. 
var Analogous_1_gp = [
    0,   3,  0,255,
   63,  23,  0,255,
  127,  67,  0,255,
  191, 142,  0, 45,
  255, 255,  0,  0]

normalizeArr(Analogous_1_gp);

var palettes = [black_Blue_Magenta_White_gp, es_landscape_33_gp, bhw1_05_gp, bhw1_04_gp, Sunset_Real_gp, Analogous_3_gp, Analogous_1_gp]

//convert RGB to HSV
//output sets h,s,v globals
export var h
//export var s
export var v
function rgb2hsv(r, g, b) {
  var rr, gg, bb, diff

  r = clamp(r, 0, 1)
  g = clamp(g, 0, 1)
  b = clamp(b, 0, 1)

  v = max(r, max(g, b))
  diff = v - min(r, min(g, b))
  if (diff == 0) {
    h = s = 0
  } else {
    s = diff / v
    rr = (v - r) / 6 / diff
    gg = (v - g) / 6 / diff
    bb = (v - b) / 6 / diff

    if (r == v) {
      h = bb - gg
    } else if (g == v) {
      h = (1 / 3) + rr - bb
    } else if (b == v) {
      h = (2 / 3) + gg - rr
    }
    if (h < 0) {
      h += 1
    } else if (h > 1) {
      h -= 1
    }
  }
}

// control variables for palette switch timing (these are in seconds)
var PALETTE_HOLD_TIME = 10
var PALETTE_TRANSITION_TIME = 3;

// internal variables used by the palette manager.
// Usually not necessary to change these.
export var currentIndex = 0;
var nextIndex = (currentIndex + 1) % palettes.length;

// primarily useful for testing, go to the next palette in the main array. Skips the blend step. 
export function triggerIncrementPalette(){
  currentIndex = (currentIndex + 1) % palettes.length;
}

// arrays to hold rgb interpolation results
var pixel1 = array(3);
var pixel2 = array(3);

// array to hold calculated blended palette
var PALETTE_SIZE = 16;
var currentPalette = array(4 * PALETTE_SIZE)

// timing related variables
var inTransition = 0;
var blendValue = 0;
runTime = 0

// Startup initialization for palette manager
setPalette(currentPalette);
buildBlendedPalette(palettes[currentIndex],palettes[nextIndex],blendValue)  

// user space version of Pixelblaze's paint function. Stores
// interpolated rgb color in rgbArray
function paint2(v, rgbArray, pal) {
  var k,u,l;
  var rows = pal.length / 4;

  // find the top bounding palette row
  for (i = 0; i < rows;i++) {
    k = pal[i * 4];
    if (k >= v) break;
  }

  // fast path for special cases
  if ((i == 0) || (i >= rows) || (k == v)) {
    i = 4 * min(rows - 1, i);
    rgbArray[0] = pal[i+1];
    rgbArray[1] = pal[i+2];
    rgbArray[2] = pal[i+3];    
  }
  else {
    i = 4 * (i-1);
    l = pal[i]   // lower bound    
    u = pal[i+4]; // upper bound

    pct = 1 -(u - v) / (u-l);
    
    rgbArray[0] = mix(pal[i+1],pal[i+5],pct);
    rgbArray[1] = mix(pal[i+2],pal[i+6],pct);
    rgbArray[2] = mix(pal[i+3],pal[i+7],pct);    
  }
}

// utility function:
// interpolate colors within and between two palettes
// and set the LEDs directly with the result.  To be
// used in render() functions
function paletteMix(pal1, pal2, colorPct,palettePct) {
  paint2(colorPct,pixel1,pal1);
  paint2(colorPct,pixel2,pal2);  
  
  rgb(mix(pixel1[0],pixel2[0],palettePct),
      mix(pixel1[1],pixel2[1],palettePct),
      mix(pixel1[2],pixel2[2],palettePct)
   )
}

// construct a new palette in the currentPalette array by blending 
// between pal1 and pal2 in proportion specified by blend
function buildBlendedPalette(pal1, pal2, blend) {
  var entry = 0;
  
  for (var i = 0; i < PALETTE_SIZE;i++) {
    var v = i / PALETTE_SIZE;
    
    paint2(v,pixel1,pal1);
    paint2(v,pixel2,pal2);  
    
    // build new palette at currrent blend level
    currentPalette[entry++] = v;
    currentPalette[entry++] = mix(pixel1[0],pixel2[0],blend)
    currentPalette[entry++] = mix(pixel1[1],pixel2[1],blend)
    currentPalette[entry++] = mix(pixel1[2],pixel2[2],blend)    
  }
}

function setupPalette(delta)
{
  runTime = (runTime + delta / 1000) % 3600;

  // Palette Manager - handle palette switching and blending with a 
  // tiny state machine  
  if (inTransition) {
    if (runTime >= PALETTE_TRANSITION_TIME) {
      // at the end of a palette transition, switch to the 
      // next set of palettes and reset everything for the
      // normal hold period.
      runTime = 0;
      inTransition = 0
      blendValue = 0
      currentIndex = (currentIndex + 1) % palettes.length
      nextIndex = (nextIndex + 1) % palettes.length   

    }
    else {
      // evaluate blend level during transition
      blendValue = runTime / PALETTE_TRANSITION_TIME
    }
    
    // blended palette is only recalculated during transition times. The rest of 
    // the time, we run with the current palette at full speed.
    buildBlendedPalette(palettes[currentIndex],palettes[nextIndex],blendValue)          
  }
  else if (runTime >= PALETTE_HOLD_TIME) {
    // when hold period ends, switch to palette transition
    runTime = 0
    inTransition = 1
  }
}

////////////////////////////////
// END PALETTE STUFF
////////////////////////////////

export var lineWidth = 0.075;
export var speed = 0.5;
export var nSides = 3;
var slice = PI/nSides;  
var outx,outy;

// movement speed
export function sliderSpeed(v) {
  speed = 0.25 + 2 * v * v;
}

// width of base texture lines
export function sliderLineWidth(v) {
  lineWidth = 0.02 + (v * 0.3);
}

// number of kaleidoscope "slices"
export function sliderReflections(v) {
  nSides = 1+floor(6*v);
  slice = PI2 / nSides;
}

// sets up a kaleidoscope effect - makes the image repeat over evenly divided
// rotated "slices" about the center.
function kal(x,y,r,theta) {
  // convert to radial coords, repeat image over each
  // angular "slice" and rotate the slices over time
  var angle = abs(theta + mod(atan2(y,x), slice)-slice);

  // map new rotated coordinates back to original image space
  outx = r * cos(angle);  outy = r * sin(angle);
}

var timebase = 0;
var t1,theta;
export function beforeRender(delta) {
  
  setupPalette(delta);
  
  timebase = (timebase + delta / 1000)  % 3600;
  t1 = timebase * speed;
  theta = PI * t1;
}


translate (-0.5,-0.5)
export function render2D(index, x, y) {
  r = hypot(x,y);  
  if (nSides > 1) { 
    kal(x,y,r,theta); x = outx; y = outy;
  }  
  
  lr = perlinFbm(x,y,t1,1.15,0.15,3);
  lg = perlinFbm(y,x,t1,0.5,0.1,3);
  lb = perlinFbm(t1,x,y,0.25,0.15,3);
  
  r = 2-abs(y - lr) / lineWidth;
  g = 2-abs(y - lg) / lineWidth;
  b = 2-abs(y - lb) / lineWidth;

  //rgb(r, g, b);
  rgb2hsv(r, g, b)
  paint(h, v)
}

