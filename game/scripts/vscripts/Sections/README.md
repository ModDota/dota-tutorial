# Sections
Sections are contained parts of the tutorial. They are composed of 2 functions and a required state.
- `start`: Called when the section is supposed to start. Should contain most of the logic. Is passed a `complete` callback which should be called when the section is over.
- `stop`: Called when we want the section to stop. Can also be called if the section wasn't even started. Should clean up any resources created in `start` and stop any timers.
- `requiredState`: Descriptor the state we need the game to be in before the section is started. If the game is not in this state the game will try to make it so before starting.

Sections can either be created by extending the abstract `Section` class and implementing those three functions or by creating the functions separately and passing them to `FunctionalSection` in the constructor.

The `SectionTemplate.ts` file can be used as a starting point for an empty section.

The tutorial graph system can be used to easily implement common behavior, especially async ones that require waiting (for a condition, for an amount of time, ...) between sequential steps. However it is not mandatory to
use it and it is possible to implement sections completely without it if desired.

# Chapter
Sections are organized into chapters. Players can only skip between Chapters and not individual sections.

# Required State
The `requiredState` field of a section describes in what state the game should be in before starting. If the game is not in this state the `setupState()` function will try to make it so before the section was started.
If new requirements need to be added they can be added to the `RequiredState` type and the `setupState()` function needs to be modified to incorporate the functionality for it.

Example: there is a requirement for the hero location. If the hero already exists, `setupState()` checks whether the current location of the hero is too far away from the required hero location and if so teleport the hero there. If the hero does not exist
the `setupState()` function will also spawn it first.

If fields on the requirement are not set a default value for them will be assumed as specified by `defaultRequiredState`. Clean slate below describes these default (although it is currently outdated).

# Clean Slate (outdated / not entirely accurate anymore)
A clean slate is a state where the game is set to be exactly as it was before any tutorial sequences have been initiated. Any changes that occurred while in a tutorial are reset.

Each Chapter of the tutorial has its Opening Section, which sets all parts needed for it to begin assuming clean state, such as unit positions, unit levels, and everything that's needed for the tutorial at this section.

When a Chapter ends naturally due to natural progression, clean slate **is not called**.

When a section is skipped to the game calls `onStop()` on the previously running section which should put the game into a clean slate. The section that is skipped to will then receive a call to `onSkipTo()` where it can assume a clean slate is present and put the game into the state it needs.

The clean slate state includes:
Hero:
* Hero is level 1.
* Hero is Dragon Knight.
* Hero is located at Vector (-6700, -6700, 384).
* Hero abilities are level 0.
* Hero has no ability points.
* Hero has no gold.
* Hero has no items, including teleport scrolls.
* Hero has no modifiers (e.g. Pacifist).

Utility:
* All utility functions use their default values, if any (when changed via setX).

Units:
* All units are removed from the map, with the exclusion of jungle creeps and couriers.

Buildings:
* All buildings should be standing with full health and should be invulnerable. If a building was destroyed, recreate that building.
    * No need to verify backdoor protection, just plain invulnerability should work.
    * When a tutorial needs to allow player to hit a building, it should remove the invulnerability modifier (and, if relevant, backdoor protection as well).
* Buildings have no custom modifiers (e.g. Pacifist).

Sounds:
* All currently ongoing sounds are stopped. (not necessarily related to the tutorial, e.g. from an item or an ability)

Particles:
* All currently ongoing particles are destroyed. (not necessarily related to the tutorial, e.g. from an item or an ability)

Tutorial:
* Current step is stopped.
    * This includes removal of currently ongoing objectives, and any particles, sounds, and quest markers associated with them.
* Quest marker is re-initialized with no ongoing quests.
* Tutorial context is reset.
