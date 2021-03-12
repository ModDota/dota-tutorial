let currentVideoPanel: Panel | undefined = undefined;

function OnPlayVideo(event: PlayVideoEvent) {
    if (currentVideoPanel) {
        $.Warning("Showing new video when old one while still active.");
        HideVideo();
    }

    switch (event.name) {
        case "guides":
            currentVideoPanel = $("#SelectGuidePanel");
            currentVideoPanel.SetHasClass("Visible", true);
            break;
        case "muting":
            currentVideoPanel = $("#MutePlayersPanel");
            currentVideoPanel.SetHasClass("Visible", true);
            break;
        default:
            $.Warning("Could not find video with name", event.name);
            break;
    }

    Game.EmitSound("ui_chat_slide_in");
}

function HideVideo() {
    if (currentVideoPanel) {
        currentVideoPanel.SetHasClass("Visible", false);
        currentVideoPanel = undefined;
        Game.EmitSound("ui_chat_slide_out");
    }
}

function OnVideoContinue() {
    HideVideo();
    GameEvents.SendCustomGameEventToServer("play_video_continue", {});
}

GameEvents.Subscribe("play_video", OnPlayVideo);
GameEvents.Subscribe("hide_video", HideVideo);
