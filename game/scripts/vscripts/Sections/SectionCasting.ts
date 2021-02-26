import * as tg from "../TutorialGraph/index";
import * as tut from "../Tutorial/Core";
import { getPlayerHero } from "../util";

let graph: tg.TutorialStep | undefined = undefined;
let graphContext: tg.TutorialContext | undefined = undefined;

const start = (complete: () => void) => {
    print("Started section casting");
    // Assuming the player knows camera control.

    // Sequence:
    // 0. Remove all abilities
    // 1. Add the ability and level it.
    // 2. Make sure the hero has no skillpoint available
    // 3. Highlight the skillbutton
    // 4. Spawn a unit, make sure it's HP is low enough to kill it
    // 5. Ghostform it so the player is forced to kill it with a spell

    const hero = getPlayerHero();
    const abilityName = "dragon_knight_breathe_fire";

    if (!hero || hero.IsNull()) {
        error("No hero found");
    }

    for (let i = 0; i < DOTA_MAX_ABILITIES - 1; i++) {
        const a = hero.GetAbilityByIndex(i);
        if (a) {
            hero.RemoveAbility(a.GetAbilityName());
        }
    }

    if (!hero.HasAbility(abilityName)) {
        hero.AddAbility(abilityName);
    }
    const ability = hero.FindAbilityByName(abilityName)!;
    ability.UpgradeAbility(true);

    ability.SetUpgradeRecommended(false);
    ability.SetUpgradeRecommended(true);

    // TODO FIX location
    const heroLoc = <Vector>(hero.GetAbsOrigin() + RandomVector(500));
    const pugna = CreateUnitByName(
        "npc_dota_hero_pugna",
        heroLoc,
        true,
        undefined,
        undefined,
        DotaTeam.BADGUYS
    );
    pugna.SetHealth(1);
    pugna.AddNewModifier(
        undefined,
        undefined,
        "modifier_tutorial_disable_healing",
        {}
    );
    const disarmModifier = pugna.AddNewModifier(
        pugna,
        pugna.FindAbilityByName("modifier_pugna_decrepify"),
        "modifier_pugna_decrepify",
        {}
    );

    graph = tg.seq(
        tg.completeOnCheck(
            () => !ability.IsCooldownReady() && !pugna.IsAlive(),
            0.1
        )
    );

    graphContext = {};

    graph.start(graphContext, () => {
        print("Section casting was completed");
        complete();
    });
};

const resetState = () => {
    // TODO: Make sure DK exists at spawn and other stuff (yea stuff...)
};

const stop = () => {
    if (graph) {
        graph.stop(graphContext ?? {});
        graph = undefined;
        graphContext = undefined;
    }
};

export const sectionCasting = new tut.FunctionalSection(
    SectionName.Casting,
    start,
    resetState,
    stop
);
