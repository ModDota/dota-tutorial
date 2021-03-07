import { getOrError } from "./util"

/**
 * Returns the duration of the given sound in seconds.
 * @param soundName Name of the sound.
 */
export function getSoundDuration(soundName: string) {
    // See if we already stored the duration of the sound.
    if (soundDurations[soundName]) {
        return soundDurations[soundName]
    }

    // This doesn't seem to always work, not sure why. Often returns 0.
    const anyEntity = getOrError(Entities.Next(undefined), "Could not find any entity")
    const duration = anyEntity.GetSoundDuration(soundName, "")

    // Cache the sound duration
    if (duration > 0) {
        soundDurations[soundName] = duration
    } else {
        Warning(`GetSoundDuration() returned 0 for sound ${soundName}. Returning default duration of 3 seconds.`)
        return 3
    }

    return duration
}

// GetSoundDuration returns 0 pretty often for some reason so we're storing the durations here.
export const soundDurations: Record<string, number> = {
    "Script_1_Opening_1": 3.317900,
    "Script_1_Opening_2": 8.772800,
    "Script_1_Opening_3": 1.699700,
    "Script_1_Opening_4": 2.273900,
    "Script_1_Opening_5": 5.353700,
    "Script_1_Opening_6": 3.344000,
    "Script_1_Opening_7": 5.171000,
    "Script_1_Opening_8": 9.738500,
    "Script_1_Opening_9": 6.267200,
    "Script_1_Opening_10": 6.267200,
    "Script_1_Opening_11": 2.639300,
    "Script_1_Movement_1": 10.182200,
    "Script_1_Movement_2": 2.300000,
    "Script_1_Movement_3": 4.753400,
    "Script_1_Movement_4": 4.753400,
    "Script_1_Movement_5": 5.458100,
    "Script_1_Movement_6": 4.727300,
    "Script_1_Movement_7": 2.665400,
    "Script_1_Movement_8": 7.833200,
    "Script_1_Movement_11": 13.288100,
    "Script_1_Camera_1": 5.901800,
    "Script_1_Camera_2": 13.731800,
    "Script_1_Camera_3": 2.143400,
    "Script_1_Camera_5": 8.590100,
    "Script_1_Camera_7": 6.136700,
    "Script_1_Camera_8": 3.631100,
    "Script_1_Camera_9": 4.388000,
    "Script_1_Camera_10": 2.352200,
    "Script_1_Leveling_1": 36.282200,
    "Script_1_Leveling_2": 14.514800,
    "Script_1_Leveling_3": 4.153100,
    "Script_1_Leveling_5": 7.989800,
    "Script_1_Leveling_6": 10.834700,
    "Script_1_Leveling_9": 8.772800,
    "Script_1_Leveling_10": 14.567000,
    "Script_1_BreatheFire_1": 2.534900,
    "Script_1_BreatheFire_2": 12.844400,
    "Script_1_BreatheFire_3": 1.490900,
    "Script_1_BreatheFire_4": 4.492400,
    "Script_1_BreatheFire_5": 13.079300,
    "Script_1_Shop_1": 3.761600,
    "Script_1_Shop_2": 12.035300,
    "Script_1_Shop_3": 17.464100,
    "Script_1_Shop_4": 12.244100,
    "Script_1_Shop_5": 4.857800,
    "Script_1_Shop_6": 4.179200,
    "Script_1_Shop_7": 17.855600,
    "Script_1_Closing_1": 11.957000,
    "Script_1_Closing_2": 1.360400,
    "Script_1_Closing_3": 10.234400,
    "Script_1_Closing_4": 5.223200,
    "Script_1_Closing_5": 6.293300,
    "Script_1_Closing_6": 24.798200,
}
