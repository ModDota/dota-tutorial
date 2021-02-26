import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_tutorial_pacifist extends BaseModifier {
    IsHidden() { return true }
    IsDebuff() { return false }
    IsPurgable() { return false }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        return {
            [ModifierState.DISARMED]: true,
            [ModifierState.INVULNERABLE]: true
        }
    }
}
