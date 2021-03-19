let nextWorldTextIndex = 0;

/**
 * Adds a text floating in world space.
 * @param text Text to display.
 * @param location World-space location to display text at.
 * @returns Index that can be used with removeWorldText to remove the text again.
 */
export function addWorldText(text: string, location: Vector) {
    CustomGameEventManager.Send_ServerToAllClients("add_world_text", {
        index: nextWorldTextIndex,
        text,
        location: { x: location.x, y: location.y, z: location.z },
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
