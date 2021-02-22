$.Msg("Hud panorama loaded");

GameEvents.SendCustomGameEventToServer<{}>("ui_loaded", {});
