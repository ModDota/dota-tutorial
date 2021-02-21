import { reloadable } from "./lib/tstl-utils";

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
    }

    private configure(): void {
        GameRules.SetCustomGameTeamMaxPlayers(DOTATeam_t.DOTA_TEAM_GOODGUYS, 3);
        GameRules.SetCustomGameTeamMaxPlayers(DOTATeam_t.DOTA_TEAM_BADGUYS, 3);

        GameRules.SetShowcaseTime(0);
        GameRules.SetStrategyTime(0);
    }

    public OnStateChange(): void {
        const state = GameRules.State_Get();

        if (state == DOTA_GameState.DOTA_GAMERULES_STATE_CUSTOM_GAME_SETUP) {
            Timers.CreateTimer(0.2, () => GameRules.FinishCustomGameSetup());
        }

        print(`OnStateChanged", ${state}`);
        if (state == DOTA_GameState.DOTA_GAMERULES_STATE_HERO_SELECTION) {
            Timers.CreateTimer(0.2, () => {
                print("Hero Selection timer fired");
                for (const pID of $range(0, DOTALimits_t.DOTA_MAX_PLAYERS)) {
                    if (PlayerResource.IsValidPlayerID(pID) && !PlayerResource.HasSelectedHero(pID)) {
                        PlayerResource.GetPlayer(pID)?.SetSelectedHero("npc_dota_hero_dragon_knight")
                        print(`Assigned ${pID} to "npc_dota_hero_dragon_knight"`);
                    }
                }
            })

        }

        // Start game once pregame hits
        if (state == DOTA_GameState.DOTA_GAMERULES_STATE_PRE_GAME) {
            Timers.CreateTimer(0.2, () => this.StartGame());
        }
    }

    private StartGame(): void {
        print("Game starting!");

        // Do some stuff here
    }

    // Called on script_reload
    public Reload() {
        print("Script reloaded!");

        // Do some stuff here
    }

    private OnNpcSpawned(event: NpcSpawnedEvent) {

    }
}
