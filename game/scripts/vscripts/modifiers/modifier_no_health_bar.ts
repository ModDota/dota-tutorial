import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter"

@registerModifier()
export class modifier_no_health_bar extends BaseModifier {

    IsHidden() { return true }
    IsDebuff() { return false }
    IsPurgable() { return false }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        return { [ModifierState.NO_HEALTH_BAR]: true }
    }
}
