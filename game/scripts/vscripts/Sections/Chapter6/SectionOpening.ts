import * as tut from "../../Tutorial/Core";
import * as tg from "../../TutorialGraph/index";
import { RequiredState } from "../../Tutorial/RequiredState";
import { GoalTracker } from "../../Goals";
import { getOrError } from "../../util";

const sectionName: SectionName = SectionName.Chapter6_Opening;

let graph: tg.TutorialStep | undefined = undefined

const requiredState: RequiredState = {
    requireSlacksGolem: true,
    requireSunsfanGolem: true,
    heroLocation: Vector(-6200, -6300, 384),
    heroLevel: 6,
    heroAbilityMinLevels: [1, 1, 1, 1],
    heroItems: { "item_greater_crit": 1 },
};

const axeName = CustomNpcKeys.Axe;
const centaurName = CustomNpcKeys.Centaur;
const invokerName = CustomNpcKeys.Invoker;
const paName = CustomNpcKeys.PhantomAssassin;
const showcaseHeroLocation = Vector(-6700, -6300, 384);
const dummyLocation = Vector(-6200, -5800, 128);

function onStart(complete: () => void) {
    print("Starting", sectionName);

    const goalTracker = new GoalTracker();
    const goalWatchCW = goalTracker.addBoolean(LocalizationKey.Goal_6_Opening_1);
    const goalWatchPA = goalTracker.addBoolean(LocalizationKey.Goal_6_Opening_2);
    const goalWatchInvoker = goalTracker.addBoolean(LocalizationKey.Goal_6_Opening_3);

    graph = tg.withGoals(_ => goalTracker.getGoals(),
        tg.seq([
            tg.audioDialog(LocalizationKey.Script_6_Opening_1, LocalizationKey.Script_6_Opening_1, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_6_Opening_2, LocalizationKey.Script_6_Opening_2, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_6_Opening_3, LocalizationKey.Script_6_Opening_3, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Spawn Axe
            tg.spawnUnit(axeName, dummyLocation, DotaTeam.BADGUYS, axeName, true),
            tg.immediate(context => {
                const axe: CDOTA_BaseNPC_Hero = context[axeName];
                axe.AddExperience(30 - axe.GetLevel(), ModifyXpReason.UNSPECIFIED, false, false);
                axe.AddItemByName("item_heart");
                axe.SetAttackCapability(UnitAttackCapability.NO_ATTACK);
                axe.FaceTowards(showcaseHeroLocation);
            }),

            // CW part
            tg.immediate(_ => goalWatchCW.start()),
            tg.spawnUnit(centaurName, showcaseHeroLocation, DotaTeam.GOODGUYS, centaurName, true),
            tg.setCameraTarget(context => context[centaurName]),
            tg.immediate(context => {
                const centaur: CDOTA_BaseNPC_Hero = context[centaurName];
                centaur.AddItemByName("item_blink");
                centaur.AddExperience(30 - centaur.GetLevel(), ModifyXpReason.UNSPECIFIED, false, false);
                const basicAbilities = [0, 1, 2].map(abilityIndex => getOrError(centaur.GetAbilityByIndex(abilityIndex)));
                const ultAbility = getOrError(centaur.GetAbilityByIndex(5));
                basicAbilities.forEach(ab => ab.SetLevel(4));
                ultAbility.SetLevel(3);
            }),
            tg.wait(0.1),
            tg.seq([
                tg.wait(2),
                castNoTarget(centaurName, 5),
                tg.moveUnit(context => context[centaurName], showcaseHeroLocation.__add(Vector(200, 200)), true),
                tg.immediate(context => {
                    const centaur: CDOTA_BaseNPC_Hero = context[centaurName];
                    const blink = getOrError(centaur.GetItemInSlot(0) as CDOTABaseAbility | undefined);
                    centaur.CastAbilityOnPosition(dummyLocation, blink, 0);
                }),
                tg.wait(0.5),
                castNoTarget(centaurName, 0),
                tg.wait(2),
                castOnTarget(axeName, centaurName, 1),
                tg.wait(5),
                castOnTarget(axeName, centaurName, 1),
                tg.wait(3),
                tg.immediate(context => context[centaurName].RemoveSelf()),
            ]),

            tg.immediate(_ => goalWatchCW.complete()),
            tg.audioDialog(LocalizationKey.Script_6_Opening_4, LocalizationKey.Script_6_Opening_4, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),


            // PA part
            tg.immediate(_ => goalWatchPA.start()),
            tg.spawnUnit(paName, showcaseHeroLocation, DotaTeam.GOODGUYS, paName, true),
            tg.setCameraTarget(context => context[paName]),
            tg.immediate(context => {
                const pa: CDOTA_BaseNPC_Hero = context[paName];
                pa.AddItemByName("item_moon_shard");
                pa.AddExperience(30 - pa.GetLevel(), ModifyXpReason.UNSPECIFIED, false, false);
                const basicAbilities = [0, 1, 2].map(abilityIndex => getOrError(pa.GetAbilityByIndex(abilityIndex)));
                const ultAbility = getOrError(pa.GetAbilityByIndex(5));
                basicAbilities.forEach(ab => ab.SetLevel(4));
                ultAbility.SetLevel(3);
            }),
            tg.wait(2),
            tg.seq([
                castNoTarget(paName, 2),
                tg.wait(2),
                castOnTarget(axeName, paName, 0),
                tg.wait(0.5),
                castOnTarget(axeName, paName, 1),
                tg.wait(6),
                castOnTarget(axeName, paName, 0),
                tg.wait(0.5),
                castOnTarget(axeName, paName, 1),
                tg.wait(2),
                tg.immediate(context => context[paName].RemoveSelf()),
            ]),

            tg.immediate(_ => goalWatchPA.complete()),
            tg.audioDialog(LocalizationKey.Script_6_Opening_5, LocalizationKey.Script_6_Opening_5, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),

            // Invoker part
            tg.immediate(_ => goalWatchInvoker.start()),
            tg.spawnUnit(invokerName, showcaseHeroLocation, DotaTeam.GOODGUYS, invokerName, true),
            tg.setCameraTarget(context => context[invokerName]),
            tg.immediate(context => {
                const invoker: CDOTA_BaseNPC_Hero = context[invokerName];
                invoker.SetAttackCapability(UnitAttackCapability.NO_ATTACK);
                invoker.AddItemByName("item_bloodstone");
                invoker.AddItemByName("item_aghanims_shard");
                invoker.AddExperience(30 - invoker.GetLevel(), ModifyXpReason.UNSPECIFIED, false, false);
                const basicAbilities = [0, 1, 2].map(abilityIndex => getOrError(invoker.GetAbilityByIndex(abilityIndex)));
                const ultAbility = getOrError(invoker.GetAbilityByIndex(5));
                basicAbilities.forEach(ab => ab.SetLevel(7));
                ultAbility.SetLevel(1);
            }),
            tg.wait(0.1),
            tg.seq([
                // prepare ghost walk (0,0,1)
                castNoTarget(invokerName, 0),
                castNoTarget(invokerName, 0),
                castNoTarget(invokerName, 1),
                castNoTarget(invokerName, 5, 0.5),

                // prepare tornado (0,1,1)
                castNoTarget(invokerName, 1),
                tg.wait(0.1),
                castNoTarget(invokerName, 5, 0.5),

                // cast ghost walk
                castNoTarget(invokerName, 4, 1),

                // cast tornado
                castOnPosition(dummyLocation, invokerName, 3, 0.3),

                // prepare E.M.P (1,1,1)
                castNoTarget(invokerName, 1),
                castNoTarget(invokerName, 5, 0.5),

                // cast E.M.P
                castOnPosition(dummyLocation, invokerName, 3, 0.3),

                // prepare ss (2,2,2)
                castNoTarget(invokerName, 2),
                castNoTarget(invokerName, 2),
                castNoTarget(invokerName, 2),
                castNoTarget(invokerName, 5, 0.5),

                // cast ss
                castOnPosition(dummyLocation, invokerName, 3, 0.3),

                // prepare meatball (2,2,1)
                castNoTarget(invokerName, 1),
                castNoTarget(invokerName, 5, 0.5),

                // cast meatball
                castOnPosition(dummyLocation, invokerName, 3, 0.3),

                // prepare blast (2,1,0)
                castNoTarget(invokerName, 0),
                castNoTarget(invokerName, 5, 0.5),

                // cast blast
                castOnPosition(dummyLocation, invokerName, 3, 0.3),

                // prepare cold snap (0,0,0)
                castNoTarget(invokerName, 0),
                castNoTarget(invokerName, 0),
                castNoTarget(invokerName, 5, 0.5),

                // cast cold snap
                castOnTarget(axeName, invokerName, 3, 0.3),

                // prepare ice wall (0,0,2)
                castNoTarget(invokerName, 2),
                castNoTarget(invokerName, 5, 0.5),

                // cast ice wall
                castOnPosition(dummyLocation, invokerName, 3, 0.3),

                // prepare summons (0,2,2)
                castNoTarget(invokerName, 2),
                castNoTarget(invokerName, 5, 0.5),

                // cast summons
                castNoTarget(invokerName, 3, 0.3),

                // prepare alacrity (1,1,2)
                castNoTarget(invokerName, 1),
                castNoTarget(invokerName, 1),
                castNoTarget(invokerName, 5, 0.5),

                // cast alacrity
                tg.immediate(context => context[invokerName].SetAttackCapability(UnitAttackCapability.RANGED_ATTACK)),
                castOnTarget(invokerName, invokerName, 3, 0.3),

                tg.wait(3),
                tg.immediate(context => context[invokerName].RemoveSelf()),
            ]),
            tg.immediate(_ => goalWatchInvoker.complete()),

            tg.audioDialog(LocalizationKey.Script_6_Opening_6, LocalizationKey.Script_6_Opening_6, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_6_Opening_7, LocalizationKey.Script_6_Opening_7, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.audioDialog(LocalizationKey.Script_6_Opening_8, LocalizationKey.Script_6_Opening_8, ctx => ctx[CustomNpcKeys.SunsFanMudGolem]),
            tg.audioDialog(LocalizationKey.Script_6_Opening_9, LocalizationKey.Script_6_Opening_9, ctx => ctx[CustomNpcKeys.SlacksMudGolem]),
            tg.wait(3),
        ])
    )

    graph.start(GameRules.Addon.context, () => {
        print("Completed", sectionName);
        complete();
    });
}

function onStop() {
    print("Stopping", sectionName);

    if (graph) {
        graph.stop(GameRules.Addon.context);
        graph = undefined;
    }
}

function castNoTarget(casterName: string, index: number, wait = 0.1) {
    return tg.seq([
        tg.immediate(context => context[casterName].CastAbilityNoTarget(getOrError(context[casterName].GetAbilityByIndex(index)), 0)),
        tg.wait(wait),
    ])
}

function castOnTarget(targetName: string, casterName: string, index: number, wait = 0.1) {
    return tg.seq([
        tg.immediate(context => context[casterName].CastAbilityOnTarget(context[targetName], getOrError(context[casterName].GetAbilityByIndex(index)), 0)),
        tg.wait(wait),
    ])
}

function castOnPosition(position: Vector, casterName: string, index: number, wait = 0.1) {
    return tg.seq([
        tg.immediate(context => context[casterName].CastAbilityOnPosition(position, getOrError(context[casterName].GetAbilityByIndex(index)), 0)),
        tg.wait(wait),
    ])
}

export const sectionOpening = new tut.FunctionalSection(
    sectionName,
    requiredState,
    onStart,
    onStop
);
