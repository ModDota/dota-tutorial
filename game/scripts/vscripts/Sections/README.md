# Sections
Sections are contained parts of the tutorial. They are composed of 3 functions
- `start`: Called when the section is supposed to start. Should contain most of the logic. Is passed a `complete` callback which should be called when the section is over.
- `stop`: Called when we want the section to stop. Can also be called if the section wasn't even started. Should clean up any resources created in `start` and stop any timers.
- `setupState`: Called before we go into this section if we didn't go into it the normal way (ie. when skipping to this section). Should set up anything needed for this section such as learning hero abilities.

Sections can either be created by extending the abstract `Section` class and implementing those three functions or by creating the functions separately and passing them to `FunctionalSection` in the constructor.

The tutorial graph system can be used to easily implement common behavior, especially async ones that require waiting (for a condition, for an amount of time, ...) between sequential steps. However it is not mandatory to
use it and it is possible to implement sections completely without it if desired.

# Clean Slate
All sections of the tutorials begin with a clear slate, meaning the game will always begin from the exact same state.

Each section of the tutorial has its Opening portion, which sets all parts needed for it to begin, assuming clean state, such as unit positions, unit levels, and everything's needed for the tutorial at this section.

When a section ends, it calls for the clean slate function (TODO: not yet defined) that sets the game at a clean slate state.

The clean slate state includes:
Hero:
* Hero is level 1.
* Hero is Dragon Knight.
* Hero is located at Vector (-6700, -6700, 384).
* Hero abilities are level 0.
* Hero has no ability points.
* Hero has no gold.
* Hero has no items, including teleport scrolls.

Units:
* All units are removed from the map, with the exclusion of jungle creeps and couriers.

Buildings:
* All buildings should be standing with full health and should be invulnerable. If a building was destroyed, recreate that building.
    * No need to verify backdoor protection, just plain invulnerability should work.
    * When a tutorial needs to allow player to hit a building, it should remove the invulnerability modifier (and, if relevant, backdoor protection as well).

Sounds:
* All currently ongoing sounds are stopped. (not necessarily related to the tutorial, e.g. from an item or an ability)

Particles:
* All currently ongoing particles are destroyed. (not necessarily related to the tutorial, e.g. from an item or an ability)

Tutorial Steps:
* Current step is stopped.
    * This includes removal of currently ongoing objectives, and any particles, sounds, and quest markers associated with them.
* Quest marker is re-initialized with no ongoing quests.
