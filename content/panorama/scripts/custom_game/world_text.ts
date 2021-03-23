type WorldText = {
    type: WorldTextType
    panel: LabelPanel
    location: { x: number, y: number, z: number }
    entity?: EntityIndex
}

(() => {
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

    const localizationCache = new Map<string, string | undefined>();

    function localizeIfExists(key: string, parent?: PanelBase | undefined): string | undefined {
        if (!parent && localizationCache.has(key)) {
            return localizationCache.get(key)
        }

        const localized = parent !== undefined ? $.Localize(key, parent) : $.Localize(key)
        const localizedOrUndefined = localized === key ? undefined : localized
        if (!parent) {
            localizationCache.set(key, localizedOrUndefined)
        }
        return localizedOrUndefined
    }

    /**
     * Gets a unique world text index for an entity
     */
    function getLocalWorldTextIndex(entityIndex: EntityIndex) {
        return entityIndex + 1000000
    }

    const titleNpcs = new Set<EntityIndex>();

    function hasTitle(entityIndex: EntityIndex) {
        // Check if unit has a name
        const unitName = Entities.GetUnitName(entityIndex)
        return localizeIfExists(`${unitName}_titles_name`) !== undefined
    }

    function updateNpcs() {
        // Find all current NPCs
        const currentNpcs = new Set<EntityIndex>(Entities.GetAllHeroEntities().concat(Entities.GetAllEntitiesByClassname("npc_dota_creature")));

        // Find added and removed npcs
        const addedNpcs = [...currentNpcs].filter(npc => !titleNpcs.has(npc) && hasTitle(npc))
        const removedNpcs = [...titleNpcs].filter(npc => !currentNpcs.has(npc))

        $.Msg("Added:", addedNpcs)
        $.Msg("Removed:", removedNpcs)

        for (const removedNpc of removedNpcs) {
            titleNpcs.delete(removedNpc)

            worldTexts.delete(getLocalWorldTextIndex(removedNpc))
        }

        for (const addedNpc of addedNpcs) {
            titleNpcs.add(addedNpc)

            const unitName = Entities.GetUnitName(addedNpc)

            // Check if unit has a name
            const name = localizeIfExists(`${unitName}_titles_name`)
            if (name) {
                // Add name floating text
                const index = getLocalWorldTextIndex(addedNpc)

                addWorldText({
                    type: "npc_title",
                    index: index,
                    location: { x: 0, y: 0, z: 300 },
                    text: name,
                    entity: addedNpc,
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

        $.Schedule(0.5, updateNpcs)
    }

    $.Schedule(0.5, updateNpcs)
    $.Schedule(0.1, update)
})()
