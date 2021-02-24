import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_visible_through_fog extends BaseModifier {
    IsHidden() { return true }
    IsDebuff() { return false }
    IsPurgable() { return false }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.PROVIDES_FOW_POSITION]
    }

    GetModifierProvidesFOWVision(): 0 | 1 {
        return 1;
    }
}
