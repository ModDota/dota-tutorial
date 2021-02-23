import * as tg from "../TutorialGraph/index"
import * as tut from "../Tutorial/Core"
import { getPlayerHero } from "../util"

let graph: tg.TutorialStep | undefined = undefined
let graphContext: tg.TutorialContext | undefined = undefined

const start = (complete: () => void) => {
    print("Started section levelling")
    // Assuming the player knows camera control.

    // Sequence:
    // 0. Remove all abilities
    // 1. Add the ability
    // 2. Make sure the hero has 1 skillpoint available
    // 3. Highlight the skillbutton

    const hero = getPlayerHero();
    if (!hero) error("Could not find the player's hero.");
    const abilityName = "dragon_knight_breathe_fire";

    for (let i = 0; i < DOTA_MAX_ABILITIES -1; i++) {
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

    graph = tg.seq(
        tg.upgradeAbility(ability)
    )

    graphContext = {}

    graph.start(graphContext, () => {
        print("Section levelling was completed")
        complete()
    })
}

const resetState = () => {
    // TODO: Make sure DK exists at spawn and other stuff (yea stuff...)
}

const stop = () => {
    if (graph) {
        graph.stop(graphContext ?? {})
        graph = undefined
        graphContext = undefined
    }
}

export const section_levelling = new tut.FunctionalSection("Section_Levelling", start, resetState, stop)
