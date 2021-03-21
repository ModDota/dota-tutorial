import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter"

@registerModifier()
export class modifier_closing_npc extends BaseModifier {
    IsHidden() { return true }
    IsDebuff() { return false }
    IsPurgable() { return false }

    CheckState(): Partial<Record<modifierstate, boolean>> {
        return {
            [modifierstate.MODIFIER_STATE_NO_HEALTH_BAR]: true,
        }
    }
}
