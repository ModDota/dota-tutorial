import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { getPlayerHero, isCustomLaneCreepUnit } from "../util";

@registerModifier()
export class modifier_sniper_deny_chapter2_creeps extends BaseModifier {
    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }

    sniperDenyingOwnCreeps: boolean = false;
    isSniperActive = false

    OnCreated() {
        if (!IsServer()) return;
        this.SetStackCount(0);
        this.StartIntervalThink(0.5)
        this.GetParent().SetIdleAcquire(false);
    }

    OnIntervalThink() {
        if (!this.isSniperActive) return;

        if (this.sniperDenyingOwnCreeps) {
            let alliedCreeps = FindUnitsInRadius(this.GetParent().GetTeamNumber(),
                this.GetParent().GetAbsOrigin(),
                undefined,
                1800,
                UnitTargetTeam.FRIENDLY,
                UnitTargetType.BASIC,
                UnitTargetFlags.NONE,
                FindOrder.CLOSEST,
                false)

            alliedCreeps = alliedCreeps.filter(creep => creep.GetHealthPercent() <= 50);

            if (alliedCreeps.length <= 0) {
                this.GetParent().SetForceAttackTarget(undefined);
            }
            else {
                const closestCreep = alliedCreeps[0];
                ExecuteOrderFromTable(
                    {
                        OrderType: UnitOrder.ATTACK_TARGET,
                        UnitIndex: this.GetParent().entindex(),
                        TargetIndex: closestCreep.entindex(),
                    })
            }
        }
        else {
            const attackTarget = this.GetParent().GetAttackTarget()
            const playerHero = getPlayerHero();
            if (playerHero && attackTarget != playerHero) {
                ExecuteOrderFromTable(
                    {
                        OrderType: UnitOrder.ATTACK_TARGET,
                        UnitIndex: this.GetParent().entindex(),
                        TargetIndex: playerHero.entindex()
                    })
            }
        }
    }

    CheckState(): Partial<Record<ModifierState, boolean>> {
        return {
            [ModifierState.INVULNERABLE]: this.sniperDenyingOwnCreeps,
            [ModifierState.PROVIDES_VISION]: true,
            [ModifierState.ROOTED]: true,
            [ModifierState.DISARMED]: !this.isSniperActive
        }
    }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.PREATTACK_BONUS_DAMAGE,
        ModifierFunction.ON_DEATH]
    }

    OnDeath(event: ModifierAttackEvent) {
        if (!IsServer()) return;
        if (this.GetStackCount() == 1) return;

        if (event.attacker != this.GetParent()) return;

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() != this.GetParent().GetTeamNumber()) return;
        }

        this.SetStackCount(1);
    }

    GetModifierPreAttack_BonusDamage(): number {
        if (!IsServer()) return 0

        if (this.sniperDenyingOwnCreeps) return 600
        else return -600;
    }
}
