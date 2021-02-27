import { AbilityLocalization, LocalizationData, ModifierLocalization, StandardLocalization } from "~generator/localizationInterfaces";
import { Language } from "../languages";

export function GenerateLocalizationData(): LocalizationData
{
    // This section can be safely ignored, as it is only logic.
    //#region Localization logic
    // Arrays
    const Abilities: Array<AbilityLocalization> = new Array<AbilityLocalization>();
    const Modifiers: Array<ModifierLocalization> = new Array<ModifierLocalization>();
    const StandardTooltips: Array<StandardLocalization> = new Array<StandardLocalization>();

    // Create object of arrays
    const localization_info: LocalizationData =
    {
        AbilityArray: Abilities,
        ModifierArray: Modifiers,
        StandardArray: StandardTooltips,
    };
    //#endregion

    // Enter localization data below!
    StandardTooltips.push({
        classname: "npc_mud_golem_sunsfan",
        name: "Sunsfan"
    });

    StandardTooltips.push({
        classname: "npc_mud_golem_slacks",
        name: "Slacks"
    });

    StandardTooltips.push({
        classname: "npc_dota_tutorial_radiant_melee_creep",
        name: "Radiant Melee Creep"
    });

    StandardTooltips.push({
        classname: "npc_dota_tutorial_radiant_ranged_creep",
        name: "Radiant Ranged Creep"
    });

    StandardTooltips.push({
        classname: "npc_dota_tutorial_dire_melee_creep",
        name: "Dire Melee Creep"
    });

    StandardTooltips.push({
        classname: "npc_dota_tutorial_dire_ranged_creep",
        name: "Dire Ranged Creep"
    });


    // Return data to compiler
    return localization_info;
}
