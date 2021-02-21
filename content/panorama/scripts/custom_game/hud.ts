$.Msg("Hud panorama loaded");

// TODO: Remove later, this is just an example
GameEvents.Subscribe("my_custom_event", event => {
    $.Msg("Received custom event", event.foo, event.bar);
});

GameEvents.SendCustomGameEventToServer<{}>("ui_loaded", {});
