# Sections
Sections are contained parts of the tutorial. They are composed of 3 functions
- `start`: Called when the section is supposed to start. Should contain most of the logic. Is passed a `complete` callback which should be called when the section is over.
- `stop`: Called when we want the section to stop. Can also be called if the section wasn't even started. Should clean up any resources created in `start` and stop any timers.
- `setupState`: Called before we go into this section if we didn't go into it the normal way (ie. when skipping to this section). Should set up anything needed for this section such as learning hero abilities.

Sections can either be created by extending the abstract `Section` class and implementing those three functions or by creating the functions separately and passing them to `FunctionalSection` in the constructor.

The tutorial graph system can be used to easily implement common behavior, especially async ones that require waiting (for a condition, for an amount of time, ...) between sequential steps. However it is not mandatory to
use it and it is possible to implement sections completely without it if desired.
