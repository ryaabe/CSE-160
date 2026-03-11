## Assignment 5

### Overview

For this assignment, I created a liminal-esque water landscape.

WASD to move around. Look around using your mouse. Jump with space.

Press I to turn on/off the fog. There you will be able to see the skybox cubemap.

### Loaded OBJ

A cottage obj with included textures is loaded into the scene.

### Light Sources

There are 5 light sources in the scene:

1. a cool grey ambient light
2. pure white directional light
3. yellow point light (rotating cube above the cabin)
4. white point light (lamp)
5. white spot light (lamp)

## Primitives

There are 33 primitives in the scene in total. 

The bench is made up of 16 cube primitives.

The lamp is made up of 5 cylinder, 1 box, and 3 sphere primitives.

The walls surrounding the player are textured box primitives (cubes), and the baseplate that rises above the water is another textured box primitive.

### Extra Feature

I added a couple of extra features. 

The first feature I decided to add was first person movement (based on Quake/Source engine movement), which includes WASD controls, mouse look, and jumping (along with ground detection). 

I also added various post-processing effects to try and make the scene more liminal, which include bloom, fog, and FXAA anti-aliasing.

Lastly, I added custom water shader effects. The water surface is made from two transparent layered planes that use the same texture but are offset and scroll at different speeds. I created a water-ripple shader to 

### Resources Used/Credits

MeshGourandMaterial.js is from a previous build of three.js

All textures (besides cabin) were found on Adobe Stock.

https://www.panoton.de/tools/cubemap-converter/ used to create the cubemap face textures for the skybox.

Cottage model and textures created by animatedheaven, downloaded off of free3d.com

Codex was used to help implement some features (mainly the OBJ loader), as well as help with debugging.