type WorldText = {
    type: WorldTextType
    panel: LabelPanel
    location: { x: number, y: number, z: number }
    entity?: EntityIndex
}

(() => {
    const root = $.GetContextPanel();
    const worldTexts = new Map<number, WorldText>()

    function addWorldText(event: NetworkedData<AddWorldTextEvent>) {
        const panel = $.CreatePanel("Label", root, "")
        panel.text = event.text;
        panel.AddClass(event.type === "credit_section" ? "WorldText" : "WorldTextNpc")

        worldTexts.set(event.index, {
            panel,
            entity: event.entity,
            location: event.location,
            type: event.type,
        })
    }

    function removeWorldText(index: number) {
        const worldText = worldTexts.get(index)
        if (worldText) {
            worldTexts.delete(index)
            worldText.panel.DeleteAsync(0);
        } else {
            $.Warning("Tried to delete non-existent world text with index", index)
        }
    }

    function update() {
        const ratio = 1080 / Game.GetScreenHeight();

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
                panel.style.x = `${Math.round(screenLocation[0] * ratio)}px`
                panel.style.y = `${Math.round(screenLocation[1] * ratio)}px`
                panel.visible = true
            } else {
                panel.visible = false
            }
        }

        $.Schedule(0.01, update);
    }

    GameEvents.Subscribe("add_world_text", event => addWorldText(event))
    GameEvents.Subscribe("remove_world_text", event => removeWorldText(event.index))

    $.Schedule(0.01, update);
})();
