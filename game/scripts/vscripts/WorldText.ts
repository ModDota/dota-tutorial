let nextWorldTextIndex = 0;

/**
 * Adds a text floating in world space.
 * @param text Text to display.
 * @param location World-space location to display text at.
 * @returns Index that can be used with removeWorldText to remove the text again.
 */
export function addWorldTextAtLocation(text: string, location: Vector, type: WorldTextType) {
    CustomGameEventManager.Send_ServerToAllClients("add_world_text", {
        type,
        index: nextWorldTextIndex,
        text,
        location: { x: location.x, y: location.y, z: location.z },
    })

    return nextWorldTextIndex++
}

/**
 * Adds a text floating in world space attached to an entity.
 * @param text Text to display.
 * @param entity Entity to display text at.
 * @returns Index that can be used with removeWorldText to remove the text again.
 */
export function addWorldTextAttached(text: string, entity: CBaseEntity, type: WorldTextType) {
    CustomGameEventManager.Send_ServerToAllClients("add_world_text", {
        type,
        index: nextWorldTextIndex,
        text,
        location: { x: 0, y: 0, z: 200 },
        entity: entity.entindex(),
    })

    return nextWorldTextIndex++
}

/**
 * Removes a world text.
 * @param index Index obtained from addWorldText for the text to remove.
 */
export function removeWorldText(index: number) {
    CustomGameEventManager.Send_ServerToAllClients("remove_world_text", {
        index: index,
    })
}
