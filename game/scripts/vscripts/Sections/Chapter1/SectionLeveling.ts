import * as tg from "../../TutorialGraph/index"
import * as tut from "../../Tutorial/Core"
import { getPlayerHero } from "../../util"
import { RequiredState } from "../../Tutorial/RequiredState"

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    slacksLocation: Vector(-6250, -6050, 256),
}

const start = (complete: () => void) => {
    print("Started section leveling")
    // Assuming the player knows camera control.

    // Sequence:
    // 0. Remove all abilities
    // 1. Add the ability
    // 2. Make sure the hero has 1 skillpoint available
    // 3. Highlight the skillbutton

    const hero = getPlayerHero();
    if (!hero) error("Could not find the player's hero.");
    const abilityName = "dragon_knight_breathe_fire";

    for (let i = 0; i < DOTA_MAX_ABILITIES - 1; i++) {
        const a = hero.GetAbilityByIndex(i);
        if (a) {
            hero.RemoveAbilityByHandle(a);
        }
    }

    if (!hero.HasAbility(abilityName)) {
        hero.AddAbility(abilityName);
    }
    const ability = hero.FindAbilityByName(abilityName);
    if (!ability) error("Dragon Knight's Breath Fire ability was not found.");

    hero.SetAbilityPoints(1);
    ability.SetUpgradeRecommended(true);

    graph = tg.seq([
        tg.upgradeAbility(ability),
        tg.textDialog(LocalizationKey.Script_1_Leveling_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3) // TODO: This should be said by sunsfan's ghost
    ])

    graph.start(GameRules.Addon.context, () => {
        print("Section leveling was completed")
        complete()
    })
}

const stop = () => {
    if (graph) {
        graph.stop(GameRules.Addon.context)
        graph = undefined
    }
}

export const sectionLeveling = new tut.FunctionalSection(SectionName.Chapter1_Leveling, requiredState, start, stop)
