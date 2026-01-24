## Assignment 1: Drawing Program - Ryan Abe

NOTE: Please make sure your computer/browser audio is on and give the website a few seconds to preload the sounds.

### Assignment Basics

Basic drawing functions are implemented based on assignment requirements.  ColoredPoints.html, in the src folder, is the main webpage which contains the application, as well as the drawings.

For the triangle drawings, I chose to create two. I drew Miku, inspired by the Hatsune Miku Top Treasure (see designs/miku_plushie.png for reference). I also drew a toy drum, which includes my initials on them. The drawing designs of both of these are included in the drawings folder of the assignment repository. 

### "Do Something Awesome": Music Box

For the "do something awesome" part, I decided to create an interactive music box. I composed a 64-beat original song that the user can "perform" note by note by clicking on the canvas.

I added a fourth class of drawable objects called the `Note`. When `Note` is selected and the user clicks on the canvas, a note is spawned and the song is advanced by one beat. Each click plays an audio slice from the song sequence.

When the Miku and Drum drawings are enabled (by pressing the `Miku` and `Drum` button), their corresponding instruments are also enabled.

The `Note` itself is a point that floats up slowly, oscilatting side to side. If the Miku and Drum drawings are enabled, a Miku and drum note are also spawned.

The audio slices for each instrument are located in the sounds directory. The full song is included in the sounds directory as well, titled `box_full.wav`.