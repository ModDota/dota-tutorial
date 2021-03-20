type WorldText = {
    type: WorldTextType
    panel: LabelPanel
    location: { x: number, y: number, z: number }
    entity?: EntityIndex
}

(() => {
    let nextLocalWorldTextIndex = 100000000
    function getLocalWorldTextIndex() {
        return nextLocalWorldTextIndex++
    }

    const localWorldTexts = new Set<number>()
    const root = $.GetContextPanel()
    const worldTexts = new Map<number, WorldText>()

    function addWorldText(event: NetworkedData<AddWorldTextEvent>) {
        const panel = $.CreatePanel("Label", root, "")
        panel.text = event.text
        panel.AddClass(event.type === "credit_section" ? "WorldText" : "WorldTextNpc")

        const worldText = {
            panel,
            entity: event.entity,
            location: event.location,
            type: event.type,
        }

        worldTexts.set(event.index, worldText)
    }

    function removeWorldText(index: number) {
        const worldText = worldTexts.get(index)
        if (worldText) {
            worldTexts.delete(index)
            worldText.panel.DeleteAsync(0)
        } else {
            $.Warning("Tried to delete non-existent world text with index", index)
        }
    }

    function update() {
        const ratio = 1080 / Game.GetScreenHeight()

        // Check if local world texts are still valid. Hide them on invis.
        for (const worldTextIndex of localWorldTexts) {
            const worldText = worldTexts.get(worldTextIndex)
            if (worldText) {
                if (worldText.entity) {
                    if (!Entities.IsValidEntity(worldText.entity) || !Entities.IsAlive(worldText.entity)) {
                        worldTexts.delete(worldTextIndex)
                        localWorldTexts.delete(worldTextIndex)
                        worldText.panel.DeleteAsync(0)
                    } else {
                        worldText.panel.visible = !Entities.IsInvisible(worldText.entity)
                    }
                } else {
                    worldTexts.delete(worldTextIndex)
                    localWorldTexts.delete(worldTextIndex)
                    worldText.panel.DeleteAsync(0)
                }
            } else {
                localWorldTexts.delete(worldTextIndex)
            }
        }

        for (const worldText of worldTexts.values()) {
            const panel = worldText.panel

            const screenLocation = [-1, -1]
            const worldLocation = worldText.location
            if (worldText.entity !== undefined) {
                if (Entities.IsValidEntity(worldText.entity)) {
                    const loc = Entities.GetAbsOrigin(worldText.entity)
                    screenLocation[0] = Game.WorldToScreenX(worldLocation.x + loc[0], worldLocation.y + loc[1], worldLocation.z + loc[2])
                    screenLocation[1] = Game.WorldToScreenY(worldLocation.x + loc[0], worldLocation.y + loc[1], worldLocation.z + loc[2])
                } else {
                    screenLocation[0] = -1
                    screenLocation[1] = -1
                }
            } else {
                screenLocation[0] = Game.WorldToScreenX(worldLocation.x, worldLocation.y, worldLocation.z)
                screenLocation[1] = Game.WorldToScreenY(worldLocation.x, worldLocation.y, worldLocation.z)
            }

            if (screenLocation[0] !== -1 && screenLocation[1] !== -1) {
                panel.style.x = `${Math.round(screenLocation[0] * ratio - panel.actuallayoutwidth * 0.5)}px`
                panel.style.y = `${Math.round(screenLocation[1] * ratio)}px`
                panel.visible = true
            } else {
                panel.visible = false
            }
        }

        $.Schedule(0.01, update)
    }

    GameEvents.Subscribe("add_world_text", event => addWorldText(event))
    GameEvents.Subscribe("remove_world_text", event => removeWorldText(event.index))

    // Add names / titles

    function localizeIfExists(key: string, parent?: PanelBase | undefined): string | undefined {
        const localized = parent !== undefined ? $.Localize(key, parent) : $.Localize(key)
        return localized === key ? undefined : localized
    }

    function onNpcSpawned(event: NpcSpawnedEvent) {
        const unitName = Entities.GetUnitName(event.entindex)

        // Check if unit has a name
        const name = localizeIfExists(`${unitName}_titles_name`)
        if (name) {
            // Add name floating text
            const index = getLocalWorldTextIndex()

            localWorldTexts.add(index)
            addWorldText({
                type: "npc_title",
                index: index,
                location: { x: 0, y: 0, z: 300 },
                text: name,
                entity: event.entindex,
            })
            const worldText = worldTexts.get(index)

            // Add title if exists
            if (worldText) {
                const titleCount = localizeIfExists(`${unitName}_titles_num`)

                if (titleCount && parseInt(titleCount) > 0) {
                    const chosenTitleIndex = Math.floor(Math.random() * 100000000) % parseInt(titleCount)
                    worldText.panel.SetDialogVariable("name", name)
                    const chosenTitle = localizeIfExists(`${unitName}_titles_${chosenTitleIndex}`, worldText.panel)
                    if (chosenTitle) {
                        worldText.panel.text = chosenTitle
                    }
                }
            } else {
                $.Warning("Could not find world text that was created locally for titles")
            }
        }
    }

    GameEvents.Subscribe("npc_spawned", onNpcSpawned)

    // Add all existing npcs
    for (const entity of Entities.GetAllEntities()) {
        onNpcSpawned({ entindex: entity })
    }

    $.Schedule(0.1, update)
})()
