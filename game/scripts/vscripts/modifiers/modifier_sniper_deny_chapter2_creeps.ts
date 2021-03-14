import { BaseModifier, registerModifier } from "../lib/dota_ts_adapter";
import { DirectionToPosition, Distance2D, getPlayerHero, isCustomLaneCreepUnit } from "../util";

@registerModifier()
export class modifier_sniper_deny_chapter2_creeps extends BaseModifier {
    IsHidden() { return true }
    IsPurgable() { return false }
    IsDebuff() { return false }

    sniperDenyingOwnCreeps: boolean = true;
    isSniperActive = false
    anchorPoint = Vector(-5700, 5555, 128)

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

            const denyableCreeps = alliedCreeps.filter(creep => creep.GetHealthPercent() <= 50);

            if (denyableCreeps.length > 0) {
                const closestCreep = denyableCreeps[0];

                const distance = Distance2D(closestCreep.GetAbsOrigin(), this.GetParent().GetAbsOrigin())
                if (distance > this.GetParent().Script_GetAttackRange()) {
                    ExecuteOrderFromTable({
                        OrderType: UnitOrder.MOVE_TO_TARGET,
                        UnitIndex: this.GetParent().entindex(),
                        TargetIndex: closestCreep.entindex(),
                    })
                } else {
                    ExecuteOrderFromTable({
                        OrderType: UnitOrder.ATTACK_TARGET,
                        UnitIndex: this.GetParent().entindex(),
                        TargetIndex: closestCreep.entindex(),
                    })
                }
            }
            else {
                if (alliedCreeps.length > 0) {
                    const closestCreep = alliedCreeps[0]

                    // Calculate the position Sniper should move behind enemy lines
                    const direction = DirectionToPosition(closestCreep.GetAbsOrigin(), this.anchorPoint)
                    const position = (closestCreep.GetAbsOrigin() + direction * 300) as Vector

                    if (Distance2D(this.GetParent().GetAbsOrigin(), position) > 100) {
                        ExecuteOrderFromTable({
                            OrderType: UnitOrder.MOVE_TO_POSITION,
                            UnitIndex: this.GetParent().entindex(),
                            Position: position
                        })
                    }
                } else {

                    if (Distance2D(this.GetParent().GetAbsOrigin(), this.anchorPoint) > 100) {
                        ExecuteOrderFromTable({
                            OrderType: UnitOrder.MOVE_TO_POSITION,
                            UnitIndex: this.GetParent().entindex(),
                            Position: this.anchorPoint
                        })
                    } else {
                        const playerHero = getPlayerHero()
                        if (playerHero) {
                            this.GetParent().FaceTowards(playerHero.GetAbsOrigin())
                        }
                    }
                }
            }
        } else {
            const attackTarget = this.GetParent().GetAttackTarget()
            const playerHero = getPlayerHero();
            if (playerHero && attackTarget != playerHero) {
                ExecuteOrderFromTable({
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
            [ModifierState.DISARMED]: !this.isSniperActive
        }
    }

    DeclareFunctions(): ModifierFunction[] {
        return [ModifierFunction.PREATTACK_BONUS_DAMAGE,
        ModifierFunction.ATTACKSPEED_BONUS_CONSTANT,
        ModifierFunction.ON_DEATH]
    }

    OnDeath(event: ModifierAttackEvent) {
        if (!IsServer()) return;

        if (event.attacker != this.GetParent()) return;

        if (event.unit) {
            if (!isCustomLaneCreepUnit(event.unit)) return;
            if (event.unit.GetTeamNumber() != this.GetParent().GetTeamNumber()) return;

            SendOverheadEventMessage(undefined, OverheadAlert.DENY, event.unit, 0, undefined)
        }
    }

    GetModifierPreAttack_BonusDamage(): number {
        if (!IsServer()) return 0

        if (this.sniperDenyingOwnCreeps) return 100
        else return -600;
    }

    GetModifierAttackSpeedBonus_Constant(): number {
        if (this.sniperDenyingOwnCreeps) return 50;
        return 0;
    }
}
