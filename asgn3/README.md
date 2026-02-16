# Assignment 3: Virtual World

## Project Overview

In this project, I created a 32x32 voxel-based virtual world with player controls and the ability to place and remove blocks. 

While I originally followed the helper videos to accomplish this, I quickly moved away from the single-file format that the professor uses. Instead, I separated logic into three distinct classes: `World`, which stores game information about the world and represents block placements as a javascript map, `Renderer` which iterates over the blocks and renders them, and `Player` (which is connected heavily with `Input Handler`), which contains all logic pertaining to player movement and interactions.

### Player controls

Users can:
- move using WASD
- jump using spacebar
- look around using the mouse (or Q & E for tank-style turning)
- place blocks using right-click
- remove blocks using left-click

___

### Minecraft Schematic Loading

To make creating detailed worlds easier and more intuitive, there is functionality for converting minecraft builds to data structures that the `World` class can read by making use of the minecraft mod, Litematica, and the python library, litemapy.

Litematica is a minecraft mod that lets players create schematics of their builds in-game. While normally intended to import minecraft builds between worlds, this project uses the resulting `.litematic` files, along with litemapy (a library which provides methods to read and modify `.litematic` files), to build the world map. 

This is how the entire map that the player navigates was created. A minecraft world was generated, the house was built in-game, the schematic boundary was defined in-game using the litematica mod, and the resulting `.litematic` file was processed into the `world_data.json` which is then imported by the `World` class.

Users can import their own litematic files into the world by running `python3 load_map.py schematic_file`. (Note that only a few minecraft blocks are actually mapped. The rest would be loaded as a default, white block).

### Renderer

Renderer uses instanced rendering where each block (so dirt, wood, leaf, etc) is rendered in separate batches in a single call.

Textures are loaded using a 16x16 texture atlas of the block faces. All renderable, textured blocks use this atlas, passing in different UVs.

### Player Movement

Player velocity is tracked. Rather than using input to directly translate the position of the player/camera, a `wishdir` is created from player input. Player velocity is then accelerated towards the `wishdir`. Friction acts upon the player velocity every frame. Player movement is heavily inspired by source and quake movement as I wanted movement to feel more gamey, so much of the movement code is directly derivative/inspired by quake movement code. 

Blocks are placed and removed by raycasting from the player’s eye position. Player collisions are determined by comparing an AABB (axis-aligned bounding box) to the player's surroundings.

___

## Citations

**Quake/Source Movement:**
[id-Software's Quake Movement Code](https://github.com/id-Software/Quake/blob/master/QW/client/pmove.c)
[Quake's Player Movement PDF](https://github.com/myria666/qMovementDoc/blob/main/Quake_s_Player_Movement.pdf)
[Quake 3 Movement reference in Unity](https://github.com/WiggleWizard/quake3-movement-unity3d)

[Instanced Drawing](https://webglfundamentals.org/webgl/lessons/webgl-instanced-drawing.html)
[Fog Rendering](https://webglfundamentals.org/webgl/lessons/webgl-fog.html)
[Texture Atlas Creation](https://imagemagick.org/#gsc.tab=0)

[AABB Concept](https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection)
[General Web Game Development](https://developer.mozilla.org/en-US/docs/Games)

[Litematica](https://modrinth.com/mod/litematica)
[Litemapy](https://github.com/SmylerMC/litemapy)

All block textures are from Minecraft, specifically the Programmer Art Vanilla Resource Pack made by Mojang

___

## Notes To Grader

If you missed the text that appears at the top of the screen, the goal is to make it to the house by following the path before it turns night.

Fog slowly turns to black over time to simulate day turning to night.

The house at the end of the path contains the blocky animal from the previous assignment.

Fog can be turned down to reveal the big cube skybox.

The original flattened-cube ground plane catches players who fall off the map.


