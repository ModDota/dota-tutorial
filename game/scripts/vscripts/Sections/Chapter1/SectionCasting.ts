import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { freezePlayerHero, getOrError, getPathToHighlightAbility, highlightUiElement, removeHighlight, setUnitPacifist, unitIsValidAndAlive } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { slacksFountainLocation } from "./Shared";

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: slacksFountainLocation,
    heroLevel: 3,
    heroAbilityMinLevels: [1, 1, 1, 0],
    requireFountainTrees: true,
    lockCameraOnHero: true,
};

const start = (complete: () => void) => {
    print("Started section casting");

    const goalTracker = new GoalTracker();
    const goalKillSlacks = goalTracker.addBoolean(LocalizationKey.Goal_1_BreatheFire_1);
    const abilityBreatheFireHighlightPath = getPathToHighlightAbility(0);

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        tg.immediate(ctx => {
            // Have Slacks health bar turn red, but make him invulnerable for now
            const slacks = getOrError(ctx[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC | undefined);
            setUnitPacifist(slacks, true);
            slacks.SetTeam(DotaTeam.NEUTRALS);
            highlightUiElement(abilityBreatheFireHighlightPath)
        }),

        tg.audioDialog(LocalizationKey.Script_1_BreatheFire_1, LocalizationKey.Script_1_BreatheFire_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        
        // Fork use breathe fire dialogs
        tg.forkAny([
            tg.seq([
                tg.immediate(_ => goalKillSlacks.start()),
                tg.audioDialog(LocalizationKey.Script_1_BreatheFire_2, LocalizationKey.Script_1_BreatheFire_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
                tg.audioDialog(LocalizationKey.Script_1_BreatheFire_3, LocalizationKey.Script_1_BreatheFire_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
                tg.neverComplete()
            ]),
            tg.seq([
                tg.immediate(ctx => {
                    setUnitPacifist(ctx[CustomNpcKeys.SlacksMudGolem], false);
                }),
                tg.completeOnCheck(ctx => !unitIsValidAndAlive(ctx[CustomNpcKeys.SlacksMudGolem]), 0.1),
            ]),
        ]),
        tg.immediate(_ => goalKillSlacks.complete()),
        tg.immediate(() => removeHighlight(abilityBreatheFireHighlightPath)),

        tg.audioDialog(LocalizationKey.Script_1_BreatheFire_4, LocalizationKey.Script_1_BreatheFire_4, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_1_BreatheFire_5, LocalizationKey.Script_1_BreatheFire_5, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
    ]));

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
