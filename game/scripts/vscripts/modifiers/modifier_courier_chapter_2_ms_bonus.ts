import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";

@registerModifier()
export class modifier_courier_chapter_2_ms_bonus extends BaseModifier {
    IsHidden() { return true }
    IsDebuff() { return false }
    IsPurgable() { return false }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.MOVESPEED_BONUS_CONSTANT,
        ModifierFunction.IGNORE_MOVESPEED_LIMIT]
    }

    GetModifierMoveSpeedBonus_Constant(): number {
        return 400;
    }

    GetModifierIgnoreMovespeedLimit(): 0 | 1 {
        return 1
    }
}
