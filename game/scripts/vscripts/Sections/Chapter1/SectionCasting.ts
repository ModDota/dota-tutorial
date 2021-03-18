import * as tg from "../../TutorialGraph/index";
import * as tut from "../../Tutorial/Core";
import { freezePlayerHero, getOrError, getPathToHighlightAbility, getPlayerHero, highlightUiElement, removeHighlight, setUnitPacifist, unitIsValidAndAlive } from "../../util";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { slacksFountainLocation } from "./Shared";
import * as dg from "../../Dialog";

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

const abilNameBreatheFire = "dragon_knight_breathe_fire"
let listenerID: EventListenerID | undefined = undefined;
let currentDialogToken: number | undefined = undefined;
let eventTimer: string | undefined = undefined;

const start = (complete: () => void) => {
    print("Started section casting");

    const goalTracker = new GoalTracker();
    const goalKillSlacks = goalTracker.addBoolean(LocalizationKey.Goal_1_BreatheFire_1);
    const abilityBreatheFireHighlightPath = getPathToHighlightAbility(0);

    const hero = getOrError(getPlayerHero())

    graph = tg.withGoals(_ => goalTracker.getGoals(), tg.seq([
        tg.immediate(ctx => {
            freezePlayerHero(true);

            // Make Slacks attackable
            const slacks = getOrError(ctx[CustomNpcKeys.SlacksMudGolem] as CDOTA_BaseNPC | undefined);
            setUnitPacifist(slacks, false);
            slacks.SetTeam(DotaTeam.NEUTRALS);
            highlightUiElement(abilityBreatheFireHighlightPath)
        }),

        tg.audioDialog(LocalizationKey.Script_1_BreatheFire_1, LocalizationKey.Script_1_BreatheFire_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
        tg.audioDialog(LocalizationKey.Script_1_BreatheFire_2, LocalizationKey.Script_1_BreatheFire_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
        tg.immediate(_ => goalKillSlacks.start()),
        tg.audioDialog(LocalizationKey.Script_1_BreatheFire_3, LocalizationKey.Script_1_BreatheFire_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

        tg.immediate(_ => freezePlayerHero(false)),
        tg.immediate(ctx => listenerID = ListenToGameEvent("dota_player_used_ability", (event: DotaPlayerUsedAbilityEvent) => {
            if (event.abilityname === abilNameBreatheFire) {
                eventTimer = Timers.CreateTimer(2, () => {
                    if (unitIsValidAndAlive(ctx[CustomNpcKeys.SlacksMudGolem])) {
                        currentDialogToken = dg.playAudio(LocalizationKey.Script_1_BreatheFire_3_failed, LocalizationKey.Script_1_BreatheFire_3_failed, ctx[CustomNpcKeys.SlacksMudGolem], undefined, () => {
                            currentDialogToken = undefined
                            const ability = hero.FindAbilityByName(abilNameBreatheFire)
                            if (ability) {
                                ability.EndCooldown()
                            }
                        })
                    }
                })
            }
        }, undefined)),

        tg.completeOnCheck(ctx => !unitIsValidAndAlive(ctx[CustomNpcKeys.SlacksMudGolem]), 0.1),
        tg.immediate(() => {
            stopListeningToBreatheFireCasts()
        }),
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
    if (currentDialogToken !== undefined) {
        dg.stop(currentDialogToken)
        currentDialogToken = undefined
    }

    stopListeningToBreatheFireCasts()

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

function stopListeningToBreatheFireCasts() {
    if (listenerID) {
        StopListeningToGameEvent(listenerID)
        listenerID = undefined
    }

    if (eventTimer) {
        Timers.RemoveTimer(eventTimer)
        eventTimer = undefined
    }
}
