/**
 * Line-segment blockade with particles.
 */
export class Blockade {
    private static readonly blockerUnitName = "npc_dota_tutorial_blocker"
    private static readonly blockerModifierName = "modifier_blocker"
    private static readonly blockerSpacing = 128 // can use "dota_unit_show_collision_radius 1" in console to visualize this
    private static readonly blockerParticleName = "particles/tree_barrier.vpcf"

    private numBlockers: number

    private blockers: CDOTA_BaseNPC[] | undefined = undefined
    private particle: ParticleID | undefined = undefined

    /**
     * Creates a line-segment blockade.
     * @param startLocation Start location of the blockade.
     * @param endLocation End location of the blockade.
     * @returns Dummy-units contained in the blockade.
     */
    constructor(public readonly startLocation: Vector, public readonly endLocation: Vector) {
        // Spawn as many blockers as we need to cover the line-segment using the above spacing.
        const distance = this.endLocation.__sub(this.startLocation).Length2D()
        this.numBlockers = Math.ceil(distance / Blockade.blockerSpacing) ?? 1
    }

    /**
     * Linearly interpolates between start and end location.
     * @param alpha Linear interpolation factor.
     * @returns Linear interpolation between start and end using the given factor.
     */
    private getBlockerLocation(alpha: number) {
        return this.startLocation.__mul(alpha).__add(this.endLocation.__mul(1 - alpha))
    }

    /**
     * Spawns the blockade. Does nothing if already spawned.
     */
    spawn() {
        // Spawn blockers if not yet spawned
        if (this.blockers === undefined) {
            this.blockers = []
            for (let i = 0; i < this.numBlockers; i++) {
                const blocker = CreateUnitByName(Blockade.blockerUnitName, this.getBlockerLocation(i / (this.numBlockers - 1)), false, undefined, undefined, DotaTeam.NOTEAM)
                blocker.AddNewModifier(blocker, undefined, Blockade.blockerModifierName, {})
                this.blockers.push(blocker)
            }
        }

        // Spawn particle if not yet spawned
        if (!this.particle) {
            this.particle = ParticleManager.CreateParticle(Blockade.blockerParticleName, ParticleAttachment.CUSTOMORIGIN, undefined)
            ParticleManager.SetParticleControl(this.particle, 0, this.startLocation)
            ParticleManager.SetParticleControl(this.particle, 1, this.endLocation)
        }
    }

    /**
     * Destroys the blockade. Does nothing if not already spawned.
     */
    destroy() {
        // Remove blockers if any
        if (this.blockers) {
            for (const blocker of this.blockers) {
                if (blocker && IsValidEntity(blocker)) {
                    blocker.RemoveSelf()
                }
            }

            this.blockers = undefined
        }

        // Remove particle if any
        if (this.particle) {
            ParticleManager.DestroyParticle(this.particle, false)
            this.particle = undefined
        }
    }
}
