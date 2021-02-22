import { reloadable } from "./lib/tstl-utils";
import { findAllPlayers } from "./util";
import * as tut from "./Tutorial/Core"
import { section0 } from "./Sections/index"

declare global {
    interface CDOTAGamerules {
        Addon: GameMode;
    }
}

@reloadable
export class GameMode {
    public static Precache(this: void, context: CScriptPrecacheContext) {
        PrecacheResource("particle", "particles/units/heroes/hero_meepo/meepo_earthbind_projectile_fx.vpcf", context);
        PrecacheResource("soundfile", "soundevents/game_sounds_heroes/game_sounds_meepo.vsndevts", context);
    }

    public static Activate(this: void) {
        GameRules.Addon = new GameMode();
    }

    constructor() {
        this.configure();
        ListenToGameEvent("game_rules_state_change", () => this.OnStateChange(), undefined);
        ListenToGameEvent("npc_spawned", event => this.OnNpcSpawned(event), undefined);

        // TODO: Remove later, this is just an example
        CustomGameEventManager.RegisterListener("my_custom_event", (_, event) => {
            print(event.bar)
        })
    }

    private configure(): void {
        GameRules.SetCustomGameTeamMaxPlayers(DOTATeam_t.DOTA_TEAM_GOODGUYS, 3);
        GameRules.SetCustomGameTeamMaxPlayers(DOTATeam_t.DOTA_TEAM_BADGUYS, 3);

        GameRules.SetSameHeroSelectionEnabled(true);
        GameRules.SetShowcaseTime(0);
        GameRules.SetStrategyTime(0);
    }

    public OnStateChange(): void {
        const state = GameRules.State_Get();
        print(`OnStateChanged", ${state}`);

        if (state === DOTA_GameState.DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP) {

            for (const pID of findAllPlayers()) {
                print(`Assigning ${pID} to radiant`)
                PlayerResource.SetCustomTeamAssignment(pID, DOTATeam_t.DOTA_TEAM_GOODGUYS);
            }

            // Finish setup phase
            Timers.CreateTimer(0.2, () => GameRules.FinishCustomGameSetup());
        }

        if (state === DOTA_GameState.DOTA_GAMERULES_STATE_HERO_SELECTION) {
            Timers.CreateTimer(0.2, () => {

                const playersWithoutHero = findAllPlayers().filter(pID => !PlayerResource.HasSelectedHero(pID));
                for (const pID of playersWithoutHero) {
                    print(`Assigning ${pID} hero "npc_dota_hero_dragon_knight"`);
                    PlayerResource.GetPlayer(pID)!.SetSelectedHero("npc_dota_hero_dragon_knight");
                }
            })

        }

        // Start game once pregame hits
        if (state === DOTA_GameState.DOTA_GAMERULES_STATE_PRE_GAME) {
            Timers.CreateTimer(3, () => this.StartGame());
        }
    }

    private StartGame(): void {
        print("Game starting!");

        const tutorial = tut.createTutorial(section0)
        tut.start(tutorial)
        // To start from specific section by index: tut.start(tutorial, 5)
    }

    // Called on script_reload
    public Reload() {
        print("Script reloaded!");

        // Do some stuff here
    }

    private OnNpcSpawned(event: NpcSpawnedEvent) {

    }
}
