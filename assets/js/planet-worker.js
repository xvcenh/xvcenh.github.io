"use strict";

// Shade the gas bands once off the UI thread. The main canvas animates the dust and rings.
self.onmessage = event => {
  const size = event.data;
  const center = (size - 1) / 2;
  const radius = center - .5;
  const pixels = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x - center) / radius, ny = (y - center) / radius;
      const depth = 1 - nx*nx - ny*ny;
      if (depth <= 0) continue;
      const nz = Math.sqrt(depth);
      const latitude = ny * .93 + nx * .22 + nz * .15;
      const longitude = Math.atan2(nx, nz);
      const turbulence = Math.sin(longitude*6+latitude*12)*.7 + Math.sin(longitude*13-latitude*18)*.24;
      const band = .5 + .5*Math.sin(latitude*21 + turbulence);
      const fine = Math.sin(latitude*130 + turbulence*3)*4 + Math.sin(latitude*82-turbulence)*3;
      const golden = Math.max(0,Math.sin(latitude*12-1.3))**2;
      const light = Math.max(0, -.69*nx - .46*ny + .46*nz);
      const shade = .19 + .94*Math.pow(light,.72);
      const rim = Math.pow(1-nz,5)*(.35+light)*90;
      const i = (y*size+x)*4;
      pixels[i] = (49 + 40*band + 68*golden + fine)*shade + rim;
      pixels[i+1] = (114 + 30*band + 22*golden + fine)*shade + rim;
      pixels[i+2] = (125 + 30*band - 24*golden + fine)*shade + rim;
      pixels[i+3] = Math.min(255, depth*32000);
    }
  }
  self.postMessage({size, pixels}, [pixels.buffer]);
  self.close();
};
