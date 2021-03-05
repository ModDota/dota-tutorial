import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { freezePlayerHero, getOrError, setUnitPacifist, unitIsValidAndAlive } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";

let graph: tg.TutorialStep | undefined = undefined;

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    slacksLocation: Vector(-6250, -6050, 256),
    heroLevel: 3,
    heroAbilityMinLevels: [1, 1, 1, 0],
};

const start = (complete: () => void) => {
    print("Started section casting");

    const goalTracker = new GoalTracker();
    const goalKillSlacks = goalTracker.addBoolean("Kill slacks using your Breathe Fire ability.");

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        tg.immediate(ctx => {
            freezePlayerHero(true);

            // Make Slacks attackable
            const slacks = getOrError(ctx[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC | undefined);
            setUnitPacifist(slacks, false);
            slacks.SetTeam(DotaTeam.NEUTRALS);
        }),

        tg.textDialog(LocalizationKey.Script_1_BreatheFire_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_BreatheFire_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 5),
        tg.immediate(_ => goalKillSlacks.start()),
        tg.textDialog(LocalizationKey.Script_1_BreatheFire_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),

        tg.immediate(_ => freezePlayerHero(false)),

        tg.completeOnCheck(ctx => !unitIsValidAndAlive(ctx[CustomNpcKeys.SlacksMudGolem]), 0.1),
        tg.immediate(_ => goalKillSlacks.complete()),

        tg.textDialog(LocalizationKey.Script_1_BreatheFire_4, ctx => ctx[CustomNpcKeys.SlacksMudGolem], 3),
        tg.textDialog(LocalizationKey.Script_1_BreatheFire_5, ctx => ctx[CustomNpcKeys.SunsFanMudGolem], 5),
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
