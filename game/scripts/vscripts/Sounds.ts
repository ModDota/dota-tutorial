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
        Warning(`GetSoundDuration() returned 0 for sound ${soundName}.`)
    }

    return duration
}

// GetSoundDuration returns 0 pretty often for some reason so we're storing the durations here.
export const soundDurations: Record<string, number> = {
    "Script_1_Opening_1": 4.275200,
    "Script_1_Opening_2": 8.772800,
    "Script_1_Opening_3": 1.699700,
    "Script_1_Opening_4": 2.273900,
    "Script_1_Opening_5": 5.067200,
    "Script_1_Opening_6": 3.344000,
    "Script_1_Opening_7": 5.067200,
    "Script_1_Opening_8": 9.738500,
    "Script_1_Opening_9": 4.971200,
    "Script_1_Opening_10": 6.267200,
    "Script_1_Opening_11": 2.259200,
    "Script_1_Movement_1": 9.867200,
    "Script_1_Movement_2": 2.300000,
    "Script_1_Movement_3": 4.227200,
    "Script_1_Movement_4": 4.753400,
    "Script_1_Movement_5": 7.731200,
    "Script_1_Movement_6": 4.727300,
    "Script_1_Movement_7": 2.067200,
    "Script_1_Movement_8": 7.833200,
    "Script_1_Movement_9": 2.066937,
    "Script_1_Movement_9_1": 2.588188,
    "Script_1_Movement_10": 2.040875,
    "Script_1_Movement_10_1": 1.337187,
    "Script_1_Movement_10_2": 1.649938,
    "Script_1_Movement_11": 13.288100,
    "Script_1_Camera_1": 5.715200,
    "Script_1_Camera_2": 13.731800,
    "Script_1_Camera_3": 2.283200,
    "Script_1_Camera_5": 8.067200,
    "Script_1_Camera_7": 6.136700,
    "Script_1_Camera_8": 3.795200,
    "Script_1_Camera_9": 4.388000,
    "Script_1_Camera_10": 1.347200,
    "Script_1_Leveling_1": 27.651200,
    "Script_1_Leveling_2": 14.514800,
    "Script_1_Leveling_3": 4.153100,
    "Script_1_Leveling_4": 6.345500,
    "Script_1_Leveling_4_2": 185.443700,
    "Script_1_Leveling_5": 7.989800,
    "Script_1_Leveling_6": 10.851200,
    "Script_1_Leveling_7": 1.438700,
    "Script_1_Leveling_8": 1.125500,
    "Script_1_Leveling_9": 8.772800,
    "Script_1_Leveling_10": 14.567000,
    "Script_1_BreatheFire_1": 1.587200,
    "Script_1_BreatheFire_2": 12.844400,
    "Script_1_BreatheFire_3": 1.419200,
    "Script_1_BreatheFire_4": 4.035200,
    "Script_1_BreatheFire_5": 13.079300,
    "Script_1_Shop_1": 3.939200,
    "Script_1_Shop_2": 12.035300,
    "Script_1_Shop_3": 16.251200,
    "Script_1_Shop_4": 12.244100,
    "Script_1_Shop_5": 4.995200,
    "Script_1_Shop_6": 4.179200,
    "Script_1_Shop_7": 17.043200,
    "Script_1_Closing_1": 11.957000,
    "Script_1_Closing_2": 1.083200,
    "Script_1_Closing_3": 10.234400,
    "Script_1_Closing_4": 5.619200,
    "Script_1_Closing_5": 6.267200,
    "Script_1_Closing_6": 24.380600,
    "Script_2_Opening_1": 7.731200,
    "Script_2_Opening_2": 2.143400,
    "Script_2_Opening_3": 3.915200,
    "Script_2_Opening_4": 8.642300,
    "Script_2_Opening_5": 5.883200,
    "Script_2_Opening_6": 16.028600,
    "Script_2_Opening_7": 8.523200,
    "Script_2_Opening_8": 16.054700,
    "Script_2_Opening_9": 15.915200,
    "Script_2_Opening_10": 17.933900,
    "Script_2_Opening_11": 3.987200,
    "Script_2_Opening_12": 1.229900,
    "Script_2_Opening_13": 5.187200,
    "Script_2_Creeps_1": 11.307200,
    "Script_2_Creeps_2": 9.477500,
    "Script_2_Creeps_3": 9.771200,
    "Script_2_Creeps_11": 15.167300,
    "Script_2_Creeps_13": 3.579200,
    "Script_2_Creeps_14": 7.937600,
    "Script_2_Creeps_15": 11.667200,
    "Script_2_Creeps_19": 6.293300,
    "Script_2_Creeps_20": 15.099200,
    "Script_2_Creeps_21": 1.986800,
    "Script_2_Creeps_22": 7.203200,
    "Script_2_Creeps_23": 3.396200,
    "Script_2_Tower_1": 3.891200,
    "Script_2_Tower_2": 13.601300,
    "Script_2_Tower_3": 6.771200,
    "Script_2_Tower_4": 11.983100,
    "Script_2_Tower_5": 10.059200,
    "Script_2_Tower_6": 14.723600,
    "Script_2_Tower_7": 6.219200,
    "Script_2_Tower_8": 9.051200,
    "Script_2_Tower_9": 12.426800,
    "Script_2_Tower_10": 1.856300,
    "Script_2_Tower_11": 7.851200,
    "Script_2_Tower_12": 9.895100,
    "Script_2_Tower_13": 4.731200,
    "Script_2_Tower_14": 4.492400,
    "Script_2_Tower_15": 1.827200,
    "Script_2_Tower_16": 9.603200,
    "Script_2_Tower_17": 3.787700,
    "Script_2_Tower_18": 5.223200,
    "Script_2_Courier_1": 5.139200,
    "Script_2_Courier_2": 7.546100,
    "Script_2_Courier_3": 16.131200,
    "Script_2_Courier_4": 14.306000,
    "Script_2_Courier_5": 7.107200,
    "Script_2_Courier_6": 10.573700,
    "Script_2_Courier_7": 8.355200,
    "Script_2_Courier_8": 8.547200,
    "Script_2_Courier_9": 3.891200,
    "Script_2_Courier_10": 5.432000,
    "Script_2_Courier_11": 8.499200,
    "Script_2_Courier_12": 8.564000,
    "Script_2_Courier_13": 4.371200,
    "Script_3_Opening_1": 17.411900,
    "Script_3_Opening_2": 11.787200,
    "Script_3_Opening_3": 23.675900,
    "Script_3_Opening_4": 4.203200,
    "Script_3_Opening_5": 17.986100,
    "Script_3_Opening_6": 2.571200,
    "Script_3_Opening_7": 7.441700,
    "Script_3_Opening_8": 0.843200,
    "Script_3_Opening_9": 4.857800,
    "Script_3_Opening_10": 6.084500,
    "Script_3_Opening_11": 3.003200,
    "Script_3_Opening_12": 11.200100,
    "Script_3_Opening_13": 13.131200,
    "Script_3_Opening_14": 18.560300,
    "Script_3_Opening_15": 1.803200,
    "Script_3_Opening_16": 4.443200,
    "Script_3_Opening_17": 17.020400,
    "Script_3_Opening_18": 24.123200,
    "Script_3_Opening_19": 8.295875,
    "Script_3_Opening_20": 3.917375,
    "Script_3_Opening_20_1": 5.689625,
    "Script_3_Opening_21": 2.588188,
    "Script_3_Opening_22": 3.500375,
    "Script_3_Opening_23": 3.005187,
    "Script_3_Opening_24": 2.353625,
    "Script_3_Opening_25": 13.769000,
    "Script_3_Opening_25_1": 16.010375,
    "Script_3_Opening_26": 11.187200,
    "Script_3_Neutrals_1": 13.653500,
    "Script_3_Neutrals_2": 14.306000,
    "Script_3_Neutrals_3": 15.627200,
    "Script_3_Neutrals_4": 2.508800,
    "Script_3_Neutrals_5": 0.699200,
    "Script_3_Neutrals_6": 19.082300,
    "Script_3_Neutrals_7": 1.875200,
    "Script_3_Neutrals_8": 3.867200,
    "Script_3_Neutrals_9": 9.477500,
    "Script_3_Neutrals_10": 4.257500,
    "Script_3_Neutrals_11": 8.043200,
    "Script_3_Neutrals_12": 10.756400,
    "Script_3_Neutrals_13": 1.184000,
    "Script_3_Neutrals_14": 3.699200,
    "Script_4_Opening_1": 4.779500,
    "Script_4_Opening_2": 8.043200,
    "Script_4_Opening_3": 7.323200,
    "Script_4_Opening_4": 10.227200,
    "Script_4_Opening_5": 10.782500,
    "Script_4_Opening_6": 0.939200,
    "Script_4_Opening_7": 8.094200,
    "Script_4_Opening_8": 1.683200,
    "Script_4_Opening_9": 6.971900,
    "Script_4_Opening_10": 2.300000,
    "Script_4_Opening_11": 7.024100,
    "Script_4_Opening_12": 3.030800,
    "Script_4_Opening_13": 5.954000,
    "Script_4_Opening_14": 11.475200,
    "Script_4_Opening_15": 11.451200,
    "Script_4_Opening_16": 4.309700,
    "Script_4_Opening_17": 2.091200,
    "Script_4_Opening_18": 10.208300,
    "Script_4_Wards_1": 2.247800,
    "Script_4_Wards_2": 15.167300,
    "Script_4_Wards_3": 2.955200,
    "Script_4_Wards_4": 4.622900,
    "Script_4_Wards_5": 1.275200,
    "Script_4_Wards_6": 7.415600,
    "Script_4_Wards_7": 9.347000,
    "Script_4_Wards_8": 13.059200,
    "Script_4_Wards_9": 8.537900,
    "Script_4_Wards_10": 3.339200,
    "Script_4_Wards_11": 5.955200,
    "Script_4_Wards_12": 19.563200,
    "Script_4_Wards_14": 4.883900,
    "Script_4_Wards_15": 6.147200,
    "Script_4_Outpost_1": 4.649000,
    "Script_4_Outpost_2": 2.874200,
    "Script_4_Outpost_3": 2.595200,
    "Script_4_Outpost_4": 2.326100,
    "Script_4_Outpost_5": 7.563200,
    "Script_4_Outpost_6": 15.767600,
    "Script_4_Outpost_7": 2.931200,
    "Script_4_Outpost_8": 4.257500,
    "Script_4_Outpost_9": 2.163200,
    "Script_4_Outpost_10": 3.866000,
    "Script_4_Outpost_11": 14.499200,
    "Script_4_Communication_1": 5.246562,
    "Script_4_Communication_2": 6.371600,
    "Script_4_Communication_3": 7.107200,
    "Script_4_Communication_4": 5.019200,
    "Script_4_Communication_5": 8.851100,
    "Script_4_Communication_6": 2.787200,
    "Script_4_Communication_7": 2.744562,
    "Script_4_Communication_9": 3.605000,
    "Script_4_Communication_10": 14.043200,
    "Script_4_Communication_11": 17.464100,
    "Script_4_Communication_12": 9.242600,
    "Script_4_Communication_13": 8.355200,
    "Script_4_Communication_14": 2.039000,
    "Script_4_Communication_15": 0.507200,
    "Script_4_Communication_16": 7.076300,
    "Script_4_Communication_17": 6.771200,
    "Script_4_RTZ_getaway": 0.968000,
    "Script_4_RTZ_foundme": 1.064000,
    "Script_4_RTZ_cya": 1.304000,
    "Script_4_RTZ_death": 1.256000,
    "Script_4_RTZ_pain": 0.632000,
    "Script_5_Opening_1": 5.163200,
    "Script_5_Opening_2": 6.319400,
    "Script_5_Opening_3": 6.987200,
    "Script_5_Opening_4": 13.470800,
    "Script_5_Opening_5": 10.131200,
    "Script_5_Opening_6": 5.092700,
    "Script_5_Opening_7": 20.883200,
    "Script_5_Opening_9": 1.400000,
    "Script_5_Opening_16": 28.843700,
    "Script_5_Roshan_1": 7.659200,
    "Script_5_Roshan_2": 19.291100,
    "Script_5_Roshan_3": 5.451200,
    "Script_5_Roshan_4": 23.832500,
    "Script_5_Roshan_5": 5.955200,
    "Script_5_Roshan_6": 4.857800,
    "Script_5_Roshan_7": 12.771200,
    "Script_5_Roshan_8": 5.432000,
    "Script_5_5v5_1": 9.171200,
    "Script_5_5v5_2": 5.536400,
    "Script_5_5v5_3": 9.555200,
    "Script_5_5v5_4": 3.996500,
    "Script_5_5v5_5": 3.579200,
    "Script_5_5v5_6": 18.586400,
    "Script_5_5v5_7": 20.355200,
    "Script_5_5v5_8": 8.250800,
    "Script_5_5v5_9": 11.859200,
    "Script_5_5v5_10": 10.991300,
    "Script_5_5v5_11": 8.883200,
    "Script_5_5v5_12": 6.747200,
    "Script_5_5v5_13": 4.962200,
    "Script_6_Opening_1": 3.315200,
    "Script_6_Opening_2": 3.944300,
    "Script_6_Opening_3": 4.395200,
    "Script_6_Opening_4": 14.514800,
    "Script_6_Opening_5": 15.411200,
    "Script_6_Opening_6": 10.521500,
    "Script_6_Opening_7": 10.923200,
    "Script_6_Opening_8": 16.315700,
    "Script_6_Opening_9": 4.635200,
    "Script_6_Closing_1": 19.803200,
    "Script_6_Closing_2": 6.476000,
    "Script_6_Closing_3": 2.595200,
    "Script_6_Closing_4": 8.303000,
    "Script_6_anger": 29.648000,
    "Script_6_BSJ": 15.515187,
    "Script_6_Purge": 260.352750,
    "Script_6_Tsunami": 24.793437,
    "Script_6_DotaU": 23.698812,
}
