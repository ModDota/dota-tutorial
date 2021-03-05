import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { getPlayerHero } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    slacksLocation: Vector(-6250, -6050, 256),
    heroLevel: 3,
    heroAbilityMinLevels: [0, 1, 1, 0],
};

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

    const ability = hero.FindAbilityByName(abilityName)!;
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

    // TODO: Fix order of dialog and gameplay
    graph = tg.seq([
        tg.textDialog(LocalizationKey.Script_1_BreatheFire_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_BreatheFire_2, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3), // TODO: Should be said by sunsfan's ghost
        tg.textDialog(LocalizationKey.Script_1_BreatheFire_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.completeOnCheck(
            () => !ability.IsCooldownReady() && !pugna.IsAlive(),
            0.1
        ),
        tg.textDialog(LocalizationKey.Script_1_BreatheFire_4, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_BreatheFire_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
    ]);

    graph.start(GameRules.Addon.context, () => {
        print("Section casting was completed");
        complete();
    });
};

const stop = () => {
    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
};

export const sectionCasting = new tut.FunctionalSection(
    SectionName.Chapter1_Casting,
    requiredState,
    start,
    stop
);
