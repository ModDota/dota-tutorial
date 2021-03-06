import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_blocker extends BaseModifier {
    IsHidden() { return true }
    IsDebuff() { return false }
    IsPurgable() { return false }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        return {
            [ModifierState.NO_TEAM_MOVE_TO]: true,
            [ModifierState.NO_TEAM_SELECT]: true,
            [ModifierState.COMMAND_RESTRICTED]: true,
            [ModifierState.ATTACK_IMMUNE]: true,
            [ModifierState.INVULNERABLE]: true,
            [ModifierState.NOT_ON_MINIMAP]: true,
            [ModifierState.UNSELECTABLE]: true,
            [ModifierState.OUT_OF_GAME]: true,
            [ModifierState.NO_HEALTH_BAR]: true,
        }
    }
}
